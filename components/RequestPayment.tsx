import React, { useState } from 'react';
import { QrCode, Copy, Check, ExternalLink, X } from 'lucide-react';

interface RequestPaymentProps {
  walletAddress: string;
  isConnected: boolean;
}

export const RequestPayment: React.FC<RequestPaymentProps> = ({ 
  walletAddress, 
  isConnected 
}) => {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USDT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentLink, setPaymentLink] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreatePayment = async () => {
    if (!amount || parseFloat(amount) < 0.01) {
      setError('Amount must be at least 0.01');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cryptoAmount: parseFloat(amount),
          cryptoCurrency: currency,
          receiverWallet: walletAddress,
          network: getDefaultNetwork(currency),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create payment');
      }

      const data = await response.json();
      const link = `${window.location.origin}/pay/${data.data.id}`;
      setPaymentLink(link);
      setShowModal(true);
      setAmount('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getDefaultNetwork = (curr: string) => {
    const networkMap: Record<string, string> = {
      'USDT': 'polygon',
      'USDC': 'polygon',
      'ETH': 'ethereum',
      'BTC': 'bitcoin',
      'MATIC': 'polygon',
    };
    return networkMap[curr] || 'ethereum';
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(paymentLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeModal = () => {
    setShowModal(false);
    setPaymentLink('');
    setCopied(false);
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <QrCode className="h-16 w-16 text-slate-400 mb-4" />
        <h3 className="text-lg font-semibold text-slate-700 mb-2">
          Connect Your Wallet
        </h3>
        <p className="text-sm text-slate-500 max-w-md">
          Connect your wallet to create payment links and receive crypto
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Amount to Receive
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="100"
              step="0.01"
              min="0.01"
              className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-900"
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-900 font-medium"
            >
              <option value="USDT">USDT</option>
              <option value="USDC">USDC</option>
              <option value="ETH">ETH</option>
            </select>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Minimum: 0.01 {currency}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Your Wallet Address
          </label>
          <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-sm font-mono text-slate-600 break-all">
              {walletAddress}
            </p>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Crypto will be sent to this address
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <span className="text-red-600">⚠️</span>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <button
          onClick={handleCreatePayment}
          disabled={loading || !amount}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Creating...
            </>
          ) : (
            <>
              <QrCode className="w-5 h-5" />
              Generate Payment Link
            </>
          )}
        </button>

        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-indigo-900 mb-2">
            How it works
          </h4>
          <ol className="text-sm text-indigo-700 space-y-1">
            <li>1. Create payment link with amount</li>
            <li>2. Share QR code or link to payer</li>
            <li>3. They pay with QRIS (ID) or card (international)</li>
            <li>4. You receive crypto in your wallet!</li>
          </ol>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">
                Payment Link Created!
              </h3>
              <p className="text-slate-600">
                Share this link to receive {amount} {currency}
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-xs font-medium text-slate-600 mb-2">Payment Link</p>
                <p className="text-sm font-mono text-slate-900 break-all">
                  {paymentLink}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCopyLink}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </>
                  )}
                </button>
                <a
                  href={paymentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>

              <button
                onClick={closeModal}
                className="w-full text-slate-600 hover:text-slate-900 font-medium py-2 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};