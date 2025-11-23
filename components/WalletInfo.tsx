"use client"
import React from 'react';

interface WalletInfoProps {
    address: string;
    balance: string;
    balanceUpdated?: boolean;
}

export const WalletInfo: React.FC<WalletInfoProps> = ({ address, balance, balanceUpdated }) => {
    return (
        <div className="bg-indigo-50 rounded-lg p-4">
            <p className="text-sm text-indigo-600 font-medium mb-1">Connected Wallet</p>
            <p className="text-xs text-gray-600 font-mono break-all">{address}</p>
            <p className="text-lg font-bold text-indigo-900 mt-2 flex items-center gap-2">
                {balance} ETH
                {balanceUpdated && (
                    <span className="text-xs font-semibold text-green-700 bg-green-100 rounded-full px-2 py-0.5">
                        Updated
                    </span>
                )}
            </p>
        </div>
    );
};