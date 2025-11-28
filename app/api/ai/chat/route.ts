import { NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { parseIntent } from "@/lib/intentParser";

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
        const parsedIntent = parseIntent(lastMessage.content);
        const resolvedChainId =
            body.walletContext?.chainId ??
            parsedIntent.entities.chainId ??
            4202; // default Lisk Sepolia

        if (
            parsedIntent.intent === "GET_BALANCE" &&
            (!body.walletContext?.isConnected || !body.walletContext.address)
        ) {
            return NextResponse.json({
                message:
                    "Hubungkan wallet kamu dulu supaya aku bisa cek saldo di Lisk Sepolia.",
                intent: parsedIntent,
            });
        }

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            tools: [
                {
                    functionDeclarations: [checkBalanceFunction as any],
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
- Intent: ${parsedIntent.intent}
- Confidence: ${parsedIntent.confidence}
- Chain target: ${resolvedChainId}`;

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
            intent: parsedIntent,
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

