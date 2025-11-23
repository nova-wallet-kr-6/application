"use client"
import React, { useState } from 'react';
import { Wallet } from 'lucide-react';
import { WalletInfo } from './WalletInfo';
import { TransferForm } from './TransferForm';
import { ChainSwitcher } from './ChainSwitcher';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useDisconnect } from 'wagmi';
import { useWallet } from '@/contexts/WalletContext';

// Chain configurations for block explorer URLs
const CHAIN_EXPLORERS: Record<number, string> = {
    1: 'https://etherscan.io',
    137: 'https://polygonscan.com',
    10: 'https://optimistic.etherscan.io',
    42161: 'https://arbiscan.io',
    8453: 'https://basescan.org',
    4202: 'https://sepolia-blockscout.lisk.com',
};

const CHAIN_NAMES: Record<number, string> = {
    1: 'Ethereum Mainnet',
    137: 'Polygon',
    10: 'Optimism',
    42161: 'Arbitrum',
    8453: 'Base',
    4202: 'Lisk Sepolia',
};

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

export const CryptoTransfer: React.FC = () => {
    const { address: walletAddress, isConnected, chainId, balance, balanceUpdated, refreshBalance, setBalanceUpdated } = useWallet();
    const { disconnect } = useDisconnect();

    const currentChainName = CHAIN_NAMES[chainId] || `Chain ${chainId}`;
    const blockExplorerUrl = CHAIN_EXPLORERS[chainId] || '';
    const [recipientAddress, setRecipientAddress] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [txHash, setTxHash] = useState('');
    const [error, setError] = useState('');

    const resetTransferForm = () => {
        setRecipientAddress('');
        setAmount('');
        setTxHash('');
        setError('');
    };

    const sendTransaction = async () => {
        if (!recipientAddress || !amount) {
            setError('Please fill in all fields');
            return;
        }
        if (!/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)) {
            setError('Invalid recipient address');
            return;
        }
        if (!walletAddress) {
            setError('Wallet is not connected.');
            return;
        }
        const { ethereum } = window;
        if (!ethereum) {
            setError('MetaMask is not installed. Please install MetaMask to use this app.');
            return;
        }
        try {
            setLoading(true);
            setError('');
            setTxHash('');
            setBalanceUpdated(false);

            const amountWei = BigInt(Math.floor(parseFloat(amount) * 1e18));
            const amountHex = '0x' + amountWei.toString(16);
            const transactionHash = await ethereum.request<string>({
                method: 'eth_sendTransaction',
                params: [{
                    from: walletAddress,
                    to: recipientAddress,
                    value: amountHex,
                    gas: '0x5208',
                }],
            });
            setTxHash(transactionHash);

            // Clear form fields immediately
            setRecipientAddress('');
            setAmount('');

            // Refresh balance after a delay
            setTimeout(async () => {
                await refreshBalance();
            }, 2000);

        } catch (err: unknown) {
            setError(getErrorMessage(err) || 'Transaction failed');
        } finally {
            setLoading(false);
        }
    };

    const disconnectWallet = () => {
        disconnect();
        setRecipientAddress('');
        setAmount('');
        setTxHash('');
        setError('');
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
                    <Wallet className="w-8 h-8 text-indigo-600" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Crypto Transfer</h1>
                <p className="text-gray-600">{currentChainName}</p>
            </div>

            {!isConnected ? (
                <ConnectButton />
            ) : (
                <div className="space-y-6">
                    <ChainSwitcher />
                    <WalletInfo address={walletAddress} balance={balance} balanceUpdated={balanceUpdated} />

                    <TransferForm
                        recipientAddress={recipientAddress}
                        amount={amount}
                        loading={loading}
                        error={error}
                        txHash={txHash}
                        blockExplorerUrl={blockExplorerUrl}
                        onRecipientChange={setRecipientAddress}
                        onAmountChange={setAmount}
                        onSubmit={sendTransaction}
                        onReset={resetTransferForm}
                    />

                    <button
                        onClick={disconnectWallet}
                        className="w-full text-gray-600 hover:text-gray-900 font-medium py-2 text-sm"
                    >
                        Disconnect Wallet
                    </button>
                </div>
            )}
        </div>
    );
};