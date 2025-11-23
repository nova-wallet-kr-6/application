"use client"
import React from 'react';
import { Send, AlertCircle, CheckCircle } from 'lucide-react';

interface TransferFormProps {
    recipientAddress: string;
    amount: string;
    loading: boolean;
    error: string;
    txHash: string;
    blockExplorerUrl?: string;
    onRecipientChange: (value: string) => void;
    onAmountChange: (value: string) => void;
    onSubmit: () => void;
    onReset: () => void;
}

export const TransferForm: React.FC<TransferFormProps> = ({
    recipientAddress,
    amount,
    loading,
    error,
    txHash,
    blockExplorerUrl,
    onRecipientChange,
    onAmountChange,
    onSubmit,
    onReset
}) => {
    return (
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipient Address
                </label>
                <input
                    type="text"
                    value={recipientAddress}
                    onChange={(e) => onRecipientChange(e.target.value)}
                    placeholder="0x..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-mono text-sm text-gray-900"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (ETH)
                </label>
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => onAmountChange(e.target.value)}
                    placeholder="0.0"
                    step="0.000001"
                    min="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-mono text-sm text-gray-900"
                />
            </div>

            <button
                onClick={onSubmit}
                disabled={loading || !recipientAddress || !amount}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {loading ? (
                    <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Sending...
                    </>
                ) : (
                    <>
                        <Send className="w-5 h-5" />
                        Send Transaction
                    </>
                )}
            </button>

            {txHash && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-green-900 mb-1">Transaction Sent!</p>
                            <p className="text-xs text-green-700 font-mono break-all mb-2">{txHash}</p>
                            {blockExplorerUrl && (
                                <a
                                    href={`${blockExplorerUrl}/tx/${txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-green-600 hover:text-green-700 underline block mb-2"
                                >
                                    View on Block Explorer →
                                </a>
                            )}
                            <button
                                type="button"
                                onClick={onReset}
                                className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                            >
                                Start another transfer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{error}</p>
                </div>
            )}
        </div>
    );
};