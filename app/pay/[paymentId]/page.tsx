'use client';

import React, { useState, useEffect, use, useRef } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';

interface Payment {
  id: string;
  cryptoAmount: number;
  cryptoCurrency: string;
  fiatAmount: number;
  fiatCurrency: string;
  receiverWallet: string;
  network: string;
  status: string;
  paymentMethod: 'QRIS' | 'TRANSAK';
  userCountry: string;
  expiresAt: string;
  createdAt: string;
  cryptoSent?: number;
  txHash?: string;
  midtransOrderId?: string | null;
  midtransTransactionId?: string | null;
}

export default function PaymentPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = use(params);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qrData, setQrData] = useState<string | null>(null); // QR code URL or data
  const [qrString, setQrString] = useState<string | null>(null); // QR string for rendering

  // 🚫 Prevent loadPaymentDetails from running twice
  const hasLoadedRef = useRef(false);

  // 🚫 Prevent QRIS from being created twice
  const qrInitializedRef = useRef(false);

  // 🟦 Load payment ONCE
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    loadPaymentDetails();
  }, [paymentId]);

  // 🟦 Poll payment status
  useEffect(() => {
    // Poll status if payment exists and not in a final state
    if (payment && !['COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED'].includes(payment.status)) {
      console.log('🔄 Starting polling for status:', payment.status);

      const interval = setInterval(() => {
        checkPaymentStatus();
      }, 3000);

      return () => {
        console.log('🛑 Stopping polling');
        clearInterval(interval);
      };
    } else if (payment) {
      console.log('✅ Polling stopped - payment in final state:', payment.status);
    }
  }, [payment, paymentId]); // Tambahkan paymentId ke dependency

  const loadPaymentDetails = async () => {
    console.log('🔍 Loading payment details for:', paymentId);

    try {
      const response = await axios.get(`/api/payments/${paymentId}`);
      console.log('✅ Payment details loaded:', response.data);

      const paymentData = response.data.data;
      setPayment(paymentData);

      // ⛔ Check if payment is already completed or processing
      if (['PAID_FIAT', 'PROCESSING_CRYPTO', 'COMPLETED'].includes(paymentData.status)) {
        console.log('✅ Payment already processed:', paymentData.status);
        setLoading(false);
        return;
      }

      // ⛔ Prevent QRIS from running twice due to React/Refresh
      if (paymentData.paymentMethod === 'QRIS') {
        // STRICT CHECK: Hanya create QRIS baru jika status PENDING
        if (paymentData.status === 'PENDING') {
          if (!qrInitializedRef.current) {
            qrInitializedRef.current = true;
            console.log('💳 Initializing QRIS...', {
              hasMidtransOrderId: !!paymentData.midtransOrderId,
              status: paymentData.status
            });

            // ✅ Initialize QRIS (will fetch existing or create new)
            await initializeQRIS(paymentData);
          } else {
            console.log('⚠️ QRIS initialization skipped (ref check)');
          }
        } else {
          console.log(`⚠️ QRIS initialization skipped because status is ${paymentData.status}`);
          // Jika status WAITING_PAYMENT tapi kita tidak punya QR data (misal refresh page),
          // Kita tidak bisa berbuat banyak selain polling status, KECUALI backend mengembalikan QR URL.
          // Tapi jangan panggil initializeQRIS karena akan error 400.
        }
      } else {
        console.log('🌐 Initializing Transak...');
        await initializeTransak(paymentData);
      }

      setLoading(false);
      console.log('✅ Page ready!');
    } catch (err: any) {
      console.error('❌ Error loading payment:', err);
      setError(err.response?.data?.error || 'Failed to load payment details');
      setLoading(false);
    }
  };

  const initializeQRIS = async (paymentData: Payment) => {
    console.log('💳 Initializing QRIS payment...', {
      paymentId: paymentData.id,
      status: paymentData.status,
      hasMidtransOrderId: !!paymentData.midtransOrderId
    });

    try {
      const idrAmount = Math.round(paymentData.fiatAmount * 15000);
      console.log(`Creating/fetching QRIS for ${idrAmount} IDR...`);

      const response = await axios.post('/api/midtrans/create-qris', {
        paymentId: paymentData.id,
        amount: idrAmount
      });

      console.log('✅ QRIS response:', response.data);

      const qrData = response.data.data;

      if (qrData) {
        // ✅ Check if already paid
        if (qrData.isPaid || ['settlement', 'capture', 'success'].includes(qrData.status)) {
          console.log('✅ Payment already paid via QRIS');
          // Force status update locally
          setPayment(prev => prev ? { ...prev, status: 'PAID_FIAT' } : null);
          // ⛔ REMOVED: checkPaymentStatus(); -> Don't overwrite local success status with stale server data
          return;
        }

        // ✅ Support both qrCodeUrl and qrString (fallback)
        if (qrData.qrCodeUrl) {
          setQrData(qrData.qrCodeUrl);
          setQrString(null); // Clear qrString if URL is available
          console.log('✅ QR Code URL set:', qrData.qrCodeUrl);
        } else if (qrData.qrString) {
          // ✅ Use qr_string for QR code rendering
          setQrString(qrData.qrString);
          setQrData(null); // Clear URL since we're using string
          console.log('✅ QR String set for rendering:', qrData.qrString.substring(0, 50) + '...');
        } else {
          console.error('No QR code data in response:', qrData);
          setError('Failed to generate QR code - no QR data received');
        }

        // Log if this is an existing QR or new one
        if (qrData.isExisting) {
          console.log('ℹ️ Using existing QRIS transaction');
        } else {
          console.log('✨ Created new QRIS transaction');
        }
      } else {
        console.error('No data in response:', response.data);
        setError('Failed to generate QR code - invalid response format');
      }
    } catch (err: any) {
      console.error('❌ Error creating/fetching QRIS:', err);

      // ✅ Better error handling
      const errorResponse = err.response?.data;
      const errorMessage = errorResponse?.message || errorResponse?.error || err.message;

      // ✅ Handle specific error cases
      if (err.response?.status === 400) {
        if (errorResponse?.currentStatus) {
          setError(`Payment status is ${errorResponse.currentStatus}. Cannot create QRIS.`);
        } else {
          setError(`Invalid request: ${errorMessage}`);
        }
      } else if (err.response?.status === 401) {
        setError('Authentication failed with payment gateway. Please contact support.');
      } else {
        setError(`Failed to create QRIS payment: ${errorMessage}`);
      }
    }
  };

  const initializeTransak = async (paymentData: Payment) => {
    console.log('🌐 Building Transak iframe URL...');

    try {
      const apiKey = process.env.NEXT_PUBLIC_TRANSAK_API_KEY || '00f0b025-1bda-4986-a1ea-49f33e1722a1';

      const transakParams = new URLSearchParams({
        apiKey: apiKey,
        environment: 'STAGING',
        defaultCryptoCurrency: paymentData.cryptoCurrency,
        defaultFiatCurrency: paymentData.fiatCurrency,
        fiatCurrency: paymentData.fiatCurrency,
        defaultNetwork: paymentData.network,
        networks: 'ethereum,polygon,bsc,arbitrum,optimism',
        cryptoCurrencyList: 'USDT,USDC,ETH,BTC,MATIC,BNB',
        walletAddress: paymentData.receiverWallet,
        email: '[email protected]',
        themeColor: '667eea',
        hideMenu: 'false',
        productsAvailed: 'BUY',
        cryptoAmount: paymentData.cryptoAmount.toString(),
        fiatAmount: paymentData.fiatAmount.toString()
      });

      const transakUrl = `https://global-stg.transak.com?${transakParams.toString()}`;
      console.log('✅ Transak URL ready:', transakUrl);

      setQrData(transakUrl);
    } catch (err) {
      console.error('Error initializing Transak:', err);
    }
  };

  const checkPaymentStatus = async () => {
    try {
      const response = await axios.get(`/api/payments/${paymentId}`);
      const newData = response.data.data;
      const newStatus = newData.status;

      console.log('🔄 Polling status check:', {
        currentStatus: payment?.status,
        newStatus,
        paymentId
      });

      setPayment(prev => {
        if (!prev) {
          console.log('✅ Setting initial payment data');
          return newData;
        }

        // ✅ Prevent status downgrade (flashing issue)
        if (['PAID_FIAT', 'PROCESSING_CRYPTO', 'COMPLETED'].includes(prev.status)) {
          if (['PENDING', 'WAITING_PAYMENT'].includes(newStatus)) {
            console.log('🛡️ Preventing status downgrade from', prev.status, 'to', newStatus);
            return prev;
          }
        }

        // Update if status changed OR if we have new data (like txHash)
        if (prev.status !== newStatus || (newStatus === 'COMPLETED' && !prev.txHash && newData.txHash)) {
          console.log(`✅ Status updated: ${prev.status} → ${newStatus}`);
          return newData;
        }

        return prev;
      });
    } catch (err) {
      console.error('❌ Error checking status:', err);
    }
  };

  useEffect(() => {
    const handleTransakMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://global-stg.transak.com') return;

      console.log('📨 Transak message:', event.data);

      const eventId = event.data?.event_id;

      if (eventId === 'TRANSAK_ORDER_SUCCESSFUL') {
        console.log('✅ Order successful!');
        setPayment(prev => prev ? { ...prev, status: 'COMPLETED' } : null);
      }

      if (eventId === 'TRANSAK_ORDER_FAILED') {
        console.log('❌ Order failed');
        setPayment(prev => prev ? { ...prev, status: 'FAILED' } : null);
      }
    };

    window.addEventListener('message', handleTransakMessage);
    return () => window.removeEventListener('message', handleTransakMessage);
  }, []);

  // ==========================
  // Render
  // ==========================

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold text-red-600 mb-4">❌ Error</h2>
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    );
  }

  if (payment?.status === 'PAID_FIAT' || payment?.status === 'PROCESSING_CRYPTO') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Received!</h2>
          <p className="text-gray-700 mb-4">
            We have received your payment. Processing crypto transfer...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
        </div>
      </div>
    );
  }

  if (payment?.status === 'COMPLETED') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
          <p className="text-gray-700 mb-4">
            {payment.cryptoSent} {payment.cryptoCurrency} has been sent to your wallet
          </p>
          {payment.txHash && (
            <a
              href={`https://etherscan.io/tx/${payment.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-700 underline"
            >
              View Transaction →
            </a>
          )}
        </div>
      </div>
    );
  }

  // Normal Render
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Complete Your Payment</h2>

          {/* Payment Info */}
          <div className="space-y-4 mb-8">
            <div className="flex justify-between">
              <span className="text-gray-600">Amount:</span>
              <strong className="text-gray-900">{payment?.cryptoAmount} {payment?.cryptoCurrency}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Fiat Amount:</span>
              <strong className="text-gray-900">${payment?.fiatAmount.toFixed(2)} USD</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Network:</span>
              <strong className="text-gray-900">{payment?.network}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${payment?.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                payment?.status === 'WAITING_PAYMENT' ? 'bg-blue-100 text-blue-800' :
                  payment?.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                }`}>
                {payment?.status}
              </span>
            </div>
          </div>

          {/* QRIS UI */}
          {payment?.paymentMethod === 'QRIS' && (qrData || qrString) && (
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Scan QR Code with Indonesian E-Wallet</h3>
              <div className="flex justify-center mb-4">
                {qrData ? (
                  // ✅ Render QR code from URL
                  <img
                    src={qrData}
                    alt="QRIS Payment QR Code"
                    className="w-64 h-64 border-2 border-gray-200 rounded-lg"
                  />
                ) : qrString ? (
                  // ✅ Render QR code from string using QRCodeSVG
                  <div className="w-64 h-64 border-2 border-gray-200 rounded-lg p-4 bg-white flex items-center justify-center">
                    <QRCodeSVG
                      value={qrString}
                      size={256}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                ) : null}
              </div>
              <p className="text-gray-600">Scan with GoPay, OVO, Dana, or any QRIS-supported app</p>
            </div>
          )}

          {/* Transak UI */}
          {payment?.paymentMethod === 'TRANSAK' && qrData && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Complete Payment via Transak</h3>
              <iframe
                src={qrData}
                title="Transak Payment"
                className="w-full h-[700px] border-2 border-gray-200 rounded-lg"
                allow="camera;microphone;payment;clipboard-write"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
              />
            </div>
          )}

          {payment?.status === 'PENDING' && (
            <div className="mt-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Waiting for payment...</p>
            </div>
          )}

          {payment?.status === 'PROCESSING_CRYPTO' && (
            <div className="mt-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Processing crypto transfer...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
