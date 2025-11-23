"use client"
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';

const SUPPORTED_CHAINS = [
    { id: 1, name: 'Ethereum Mainnet', icon: '⟠' },
    { id: 137, name: 'Polygon', icon: '⬡' },
    { id: 10, name: 'Optimism', icon: '🔴' },
    { id: 42161, name: 'Arbitrum', icon: '🔵' },
    { id: 8453, name: 'Base', icon: '🔷' },
    { id: 4202, name: 'Lisk Sepolia', icon: '🟣' },
];

export const ChainSwitcher: React.FC = () => {
    const { chainId, switchChain } = useWallet();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentChain = SUPPORTED_CHAINS.find(chain => chain.id === chainId) || {
        id: chainId,
        name: `Chain ${chainId}`,
        icon: '⚡'
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleChainSelect = (targetChainId: number) => {
        switchChain(targetChainId);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
                <span className="text-lg">{currentChain.icon}</span>
                <span className="text-sm font-medium text-gray-700">{currentChain.name}</span>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-full min-w-[200px] bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    {SUPPORTED_CHAINS.map((chain) => (
                        <button
                            key={chain.id}
                            onClick={() => handleChainSelect(chain.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${chain.id === chainId ? 'bg-indigo-50' : ''
                                }`}
                        >
                            <span className="text-lg">{chain.icon}</span>
                            <span className={`text-sm font-medium ${chain.id === chainId ? 'text-indigo-600' : 'text-gray-700'
                                }`}>
                                {chain.name}
                            </span>
                            {chain.id === chainId && (
                                <span className="ml-auto text-indigo-600">✓</span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
