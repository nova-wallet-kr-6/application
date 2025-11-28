import { NextRequest, NextResponse } from 'next/server';
import paymentService from '@/lib/services/payment.service';
import midtransService from '@/lib/services/midtrans.service';
import logger from '@/lib/utils/logger';
import prisma from '@/lib/config/database';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const notification = JSON.parse(body);

    logger.info('Midtrans webhook received', {
      orderId: notification.order_id,
      transactionStatus: notification.transaction_status,
      transactionId: notification.transaction_id
    });

    // Log webhook to database
    try {
      await prisma.webhookLog.create({
        data: {
          source: 'midtrans',
          eventType: notification.transaction_status || 'unknown',
          orderId: notification.order_id || null,
          payload: notification,
          signature: notification.signature_key || null,
          verified: false,
          processed: false
        }
      });
    } catch (logError: any) {
      logger.warn('Failed to log webhook', { error: logError.message });
    }

    // Verify signature
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const isValid = isDevelopment ? true : verifyMidtransSignature(notification);

    if (!isValid) {
      logger.error('Invalid Midtrans signature', {
        orderId: notification.order_id
      });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    if (isDevelopment) {
      logger.warn('⚠️ DEV MODE: Signature verification bypassed for testing');
    }

    // Update webhook log as verified
    try {
      await prisma.webhookLog.updateMany({
        where: {
          source: 'midtrans',
          orderId: notification.order_id,
          verified: false
        },
        data: { verified: true }
      });
    } catch (updateError: any) {
      logger.warn('Failed to update webhook log', { error: updateError.message });
    }

    const {
      order_id,
      transaction_status,
      fraud_status,
      transaction_id,
      transaction_time,
      gross_amount
    } = notification;

    logger.info('Processing Midtrans notification', {
      orderId: order_id,
      status: transaction_status,
      fraudStatus: fraud_status
    });

    // Handle payment status
    if (transaction_status === 'settlement' || transaction_status === 'capture') {
      if (!fraud_status || fraud_status === 'accept') {
        logger.info(`✅ Payment successful: ${order_id}`);

        await paymentService.handleMidtransSuccess(order_id, {
          transaction_id,
          transaction_time,
          gross_amount
        });

        await prisma.webhookLog.updateMany({
          where: { source: 'midtrans', orderId: order_id },
          data: { processed: true }
        });
      } else {
        logger.warn(`⚠️ Fraud detected: ${order_id}`);
        await paymentService.updatePaymentStatus(order_id, 'FAILED', {
          errorMessage: `Fraud: ${fraud_status}`
        });
      }
    } else if (transaction_status === 'pending') {
      logger.info(`⏳ Payment pending: ${order_id}`);
      await paymentService.updatePaymentStatus(order_id, 'WAITING_PAYMENT', {});

    } else if (['deny', 'cancel', 'expire'].includes(transaction_status)) {
      logger.info(`❌ Payment ${transaction_status}: ${order_id}`);
      await paymentService.updatePaymentStatus(order_id, 'FAILED', {
        errorMessage: `Midtrans: ${transaction_status}`
      });
    }

    return NextResponse.json({ status: 'OK' });

  } catch (error: any) {
    logger.error('Midtrans webhook error', {
      error: error.message,
      stack: error.stack
    });

    return NextResponse.json({ status: 'ERROR' });
  }
}

function verifyMidtransSignature(notification: any) {
  try {
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key
    } = notification;

    if (!order_id || !status_code || !gross_amount || !signature_key) {
      logger.warn('Missing signature fields');
      return false;
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
      logger.error('MIDTRANS_SERVER_KEY not configured!');
      return false;
    }

    const signatureString = order_id + status_code + gross_amount + serverKey;
    const hash = crypto
      .createHash('sha512')
      .update(signatureString)
      .digest('hex');

    return hash === signature_key;

  } catch (error: any) {
    logger.error('Signature verification error', { error: error.message });
    return false;
  }
}