"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, SendHorizonal, X } from "lucide-react";
import { parseEther } from "viem";
import { useSendTransaction } from "wagmi";
import { useWallet } from "@/contexts/WalletContext";
import ReactMarkdown from "react-markdown";
import {
    TransactionConfirmModal,
    TransactionPreviewData,
} from "./TransactionConfirmModal";

type ChatMessage = {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: number;
};

const formatTimestamp = (timestamp: number) =>
    new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
    }).format(timestamp);

// Loading indicator component dengan animasi typing dots yang smooth
const TypingIndicator = () => {
    return (
        <div className="flex items-center gap-2">
            <div className="flex gap-1.5 items-center">
                <div
                    className="h-2 w-2 rounded-full bg-indigo-400"
                    style={{
                        animation: 'typingDot 1.4s ease-in-out infinite',
                        animationDelay: '0s'
                    }}
                ></div>
                <div
                    className="h-2 w-2 rounded-full bg-indigo-400"
                    style={{
                        animation: 'typingDot 1.4s ease-in-out infinite',
                        animationDelay: '0.2s'
                    }}
                ></div>
                <div
                    className="h-2 w-2 rounded-full bg-indigo-400"
                    style={{
                        animation: 'typingDot 1.4s ease-in-out infinite',
                        animationDelay: '0.4s'
                    }}
                ></div>
            </div>
            <span className="text-xs text-slate-400">Nova AI sedang mengetik...</span>
        </div>
    );
};

export const ChatDock = () => {
    const { address, chainId, isConnected, balance, refreshBalance } = useWallet();
    const { sendTransactionAsync } = useSendTransaction();
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: "system-1",
            role: "assistant",
            content:
                "Hai! Aku Nova AI. Tanyakan apa saja tentang saldo atau transaksi kamu.",
            timestamp: Date.now(),
        },
    ]);
    const [pendingPreview, setPendingPreview] =
        useState<TransactionPreviewData | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isTxProcessing, setIsTxProcessing] = useState(false);
    const [txModalError, setTxModalError] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const appendMessage = (message: ChatMessage) =>
        setMessages((prev) => [...prev, message]);

    // Auto-scroll ke bawah ketika ada message baru atau loading
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isSending]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: "user",
            content: input.trim(),
            timestamp: Date.now(),
        };

        appendMessage(userMessage);
        setInput("");

        try {
            setIsSending(true);

            // Prepare messages untuk AI (exclude system message)
            const aiMessages = messages
                .filter((msg) => msg.role !== "system")
                .map((msg) => ({
                    role: msg.role,
                    content: msg.content,
                }));

            // Tambahkan pesan user terbaru
            aiMessages.push({
                role: "user",
                content: userMessage.content,
            });

            const response = await fetch("/api/ai/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages: aiMessages,
                    walletContext: isConnected && address
                        ? {
                            address,
                            chainId,
                            balance,
                            isConnected: true,
                        }
                        : {
                            isConnected: false,
                        },
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.error || "Gagal memproses chat",
                );
            }

            const { message, intent, transactionPreview } = await response.json();

            if (transactionPreview) {
                setPendingPreview(transactionPreview);
                if (transactionPreview.success) {
                    setTxModalError("");
                    setIsConfirmOpen(true);
                }
            }

            if (intent) {
                console.debug("[Nova AI] intent detected:", intent);
            }
            appendMessage({
                id: crypto.randomUUID(),
                role: "assistant",
                content: message,
                timestamp: Date.now(),
            });
        } catch (error) {
            appendMessage({
                id: crypto.randomUUID(),
                role: "assistant",
                content:
                    error instanceof Error
                        ? `Maaf, ada kendala: ${error.message}`
                        : "Maaf, ada kendala saat memproses pesan kamu.",
                timestamp: Date.now(),
            });
        } finally {
            setIsSending(false);
        }
    };

    const handleCancelTransaction = () => {
        setIsConfirmOpen(false);
        setPendingPreview(null);
        setTxModalError("");
    };

    const handleConfirmTransaction = async () => {
        if (!pendingPreview || !pendingPreview.success) {
            return;
        }

        if (!isConnected || !address) {
            setTxModalError("Wallet belum terhubung.");
            return;
        }

        if (chainId !== pendingPreview.preview.chainId) {
            setTxModalError(
                `Switch chain kamu ke ${pendingPreview.preview.chainName} sebelum mengirim.`,
            );
            return;
        }

        try {
            setIsTxProcessing(true);
            setTxModalError("");

            // Gunakan toFixed(18) untuk menghindari notasi ilmiah (e-17) dan masalah locale (koma vs titik)
            const amountStr = pendingPreview.preview.amount.toFixed(18);
            console.log("[ChatDock] Sending transaction:", {
                amountOriginal: pendingPreview.preview.amount,
                amountStr,
                to: pendingPreview.preview.toAddress
            });

            const valueWei = parseEther(amountStr);

            const txHash = await sendTransactionAsync({
                to: pendingPreview.preview.toAddress as `0x${string}`,
                value: valueWei,
            });

            appendMessage({
                id: crypto.randomUUID(),
                role: "assistant",
                content: `✅ Transaksi dikirim! Hash: ${txHash}`,
                timestamp: Date.now(),
            });

            setIsConfirmOpen(false);
            setPendingPreview(null);
            await refreshBalance();
        } catch (error) {
            console.error("[ChatDock] Transaction error:", error);
            // Tampilkan error asli jika ada message-nya
            const errorMessage = error instanceof Error ? error.message : String(error);

            // Handle user rejection khusus
            if (errorMessage.toLowerCase().includes("user rejected")) {
                setTxModalError("Transaksi dibatalkan oleh user di wallet.");
            } else {
                setTxModalError(`Gagal mengirim transaksi: ${errorMessage}`);
            }
        } finally {
            setIsTxProcessing(false);
        }
    };

    return (
        <>
            <div
                className={`fixed bottom-6 right-6 z-50 flex w-full max-w-sm flex-col rounded-3xl border border-white/15 bg-slate-950/90 text-slate-100 shadow-[0_20px_70px_rgba(2,6,23,0.65)] backdrop-blur-2xl transition-all ${isOpen
                    ? "pointer-events-auto opacity-100"
                    : "pointer-events-none translate-y-6 opacity-0"
                    }`}
            >
                <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
                    <div>
                        <p className="text-sm font-semibold text-white">Nova AI Chat</p>
                        <p className="text-xs text-slate-400">
                            {isConnected ? "Wallet terhubung" : "Wallet belum terhubung"}
                        </p>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="rounded-full bg-white/5 p-1 text-slate-300 transition hover:bg-white/10"
                        aria-label="Tutup chat"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex max-h-72 flex-col gap-3 overflow-y-auto px-5 py-4">
                    {messages.map((message) => (
                        <div key={message.id} className="space-y-1">
                            <div
                                className={`text-xs font-semibold ${message.role === "user" ? "text-indigo-300" : "text-slate-400"
                                    }`}
                            >
                                {message.role === "user" ? "Kamu" : "Nova AI"} •{" "}
                                {formatTimestamp(message.timestamp)}
                            </div>
                            <div
                                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed break-words ${message.role === "user"
                                    ? "bg-indigo-500/20 text-indigo-100"
                                    : "bg-white/5 text-slate-100"
                                    }`}
                            >
                                {message.role === "assistant" ? (
                                    <ReactMarkdown
                                        components={{
                                            // Custom styling untuk better readability di dark theme
                                            p: ({ children }) => <p className="mb-2 last:mb-0 text-slate-100 leading-relaxed">{children}</p>,
                                            strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                                            ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1 text-slate-100 ml-2">{children}</ul>,
                                            li: ({ children }) => <li className="ml-1">{children}</li>,
                                            h1: ({ children }) => <h1 className="text-lg font-semibold mb-2 mt-3 text-white first:mt-0">{children}</h1>,
                                            h2: ({ children }) => <h2 className="text-base font-semibold mb-2 mt-3 text-white first:mt-0">{children}</h2>,
                                            h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2 text-white first:mt-0">{children}</h3>,
                                            hr: () => <hr className="border-slate-700 my-4 border-t" />,
                                            code: ({ children }) => <code className="text-indigo-300 bg-slate-800/50 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
                                        }}
                                    >
                                        {message.content}
                                    </ReactMarkdown>
                                ) : (
                                    <span className="whitespace-pre-wrap">{message.content}</span>
                                )}
                            </div>
                        </div>
                    ))}
                    {/* Loading indicator ketika AI sedang memproses */}
                    {isSending && (
                        <div className="space-y-1">
                            <div className="text-xs font-semibold text-slate-400">
                                Nova AI • {formatTimestamp(Date.now())}
                            </div>
                            <div className="rounded-2xl bg-white/5 px-4 py-3">
                                <TypingIndicator />
                            </div>
                        </div>
                    )}
                    {/* Invisible div untuk auto-scroll */}
                    <div ref={messagesEndRef} />
                </div>

                <div className="border-t border-white/5 px-4 py-3">
                    <div className="flex items-center gap-2 rounded-2xl bg-white/5 px-3">
                        <input
                            className="flex-1 bg-transparent py-3 text-sm text-white placeholder:text-white/40 focus:outline-none"
                            placeholder={
                                isConnected
                                    ? "Tanyakan apa saja tentang wallet kamu..."
                                    : "Hubungkan wallet untuk mulai chat"
                            }
                            value={input}
                            onChange={(event) => setInput(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter" && !event.shiftKey) {
                                    event.preventDefault();
                                    handleSend();
                                }
                            }}
                            disabled={isSending}
                        />
                        <button
                            onClick={handleSend}
                            disabled={isSending || !input.trim()}
                            className="rounded-2xl bg-indigo-500 p-2 text-white transition hover:bg-indigo-400 disabled:opacity-40"
                        >
                            <SendHorizonal className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            <button
                onClick={() => setIsOpen((prev) => !prev)}
                className="fixed bottom-6 right-6 z-40 rounded-full bg-indigo-500 p-4 text-white shadow-[0_20px_70px_rgba(2,6,23,0.65)] transition hover:bg-indigo-400"
                aria-label="Buka chat Nova AI"
            >
                <MessageCircle className="h-6 w-6" />
            </button>

            <TransactionConfirmModal
                open={isConfirmOpen}
                preview={pendingPreview}
                onConfirm={handleConfirmTransaction}
                onCancel={handleCancelTransaction}
                isProcessing={isTxProcessing}
                error={txModalError}
            />
        </>
    );
};

