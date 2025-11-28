import prisma from '../config/database';
import transakService from './transak.service';
import logger from '../utils/logger';

interface CreatePaymentParams {
  cryptoAmount: number;
  cryptoCurrency: string;
  receiverWallet: string;
  network?: string;
}

class PaymentService {
  async createPaymentRequest(data: CreatePaymentParams) {
    const { cryptoAmount, cryptoCurrency, receiverWallet, network = 'ethereum' } = data;

    try {
      const quote = await transakService.getQuote({
        cryptoAmount,
        cryptoCurrency,
        fiatCurrency: 'USD',
        network,
        isBuyOrSell: 'BUY'
      });

      const paymentRequest = await prisma.paymentRequest.create({
        data: {
          cryptoAmount: parseFloat(cryptoAmount.toString()),
          cryptoCurrency,
          fiatAmount: quote.fiatAmount,
          fiatCurrency: 'USD',
          receiverWallet,
          network,
          status: 'PENDING',
          quoteId: quote.quoteId,
          conversionRate: quote.conversionPrice,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000)
        }
      });

      const paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pay/${paymentRequest.id}`;

      logger.info('Payment request created', {
        id: paymentRequest.id,
        amount: cryptoAmount,
        currency: cryptoCurrency
      });

      return {
        id: paymentRequest.id,
        paymentUrl,
        qrCodeData: paymentUrl,
        expiresAt: paymentRequest.expiresAt,
        quote: {
          cryptoAmount: quote.cryptoAmount,
          fiatAmount: quote.fiatAmount,
          fiatCurrency: 'USD'
        }
      };
    } catch (error: any) {
      logger.error('Failed to create payment request', error);
      throw new Error('Failed to create payment request: ' + error.message);
    }
  }

  async getPaymentDetails(paymentId: string, userCountry = 'US') {
    const payment = await prisma.paymentRequest.findUnique({
      where: { id: paymentId }
    });

    if (!payment) {
      throw new Error('Payment request not found');
    }

    if (new Date() > payment.expiresAt) {
      await this.updatePaymentStatus(paymentId, 'EXPIRED');
      throw new Error('Payment request expired');
    }

    const isIndonesian = userCountry === 'ID';

    return {
      ...payment,
      paymentMethod: isIndonesian ? 'QRIS' : 'TRANSAK',
      userCountry
    };
  }

  async updatePaymentStatus(paymentId: string, status: string, metadata: any = {}) {
    try {
      return await prisma.paymentRequest.update({
        where: { id: paymentId },
        data: {
          status: status as any,
          ...metadata,
          updatedAt: new Date()
        }
      });
    } catch (error: any) {
      logger.error('Failed to update payment status', { paymentId, status, error: error.message });
      throw error;
    }
  }

  async handleMidtransSuccess(orderId: string, transactionData: any) {
    const payment = await prisma.paymentRequest.findUnique({
      where: { midtransOrderId: orderId }
    });

    if (!payment) {
      throw new Error('Payment not found for Midtrans order');
    }

    logger.info('💰 Midtrans payment successful', {
      paymentId: payment.id,
      orderId,
      transactionId: transactionData.transaction_id
    });

    await this.updatePaymentStatus(payment.id, 'COMPLETED', {
      midtransTransactionId: transactionData.transaction_id,
      midtransPaidAt: new Date(transactionData.transaction_time),
      errorMessage: null
    });

    logger.info('✅ Payment completed successfully', {
      paymentId: payment.id,
      status: 'COMPLETED'
    });
  }

  async handleTransakSuccess(orderId: string, transactionData: any) {
    const payment = await prisma.paymentRequest.findFirst({
      where: {
        OR: [
          { transakOrderId: orderId },
          { id: transactionData.partnerOrderId }
        ]
      }
    });

    if (!payment) {
      throw new Error('Payment not found for Transak order');
    }

    await this.updatePaymentStatus(payment.id, 'COMPLETED', {
      cryptoSent: transactionData.cryptoAmount,
      transakCompletedAt: new Date(),
      txHash: transactionData.transactionHash
    });

    logger.info('Payment completed', {
      paymentId: payment.id,
      cryptoSent: transactionData.cryptoAmount
    });
  }
}

export default new PaymentService();