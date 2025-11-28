'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function CreatePaymentPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    cryptoAmount: '0.002',
    cryptoCurrency: 'ETH',
    receiverWallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    network: 'ethereum',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/payments/create', {
        cryptoAmount: parseFloat(formData.cryptoAmount),
        cryptoCurrency: formData.cryptoCurrency,
        receiverWallet: formData.receiverWallet,
        network: formData.network,
      });

      console.log('Payment created:', response.data);
      router.push(`/pay/${response.data.data.id}`);
    } catch (err: any) {
      console.error('Error creating payment:', err);
      setError(err.response?.data?.message || 'Failed to create payment request');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">💰 Crypto Payment Gateway</h1>
          <p className="text-gray-600">Accept crypto payments with ease</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Payment Request</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">⚠️ {error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Crypto Amount
              </label>
              <input
                type="number"
                name="cryptoAmount"
                value={formData.cryptoAmount}
                onChange={handleChange}
                step="0.0001"
                min="0.0015"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
              <p className="text-red-600 text-sm mt-1">Minimum: 0.0015 ETH (~$5 USD)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cryptocurrency
              </label>
              <select
                name="cryptoCurrency"
                value={formData.cryptoCurrency}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              >
                <option value="ETH">ETH - Ethereum</option>
                <option value="BTC">BTC - Bitcoin</option>
                <option value="USDT">USDT - Tether</option>
                <option value="USDC">USDC - USD Coin</option>
                <option value="MATIC">MATIC - Polygon</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Network</label>
              <select
                name="network"
                value={formData.network}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              >
                <option value="ethereum">Ethereum</option>
                <option value="polygon">Polygon</option>
                <option value="bsc">Binance Smart Chain</option>
                <option value="bitcoin">Bitcoin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Receiver Wallet Address
              </label>
              <input
                type="text"
                name="receiverWallet"
                value={formData.receiverWallet}
                onChange={handleChange}
                placeholder="0x..."
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-mono text-sm"
              />
              <p className="text-gray-500 text-sm mt-1">The wallet that will receive the crypto</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '⏳ Creating...' : '🚀 Create Payment Request'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mt-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">How it works</h3>
          <ol className="space-y-3 text-gray-700">
            <li className="flex gap-3">
              <span className="font-bold text-indigo-600">1.</span>
              <span>Enter the crypto amount you want to receive</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-indigo-600">2.</span>
              <span>Get a unique payment link</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-indigo-600">3.</span>
              <span>Share the link with the payer</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-indigo-600">4.</span>
              <span>They pay with their local currency</span>
            </li>
            <li className="flex gap-3">
              <span className="font-bold text-indigo-600">5.</span>
              <span>You receive crypto in your wallet!</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}