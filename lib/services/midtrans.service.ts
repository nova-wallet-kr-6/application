import axios from 'axios';
import crypto from 'crypto';
import logger from '../utils/logger';

interface QRISParams {
  orderId: string;
  amount: number;
  customerDetails?: {
    firstName?: string;
    email?: string;
    phone?: string;
  };
}

class MidtransService {
  private serverKey: string;
  private clientKey: string;
  private isProduction: boolean;
  private baseUrl: string;
  private snapUrl: string;
  private authHeader: string;

  constructor() {
    this.serverKey = process.env.MIDTRANS_SERVER_KEY || '';
    this.clientKey = process.env.MIDTRANS_CLIENT_KEY || '';
    this.isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';

    this.baseUrl = this.isProduction
      ? 'https://api.midtrans.com'
      : 'https://api.sandbox.midtrans.com';

    this.snapUrl = this.isProduction
      ? 'https://app.midtrans.com'
      : 'https://app.sandbox.midtrans.com';

    this.authHeader = Buffer.from(this.serverKey + ':').toString('base64');
  }

  async createQRIS({ orderId, amount, customerDetails = {} }: QRISParams) {
    try {
      const payload = {
        payment_type: 'qris',
        transaction_details: {
          order_id: orderId,
          gross_amount: Math.round(amount)
        },
        qris: {
          acquirer: 'gopay'
        },
        customer_details: {
          first_name: customerDetails.firstName || 'Customer',
          email: customerDetails.email || '[email protected]',
          phone: customerDetails.phone || '+62123456789'
        }
      };

      logger.info('Creating Midtrans QRIS', { orderId, amount });

      const response = await axios.post(
        `${this.baseUrl}/v2/charge`,
        payload,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Basic ${this.authHeader}`
          },
          timeout: 30000
        }
      );

      const data = response.data;
      const qrAction = data.actions?.find((action: any) => action.name === 'generate-qr-code');

      if (!qrAction) {
        throw new Error('QR code URL not found in Midtrans response');
      }

      logger.info('Midtrans QRIS created successfully', {
        orderId,
        transactionId: data.transaction_id,
        status: data.transaction_status
      });

      return {
        transactionId: data.transaction_id,
        orderId: data.order_id,
        qrCodeUrl: qrAction.url,
        qrCodeString: data.qr_string,
        status: data.transaction_status,
        expiryTime: data.expiry_time,
        grossAmount: data.gross_amount
      };
    } catch (error: any) {
      logger.error('Failed to create Midtrans QRIS', {
        orderId,
        error: error.message,
        response: error.response?.data
      });

      if (error.response?.status === 401) {
        throw new Error('Midtrans authentication failed - check server key');
      }
      if (error.response?.status === 400) {
        throw new Error(`Midtrans validation error: ${error.response.data.status_message}`);
      }

      throw new Error(`Midtrans QRIS creation failed: ${error.message}`);
    }
  }

  async getTransactionStatus(orderId: string) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/v2/${orderId}/status`,
        {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Basic ${this.authHeader}`
          }
        }
      );

      return response.data;
    } catch (error: any) {
      logger.error('Failed to get transaction status', {
        orderId,
        error: error.message
      });
      throw error;
    }
  }

  async cancelTransaction(orderId: string) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v2/${orderId}/cancel`,
        {},
        {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Basic ${this.authHeader}`
          }
        }
      );

      logger.info('Transaction cancelled', { orderId });
      return response.data;
    } catch (error: any) {
      logger.error('Failed to cancel transaction', {
        orderId,
        error: error.message
      });
      throw error;
    }
  }

  verifySignature(notification: any) {
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key
    } = notification;

    const signatureString = order_id + status_code + gross_amount + this.serverKey;
    const hash = crypto
      .createHash('sha512')
      .update(signatureString)
      .digest('hex');

    const isValid = hash === signature_key;

    if (!isValid) {
      logger.error('Invalid Midtrans signature', {
        orderId: order_id,
        expected: hash.substring(0, 10) + '...',
        received: signature_key?.substring(0, 10) + '...'
      });
    }

    return isValid;
  }

  parseWebhookNotification(notification: any) {
    return {
      orderId: notification.order_id,
      transactionId: notification.transaction_id,
      transactionStatus: notification.transaction_status,
      transactionTime: notification.transaction_time,
      fraudStatus: notification.fraud_status,
      grossAmount: parseFloat(notification.gross_amount),
      paymentType: notification.payment_type,
      statusCode: notification.status_code,
      signatureKey: notification.signature_key
    };
  }

  isTransactionSuccessful(transactionStatus: string, fraudStatus = 'accept') {
    const successStatuses = ['capture', 'settlement'];
    return successStatuses.includes(transactionStatus) && fraudStatus === 'accept';
  }

  isTransactionFailed(transactionStatus: string) {
    const failedStatuses = ['deny', 'cancel', 'expire', 'failure'];
    return failedStatuses.includes(transactionStatus);
  }

  isTransactionPending(transactionStatus: string) {
    return transactionStatus === 'pending';
  }
}

export default new MidtransService();