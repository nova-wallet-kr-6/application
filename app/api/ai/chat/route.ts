import { NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { parseIntent, type ParsedIntent } from "@/lib/intentParser";
import { isAddress as viemIsAddress } from "viem";
import guardianService from "@/lib/services/guardian.service";
import slippageService from "@/lib/services/slippage.service";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    throw new Error("GEMINI_API_KEY belum diset di environment variables");
}

const genAI = new GoogleGenerativeAI(apiKey);

// Function untuk check balance
async function checkBalance(address: string, chainId: number) {
    try {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/wallet/balance`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ address, chainId }),
            },
        );

        if (!response.ok) {
            throw new Error("Gagal mengambil saldo");
        }

        return await response.json();
    } catch (error) {
        console.error("[checkBalance] error", error);
        throw error;
    }
}

type ChatRequestBody = {
    messages: Array<{
        role: "user" | "assistant";
        content: string;
    }>;
    walletContext?: {
        address: string;
        chainId: number;
        balance?: string; // Balance dari UI (WalletContext)
        isConnected: boolean;
    };
};

const SYSTEM_PROMPT = `Kamu adalah Nova AI, asisten crypto wallet yang ramah dan membantu. Kamu berbicara dalam Bahasa Indonesia yang natural dan mudah dipahami.

Tugas kamu:
1. Bantu user cek saldo wallet mereka dengan memanggil function checkBalance ketika user bertanya tentang saldo
2. Jelaskan informasi crypto dengan bahasa sederhana
3. Validasi transaksi sebelum execute (jangan pernah execute tanpa konfirmasi user)
4. PENTING: Ketika user ingin transfer, kamu bisa mengumpulkan informasi secara bertahap (multi-turn conversation). Jika user memberikan informasi secara bertahap (misalnya: jumlah di message pertama, alamat di message kedua), kamu harus mengingat informasi dari conversation sebelumnya dan mengumpulkannya sampai lengkap sebelum meminta konfirmasi.
5. KONSULTASI SLIPPAGE: Ketika user bertanya tentang perbandingan exchange, prediksi biaya, atau mana exchange terbaik untuk trade, WAJIB LANGSUNG call function compareExchanges. JANGAN hanya bilang "saya akan mencari" atau "mohon tunggu" - LANGSUNG CALL FUNCTION!

   PENTING - WAJIB CALL FUNCTION SEKARANG JUGA:
   - Jika user bertanya tentang exchange, slippage, atau perbandingan biaya, LANGSUNG call compareExchanges
   - JANGAN hanya bilang "saya akan mencari" atau "mohon tunggu" tanpa call function
   - JANGAN tanya-tanya dulu - jika informasi sudah cukup, LANGSUNG CALL
   - Function akan otomatis membandingkan 4 exchange (Binance, Kraken, Coinbase, OKX)

   Cara menggunakan compareExchanges:
   - symbol: Format BASE/QUOTE (contoh: "BTC/USDT", "ETH/USDT", "ETH/BTC")
     * Jika user bilang "beli BTC" atau "jual ETH", infer symbol dari konteks
     * Default quote currency adalah USDT jika tidak disebutkan
     * Jika user bilang "BTC/USDT", gunakan itu langsung
   - amount: Jumlah dalam base currency (bukan USD). Contoh: untuk "BTC/USDT" dengan amount 50 berarti 50 BTC
   - side: "buy" untuk beli token, "sell" untuk jual token
     * "beli" = "buy", "jual" = "sell"
   
   Format response SETELAH function call:
   - Jelaskan hasil dalam Bahasa Indonesia yang mudah dipahami
   - Sertakan tabel perbandingan dari response.table (format markdown)
   - Highlight exchange terbaik (best_venue) dengan ⭐
   - Jelaskan apa itu slippage dan mengapa penting (singkat)
   - Berikan rekomendasi berdasarkan total cost terendah

PENTING - Format Jawaban Saldo:
- SELALU sebutkan chain name (misalnya "di Lisk Sepolia", "di Polygon", "di Ethereum Mainnet")
- SELALU gunakan tokenSymbol dari response checkBalance (bisa ETH atau LSK)
- Format: "Saldo kamu adalah X [tokenSymbol] di [chainName]"
- Jangan pernah hanya bilang "saldo kamu X ETH" tanpa mention chain-nya

Contoh jawaban yang BENAR:
- "Saldo kamu adalah 0.38 LSK di Lisk Sepolia" (kalau tokenSymbol = LSK)
- "Saldo kamu adalah 0.007 ETH di Optimism" (kalau tokenSymbol = ETH)
- "Saldo kamu adalah 0 ETH di Polygon"

Contoh jawaban yang SALAH:
- "Saldo kamu adalah 0.38 ETH" (tidak mention chain)
- "Saldo kamu 0.38" (tidak mention token dan chain)

Catatan tentang Token:
- Function checkBalance mengembalikan saldo NATIVE TOKEN dari chain tersebut
- Response akan include "tokenSymbol" (ETH untuk EVM chains, LSK untuk Lisk) dan "tokenName"
- SELALU gunakan tokenSymbol dari response, jangan hardcode "ETH"
- Untuk EVM chains (Ethereum, Polygon, Optimism, Arbitrum, Base): native token = ETH
- Untuk Lisk Sepolia: native token = LSK
- Belum termasuk ERC-20 tokens (USDT, USDC, dll) - itu fitur lanjutan
- Jika user tanya tentang token lain (USDT, USDC), jelaskan bahwa untuk sekarang kita hanya cek native token

Ingat:
- Selalu gunakan Bahasa Indonesia
- Jelaskan dengan bahasa yang mudah dipahami
- Ketika user bertanya tentang saldo, gunakan function checkBalance
- Function checkBalance akan mengembalikan data saldo dari blockchain + comparison dengan UI
- Jika ada field "comparison" di response checkBalance:
  * Kalau "matches: false" dan ada "reason", jelaskan ke user kenapa berbeda (misalnya chain berbeda, atau perbedaan kecil karena timing refresh)
  * Kalau "matches: true", cukup kasih tahu saldo tanpa perlu mention comparison
- Jangan pernah execute transaksi tanpa konfirmasi eksplisit dari user
- Kalau user belum connect wallet, ingatkan mereka untuk connect dulu`;

// Function schema untuk Gemini
const checkBalanceFunction = {
    name: "checkBalance",
    description: "Cek saldo wallet di blockchain tertentu",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            address: {
                type: SchemaType.STRING as const,
                description: "Alamat wallet yang ingin dicek saldonya",
            },
            chainId: {
                type: SchemaType.NUMBER as const,
                description: "Chain ID blockchain (contoh: 4202 untuk Lisk Sepolia)",
            },
        },
        required: ["address", "chainId"],
    },
};

const compareExchangesFunction = {
    name: "compareExchanges",
    description: "Bandingkan exchange dan prediksi slippage untuk trade cryptocurrency. Gunakan ini ketika user ingin konsultasi tentang exchange terbaik atau prediksi biaya real (termasuk slippage) untuk trade.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            symbol: {
                type: SchemaType.STRING as const,
                description: "Trading pair dalam format BASE/QUOTE, contoh: BTC/USDT, ETH/USDT, ETH/BTC",
            },
            amount: {
                type: SchemaType.NUMBER as const,
                description: "Jumlah cryptocurrency yang ingin ditrade (dalam base currency, bukan USD)",
            },
            side: {
                type: SchemaType.STRING as const,
                enum: ["buy", "sell"],
                description: "Aksi trade: 'buy' untuk beli token, 'sell' untuk jual token",
            },
        },
        required: ["symbol", "amount", "side"],
    },
};

interface PrepareSendParams {
    fromAddress: string;
    toAddress: string;
    amount: number;
    chainId: number;
}

const GAS_LIMIT = 21000;
const DEFAULT_GAS_PRICE_GWEI = 10;

const isValidAddress = (address: string) =>
    viemIsAddress(address as `0x${string}`);

const formatNumber = (value: number) => {
    if (!Number.isFinite(value)) return "0";
    if (value === 0) return "0";

    // Handle very small numbers (use more precision, but readable format)
    if (value > 0 && value < 0.000001) {
        // Convert to string to check format
        const str = value.toString();

        // If it's in scientific notation, convert to readable decimal
        if (str.includes('e')) {
            const [base, exp] = str.split('e');
            const exponent = parseInt(exp);
            const baseNum = parseFloat(base);

            // For very small exponents, show as decimal
            if (exponent >= -18) {
                // Calculate how many decimal places needed
                const decimalPlaces = Math.abs(exponent) + Math.max(3, baseNum.toString().replace('.', '').length);
                const decimalValue = baseNum * Math.pow(10, exponent);
                const formatted = decimalValue.toFixed(Math.min(18, decimalPlaces));
                // Remove trailing zeros
                return formatted.replace(/\.?0+$/, '') || '0';
            }
            // For extremely small numbers, use compact scientific notation
            return `${baseNum.toFixed(3)}e${exp}`;
        }

        // Regular decimal - show enough precision
        // Find first non-zero digit
        const decimalStr = value.toFixed(18);
        const firstNonZeroIndex = decimalStr.search(/[1-9]/);
        if (firstNonZeroIndex > 0) {
            // Show from first non-zero + a few more digits
            const precision = Math.min(18, firstNonZeroIndex - 2 + 6);
            const formatted = value.toFixed(precision);
            return formatted.replace(/\.?0+$/, '') || '0';
        }
    }

    // For normal numbers, use up to 18 decimal places (Ethereum precision)
    // But remove trailing zeros intelligently
    const formatted = value.toFixed(18);
    // Remove trailing zeros
    const withoutTrailingZeros = formatted.replace(/\.?0+$/, '');
    // If we removed everything after decimal, add .0 for clarity
    if (!withoutTrailingZeros.includes('.')) {
        return `${withoutTrailingZeros}.0`;
    }
    return withoutTrailingZeros;
};

const estimateGasCost = (gasPriceGwei = DEFAULT_GAS_PRICE_GWEI) => {
    const gasPriceEth = gasPriceGwei / 1e9;
    return gasPriceEth * GAS_LIMIT;
};

const prepareSendTransaction = async ({
    fromAddress,
    toAddress,
    amount,
    chainId,
}: PrepareSendParams) => {
    // Get balance data first
    const balanceData = await checkBalance(fromAddress, chainId);
    const tokenSymbol = balanceData.tokenSymbol || "ETH";
    const chainName = balanceData.formattedChainName;
    const chainIdResolved = balanceData.chainId || chainId;
    const balanceValue = parseFloat(balanceData.balanceEth);
    const gasEstimateEth = estimateGasCost();
    const totalEstimate = amount + gasEstimateEth;

    // Run Guardian validation
    const guardianResult = await guardianService.validateTransaction({
        fromAddress,
        toAddress,
        amount,
        chainId: chainIdResolved,
        tokenSymbol,
        gasEstimate: gasEstimateEth,
        currentBalance: balanceValue,
    });

    // Determine if has sufficient balance (for backward compatibility)
    const hasBalance = Number.isFinite(balanceValue) && balanceValue >= totalEstimate;

    return {
        success: guardianResult.valid,
        preview: {
            fromAddress,
            toAddress,
            amount,
            amountFormatted: `${formatNumber(amount)} ${tokenSymbol}`,
            tokenSymbol,
            chainId: chainIdResolved,
            chainName,
            gasEstimate: `${formatNumber(gasEstimateEth)} ${tokenSymbol}`,
            totalEstimate: `${formatNumber(totalEstimate)} ${tokenSymbol}`,
        },
        validations: {
            hasBalance,
            issues: guardianResult.issues,
            warnings: guardianResult.warnings,
            recommendations: guardianResult.recommendations,
            requiresDoubleConfirm: guardianResult.requiresDoubleConfirm,
            amountUSD: guardianResult.amountUSD,
        },
    };
};

const buildSendMessage = (
    preview: Awaited<ReturnType<typeof prepareSendTransaction>>,
) => {
    const { amountFormatted, chainName, toAddress } = preview.preview;
    let message = `Kamu ingin mengirim ${amountFormatted} ke ${toAddress} di ${chainName}.`;
    message += `\nPerkiraan gas fee: ${preview.preview.gasEstimate}.`;
    message += `\nPerkiraan total: ${preview.preview.totalEstimate}.`;

    // Show USD value if available
    if (preview.validations.amountUSD) {
        message += `\nNilai estimasi: ~$${preview.validations.amountUSD.toFixed(2)} USD`;
    }

    // Show critical issues (blocking)
    if (preview.validations.issues.length) {
        message += `\n\n❌ MASALAH YANG HARUS DIPERBAIKI:\n- ${preview.validations.issues.join(
            "\n- ",
        )}`;
        message += `\n\nPerbaiki hal di atas sebelum melanjutkan.`;
        return message;
    }

    // Show warnings (non-blocking)
    if (preview.validations.warnings && preview.validations.warnings.length) {
        message += `\n\n⚠️ PERINGATAN:\n- ${preview.validations.warnings.join("\n- ")}`;
    }

    // Show recommendations
    if (preview.validations.recommendations && preview.validations.recommendations.length) {
        message += `\n\n💡 SARAN:\n- ${preview.validations.recommendations.join("\n- ")}`;
    }

    // Double confirmation warning
    if (preview.validations.requiresDoubleConfirm) {
        message += `\n\n🔐 Transaksi ini memerlukan konfirmasi tambahan karena nilai yang besar.`;
    }

    message += `\n\nJika kamu setuju, klik tombol konfirmasi untuk mengirim transaksi. Kamu tetap akan diminta menyetujui di wallet.`;

    return message;
};

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as ChatRequestBody;

        if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
            return NextResponse.json(
                { error: "Messages wajib berupa array yang tidak kosong." },
                { status: 400 },
            );
        }

        const lastMessage = body.messages[body.messages.length - 1];

        // Extract entities from entire conversation history (not just last message)
        // This allows multi-turn conversation where user provides info step by step
        const extractEntitiesFromHistory = (messages: Array<{ role: string; content: string }>) => {
            let accumulatedEntities: {
                amount?: number;
                token?: string;
                toAddress?: string;
                chainId?: number;
                chainName?: string;
                tradingPair?: string;
            } = {};

            // Parse all messages to accumulate entities
            for (const msg of messages) {
                const parsed = parseIntent(msg.content);
                // Accumulate entities (later messages override earlier ones)
                if (parsed.entities.amount !== undefined) {
                    accumulatedEntities.amount = parsed.entities.amount;
                }
                if (parsed.entities.token) {
                    accumulatedEntities.token = parsed.entities.token;
                }
                if (parsed.entities.toAddress) {
                    accumulatedEntities.toAddress = parsed.entities.toAddress;
                }
                if (parsed.entities.chainId) {
                    accumulatedEntities.chainId = parsed.entities.chainId;
                    accumulatedEntities.chainName = parsed.entities.chainName;
                }
                if (parsed.entities.tradingPair) {
                    accumulatedEntities.tradingPair = parsed.entities.tradingPair;
                }
            }

            return accumulatedEntities;
        };

        const parsedIntent = parseIntent(lastMessage.content);
        const accumulatedEntities = extractEntitiesFromHistory(body.messages);

        // Merge: use accumulated entities, but last message intent takes priority
        const finalIntent: ParsedIntent = {
            intent: parsedIntent.intent,
            confidence: parsedIntent.confidence,
            entities: {
                ...accumulatedEntities,
                // Last message can override accumulated entities
                amount: parsedIntent.entities.amount ?? accumulatedEntities.amount,
                token: parsedIntent.entities.token ?? accumulatedEntities.token,
                toAddress: parsedIntent.entities.toAddress ?? accumulatedEntities.toAddress,
                chainId: parsedIntent.entities.chainId ?? accumulatedEntities.chainId,
                chainName: parsedIntent.entities.chainName ?? accumulatedEntities.chainName,
                tradingPair: parsedIntent.entities.tradingPair ?? accumulatedEntities.tradingPair,
            },
        };

        const resolvedChainId =
            body.walletContext?.chainId ??
            finalIntent.entities.chainId ??
            4202; // default Lisk Sepolia

        // Check for CONSULT_SLIPPAGE intent first (higher priority)
        const hasConsultSlippageIntent = body.messages.some(msg => {
            const intent = parseIntent(msg.content);
            return intent.intent === "CONSULT_SLIPPAGE";
        }) || finalIntent.intent === "CONSULT_SLIPPAGE";

        // Check for SEND intent in any message (not just last)
        // OR if we have complete transaction info (amount + toAddress), treat as SEND intent
        // BUT: Don't process as SEND if it's actually CONSULT_SLIPPAGE
        const hasSendIntent = !hasConsultSlippageIntent && (
            body.messages.some(msg => {
                const intent = parseIntent(msg.content);
                return intent.intent === "SEND";
            }) || finalIntent.intent === "SEND"
        );

        // Also check if we have complete transaction info from accumulated entities
        // This handles cases where user provides info step by step without explicit "kirim/send" keywords
        // BUT: Only if it's not CONSULT_SLIPPAGE
        const hasCompleteTransactionInfo =
            !hasConsultSlippageIntent &&
            accumulatedEntities.amount !== undefined &&
            accumulatedEntities.toAddress !== undefined;

        // If we have complete info, treat as SEND intent even without explicit keyword
        // BUT: Don't if it's CONSULT_SLIPPAGE
        const shouldProcessAsSend = !hasConsultSlippageIntent && (hasSendIntent || hasCompleteTransactionInfo);

        // Debug logging
        console.log('[AI Chat] Intent Analysis:', {
            lastMessage: lastMessage.content,
            parsedIntent: parsedIntent.intent,
            hasSendIntent,
            hasCompleteTransactionInfo,
            accumulatedEntities,
            finalIntent: finalIntent.entities,
            shouldProcessAsSend
        });

        if (
            finalIntent.intent === "GET_BALANCE" &&
            (!body.walletContext?.isConnected || !body.walletContext.address)
        ) {
            return NextResponse.json({
                message:
                    "Hubungkan wallet kamu dulu supaya aku bisa cek saldo di Lisk Sepolia.",
                intent: finalIntent,
            });
        }

        // Handle CONSULT_SLIPPAGE intent - konsultasi perbandingan exchange
        if (finalIntent.intent === "CONSULT_SLIPPAGE") {
            // Let Gemini handle this with function call - it will call compareExchanges
            // We don't need to process it here, just let it go to Gemini
        }

        // Handle SEND intent with accumulated entities from conversation history
        if (shouldProcessAsSend) {
            if (!body.walletContext?.isConnected || !body.walletContext.address) {
                return NextResponse.json({
                    message:
                        "Hubungkan wallet kamu dulu sebelum mengirim token.",
                    intent: finalIntent,
                });
            }

            const amount = finalIntent.entities.amount;
            const toAddress = finalIntent.entities.toAddress;

            // Check amount - use !== undefined to handle very small numbers (like 1e-12 which is truthy but might be treated as 0)
            if (amount === undefined || amount === null || isNaN(amount) || amount <= 0) {
                return NextResponse.json({
                    message:
                        "Aku perlu tahu jumlah yang ingin kamu kirim. Sebutkan jumlahnya, misalnya \"kirim 0.1 ETH\" atau \"0.1 LSK\".",
                    intent: finalIntent,
                });
            }

            if (!toAddress) {
                return NextResponse.json({
                    message:
                        "Aku belum tahu alamat tujuan. Mohon berikan alamat wallet penerima (format 0x...).",
                    intent: finalIntent,
                });
            }

            const preview = await prepareSendTransaction({
                fromAddress: body.walletContext.address,
                toAddress,
                amount,
                chainId: resolvedChainId,
            });

            const message = buildSendMessage(preview);

            return NextResponse.json({
                message,
                intent: finalIntent,
                transactionPreview: preview,
            });
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            tools: [
                {
                    functionDeclarations: [checkBalanceFunction as any, compareExchangesFunction as any],
                },
            ],
        });

        // Convert messages ke format Gemini
        const chatHistory = body.messages.slice(0, -1).map((msg) => ({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.content }],
        }));

        // Build context untuk Gemini
        let contextMessage = SYSTEM_PROMPT;

        if (body.walletContext?.isConnected) {
            const balanceInfo = body.walletContext.balance
                ? `- Balance UI: ${body.walletContext.balance} ETH (dari WalletContext, bisa jadi berbeda dengan data real-time dari blockchain)`
                : "";
            contextMessage += `\n\nKonteks Wallet Saat Ini:
- Address: ${body.walletContext.address}
- Chain ID: ${body.walletContext.chainId}
${balanceInfo}
- Status: Terhubung

Ketika user bertanya tentang saldo, gunakan function checkBalance dengan address dan chainId di atas. Function akan mengembalikan saldo real-time dari blockchain + comparison dengan balance UI jika tersedia.`;
        } else {
            contextMessage += `\n\nKonteks Wallet Saat Ini:
- Status: Belum terhubung (user perlu connect wallet dulu)

Jika user bertanya tentang saldo, ingatkan mereka untuk connect wallet terlebih dahulu.`;
        }

        contextMessage += `\n\nIntent Parser:
- Intent: ${finalIntent.intent}
- Confidence: ${finalIntent.confidence}
- Chain target: ${resolvedChainId}
- Accumulated entities dari conversation history:
  * Amount: ${finalIntent.entities.amount ?? "belum diketahui"}
  * Token: ${finalIntent.entities.token ?? "belum diketahui"}
  * Trading Pair: ${finalIntent.entities.tradingPair ?? "belum diketahui"}
  * To Address: ${finalIntent.entities.toAddress ?? "belum diketahui"}
  * Chain: ${finalIntent.entities.chainName ?? "belum diketahui"}

PENTING untuk Multi-turn Conversation:
- Jika user memberikan informasi transfer secara bertahap (misalnya: jumlah di message pertama, alamat di message kedua), kamu harus mengingat informasi dari conversation sebelumnya.
- Ketika semua informasi sudah lengkap (amount + toAddress), sistem akan otomatis memproses transaksi.
- Jika informasi belum lengkap, minta user untuk melengkapi informasi yang kurang.

PENTING untuk CONSULT_SLIPPAGE:
- Jika intent adalah CONSULT_SLIPPAGE atau user bertanya tentang exchange/slippage, WAJIB LANGSUNG call compareExchanges
- JANGAN hanya bilang "saya akan mencari" atau "mohon tunggu" - LANGSUNG CALL FUNCTION!
- Jika user memberikan symbol trading pair (misalnya "BTC/USDT") setelah bertanya tentang exchange, itu adalah kelanjutan dari CONSULT_SLIPPAGE
- Gunakan accumulated entities untuk build parameter compareExchanges:
  * symbol: Gunakan tradingPair jika ada (misalnya "BTC/USDT"), atau build dari token + "USDT" (default)
  * amount: Gunakan amount dari accumulated entities
  * side: Infer dari konteks - "beli" = "buy", "jual" = "sell"
- Contoh: Jika user bilang "beli 50 BTC" lalu "BTC/USDT", berarti:
  * symbol: "BTC/USDT" (dari tradingPair)
  * amount: 50 (dari accumulated)
  * side: "buy" (dari "beli")
  * LANGSUNG CALL compareExchanges dengan parameter tersebut SEKARANG JUGA!`;

        // Start chat dengan history
        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: contextMessage }],
                },
                {
                    role: "model",
                    parts: [
                        {
                            text: "Baik, aku Nova AI. Siap membantu kamu dengan wallet crypto!",
                        },
                    ],
                },
                ...chatHistory,
            ],
        });

        // Kirim pesan terakhir
        let result = await chat.sendMessage(lastMessage.content);
        let response = result.response;

        // Handle function calls (loop sampai tidak ada function call lagi)
        let functionCalls = response.functionCalls();
        while (functionCalls && functionCalls.length > 0) {
            // Execute functions
            const functionResults = await Promise.all(
                functionCalls.map(async (fnCall) => {
                    if (fnCall.name === "checkBalance") {
                        const { address, chainId } = fnCall.args as {
                            address?: string;
                            chainId?: number;
                        };

                        const targetAddress =
                            address ?? body.walletContext?.address;
                        const targetChainId = chainId ?? resolvedChainId;

                        if (!targetAddress) {
                            return {
                                functionResponse: {
                                    name: "checkBalance",
                                    response: {
                                        success: false,
                                        error:
                                            "Alamat wallet tidak tersedia untuk pengecekan saldo.",
                                    },
                                },
                            };
                        }

                        try {
                            const balanceData = await checkBalance(
                                targetAddress,
                                targetChainId,
                            );

                            // Compare dengan balance dari UI (WalletContext)
                            const uiBalance = body.walletContext?.balance;
                            const uiChainId = body.walletContext?.chainId;
                            let balanceComparison: {
                                uiBalance?: string;
                                uiChainId?: number;
                                matches: boolean;
                                reason?: string;
                            } = {
                                matches: false,
                            };

                            if (uiBalance && uiChainId) {
                                const apiBalanceNum = parseFloat(balanceData.balanceEth);
                                const uiBalanceNum = parseFloat(uiBalance);
                                const tolerance = 0.000001; // Tolerance untuk floating point

                                if (targetChainId === uiChainId) {
                                    // Same chain - compare values
                                    const diff = Math.abs(apiBalanceNum - uiBalanceNum);
                                    balanceComparison = {
                                        uiBalance,
                                        uiChainId,
                                        matches: diff < tolerance,
                                        reason:
                                            diff >= tolerance
                                                ? `UI menunjukkan ${uiBalance} ETH, API menunjukkan ${balanceData.balanceEth} ETH. Perbedaan kecil ini normal karena timing refresh atau rounding.`
                                                : undefined,
                                    };
                                } else {
                                    // Different chain - explain
                                    balanceComparison = {
                                        uiBalance,
                                        uiChainId,
                                        matches: false,
                                        reason: `UI menunjukkan saldo di chain ${uiChainId}, tapi kamu minta cek saldo di chain ${targetChainId} (${balanceData.formattedChainName}). Ini adalah saldo di chain yang berbeda.`,
                                    };
                                }
                            }

                            return {
                                functionResponse: {
                                    name: "checkBalance",
                                    response: {
                                        success: true,
                                        balanceEth: balanceData.balanceEth,
                                        balanceWei: balanceData.balanceWei,
                                        chainName: balanceData.formattedChainName,
                                        chainId: targetChainId,
                                        address: balanceData.address,
                                        tokenSymbol: balanceData.tokenSymbol || "ETH",
                                        tokenName: balanceData.tokenName || "ETH (Ethereum native token)",
                                        comparison: balanceComparison,
                                    },
                                },
                            };
                        } catch (error) {
                            return {
                                functionResponse: {
                                    name: "checkBalance",
                                    response: {
                                        success: false,
                                        error:
                                            error instanceof Error
                                                ? error.message
                                                : "Gagal mengambil saldo",
                                    },
                                },
                            };
                        }
                    }

                    if (fnCall.name === "compareExchanges") {
                        const { symbol, amount, side } = fnCall.args as {
                            symbol?: string;
                            amount?: number;
                            side?: "buy" | "sell";
                        };

                        if (!symbol || !amount || !side) {
                            return {
                                functionResponse: {
                                    name: "compareExchanges",
                                    response: {
                                        success: false,
                                        error: "Parameter tidak lengkap. Diperlukan: symbol (contoh: BTC/USDT), amount, dan side (buy/sell).",
                                    },
                                },
                            };
                        }

                        try {
                            const slippageData = await slippageService.getPredictions({
                                symbol,
                                amount,
                                side,
                            });

                            // Format response dengan penjelasan dan table
                            const formattedExplanation = slippageService.formatResponseForAI(
                                slippageData,
                                { symbol, amount, side }
                            );
                            const formattedTable = slippageService.formatAsTable(slippageData);

                            return {
                                functionResponse: {
                                    name: "compareExchanges",
                                    response: {
                                        success: true,
                                        best_venue: slippageData.best_venue,
                                        quotes: slippageData.quotes,
                                        explanation: formattedExplanation,
                                        table: formattedTable,
                                    },
                                },
                            };
                        } catch (error) {
                            const errorMessage = error instanceof Error
                                ? error.message
                                : "Gagal mengambil data perbandingan exchange. Silakan coba lagi nanti.";

                            return {
                                functionResponse: {
                                    name: "compareExchanges",
                                    response: {
                                        success: false,
                                        error: errorMessage,
                                    },
                                },
                            };
                        }
                    }

                    return {
                        functionResponse: {
                            name: fnCall.name,
                            response: { error: "Function tidak dikenal" },
                        },
                    };
                }),
            );

            // Kirim hasil function kembali ke Gemini
            result = await chat.sendMessage(functionResults);
            response = result.response;
            // Update functionCalls untuk iterasi berikutnya
            functionCalls = response.functionCalls();
        }

        const text = response.text();

        return NextResponse.json({
            message: text,
            intent: finalIntent,
        });
    } catch (error) {
        console.error("[ai/chat] error", error);
        return NextResponse.json(
            {
                error: "Terjadi kesalahan saat memproses chat.",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 },
        );
    }
}

