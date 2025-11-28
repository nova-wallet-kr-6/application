import { NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

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
        isConnected: boolean;
    };
};

const SYSTEM_PROMPT = `Kamu adalah Nova AI, asisten crypto wallet yang ramah dan membantu. Kamu berbicara dalam Bahasa Indonesia yang natural dan mudah dipahami.

Tugas kamu:
1. Bantu user cek saldo wallet mereka dengan memanggil function checkBalance ketika user bertanya tentang saldo
2. Bantu user transfer token dengan memanggil function prepareTransfer ketika user ingin mengirim/transfer ETH
3. Jelaskan informasi crypto dengan bahasa sederhana
4. Validasi transaksi sebelum execute (jangan pernah execute tanpa konfirmasi user)

Ingat:
- Selalu gunakan Bahasa Indonesia
- Jelaskan dengan bahasa yang mudah dipahami
- Ketika user bertanya tentang saldo, gunakan function checkBalance
- Ketika user ingin transfer/kirim ETH, gunakan function prepareTransfer dengan detail yang jelas
- Function prepareTransfer akan meminta approval dari user sebelum transaksi dijalankan
- Jangan pernah execute transaksi tanpa konfirmasi eksplisit dari user
- Kalau user belum connect wallet, ingatkan mereka untuk connect dulu
- Pastikan alamat tujuan transfer adalah alamat Ethereum yang valid (format 0x...)`;

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

const prepareTransferFunction = {
    name: "prepareTransfer",
    description: "Persiapkan transfer token ETH ke alamat lain. Function ini akan meminta approval dari user sebelum transaksi dijalankan.",
    parameters: {
        type: SchemaType.OBJECT,
        properties: {
            toAddress: {
                type: SchemaType.STRING as const,
                description: "Alamat tujuan transfer (harus format address Ethereum yang valid, contoh: 0x...)",
            },
            amount: {
                type: SchemaType.STRING as const,
                description: "Jumlah ETH yang akan ditransfer (dalam format string, contoh: '0.1')",
            },
            fromAddress: {
                type: SchemaType.STRING as const,
                description: "Alamat wallet pengirim",
            },
        },
        required: ["toAddress", "amount", "fromAddress"],
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

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            tools: [
                {
                    functionDeclarations: [checkBalanceFunction, prepareTransferFunction],
                },
            ],
        });

        // Convert messages ke format Gemini
        const chatHistory = body.messages.slice(0, -1).map((msg) => ({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.content }],
        }));

        const lastMessage = body.messages[body.messages.length - 1];

        // Build context untuk Gemini
        let contextMessage = SYSTEM_PROMPT;

        if (body.walletContext?.isConnected) {
            contextMessage += `\n\nKonteks Wallet Saat Ini:
- Address: ${body.walletContext.address}
- Chain ID: ${body.walletContext.chainId}
- Status: Terhubung

Ketika user bertanya tentang saldo, gunakan function checkBalance dengan address dan chainId di atas.`;
        } else {
            contextMessage += `\n\nKonteks Wallet Saat Ini:
- Status: Belum terhubung (user perlu connect wallet dulu)

Jika user bertanya tentang saldo, ingatkan mereka untuk connect wallet terlebih dahulu.`;
        }

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
        let transferRequest = null;

        while (functionCalls && functionCalls.length > 0) {
            // Execute functions
            const functionResults = await Promise.all(
                functionCalls.map(async (fnCall) => {
                    if (fnCall.name === "checkBalance") {
                        const { address, chainId } = fnCall.args as {
                            address: string;
                            chainId: number;
                        };

                        try {
                            const balanceData = await checkBalance(address, chainId);
                            return {
                                functionResponse: {
                                    name: "checkBalance",
                                    response: {
                                        success: true,
                                        balanceEth: balanceData.balanceEth,
                                        balanceWei: balanceData.balanceWei,
                                        chainName: balanceData.formattedChainName,
                                        address: balanceData.address,
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

                    if (fnCall.name === "prepareTransfer") {
                        const { toAddress, amount, fromAddress } = fnCall.args as {
                            toAddress: string;
                            amount: string;
                            fromAddress: string;
                        };

                        // Validasi address format
                        if (!toAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
                            return {
                                functionResponse: {
                                    name: "prepareTransfer",
                                    response: {
                                        success: false,
                                        error: "Alamat tujuan tidak valid. Harus format Ethereum address (0x...)",
                                    },
                                },
                            };
                        }

                        // Validasi amount
                        const amountNum = parseFloat(amount);
                        if (isNaN(amountNum) || amountNum <= 0) {
                            return {
                                functionResponse: {
                                    name: "prepareTransfer",
                                    response: {
                                        success: false,
                                        error: "Jumlah transfer harus lebih dari 0",
                                    },
                                },
                            };
                        }

                        // Simpan transfer request untuk dikembalikan ke client
                        transferRequest = {
                            toAddress,
                            amount,
                            fromAddress,
                        };

                        return {
                            functionResponse: {
                                name: "prepareTransfer",
                                response: {
                                    success: true,
                                    message: "Transfer siap diproses. Menunggu approval dari user.",
                                    toAddress,
                                    amount,
                                    fromAddress,
                                },
                            },
                        };
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
            transferRequest: transferRequest || undefined,
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

