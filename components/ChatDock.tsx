"use client";

import { useState } from "react";
import { MessageCircle, SendHorizonal, X } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";

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

export const ChatDock = () => {
    const { address, chainId, isConnected, balance } = useWallet();
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

    const appendMessage = (message: ChatMessage) =>
        setMessages((prev) => [...prev, message]);

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

            const { message } = await response.json();
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
                                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === "user"
                                    ? "bg-indigo-500/20 text-indigo-100"
                                    : "bg-white/5 text-slate-100"
                                    }`}
                            >
                                {message.content}
                            </div>
                        </div>
                    ))}
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
        </>
    );
};

