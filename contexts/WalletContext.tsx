"use client"
import React, { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';

interface WalletContextType {
    address: string;
    isConnected: boolean;
    chainId: number;
    balance: string;
    balanceUpdated: boolean;
    isLoadingBalance: boolean;
    switchChain: (chainId: number) => void;
    refreshBalance: () => Promise<void>;
    setBalanceUpdated: (updated: boolean) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }

    if (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as { message?: unknown }).message === 'string'
    ) {
        return (error as { message: string }).message;
    }

    return '';
};

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { switchChain: switchChainWagmi } = useSwitchChain();

    const [balance, setBalance] = useState('0');
    const [balanceUpdated, setBalanceUpdated] = useState(false);
    const [isLoadingBalance, setIsLoadingBalance] = useState(false);

    const getEthereumProvider = useCallback(() => {
        const { ethereum } = window;
        if (!ethereum) {
            throw new Error('No ethereum provider');
        }
        return ethereum;
    }, []);

    const fetchBalance = useCallback(async (account: string) => {
        try {
            setIsLoadingBalance(true);
            const ethereum = getEthereumProvider();
            const balanceHex = await ethereum.request<string>({
                method: 'eth_getBalance',
                params: [account, 'latest'],
            });
            const balanceWei = parseInt(balanceHex, 16);
            const balanceEth = (balanceWei / 1e18).toFixed(6);
            setBalance(balanceEth);
            setBalanceUpdated(true);
        } catch (err: unknown) {
            console.error('Failed to fetch balance:', getErrorMessage(err));
            setBalance('0');
        } finally {
            setIsLoadingBalance(false);
        }
    }, [getEthereumProvider]);

    const refreshBalance = useCallback(async () => {
        if (address) {
            setBalanceUpdated(false);
            await fetchBalance(address);
        }
    }, [address, fetchBalance]);

    useEffect(() => {
        if (isConnected && address) {
            setBalanceUpdated(false);
            fetchBalance(address);
        } else {
            setBalance('0');
            setBalanceUpdated(false);
        }
    }, [fetchBalance, isConnected, address, chainId]);

    const handleSwitchChain = useCallback((targetChainId: number) => {
        if (switchChainWagmi) {
            switchChainWagmi({ chainId: targetChainId });
        }
    }, [switchChainWagmi]);

    const value: WalletContextType = {
        address: address ?? '',
        isConnected,
        chainId,
        balance,
        balanceUpdated,
        isLoadingBalance,
        switchChain: handleSwitchChain,
        refreshBalance,
        setBalanceUpdated,
    };

    return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const useWallet = (): WalletContextType => {
    const context = useContext(WalletContext);
    if (!context) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
};
