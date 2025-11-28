import { NextRequest, NextResponse } from 'next/server';
import paymentService from '@/lib/services/payment.service';
import midtransService from '@/lib/services/midtrans.service';
import logger from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentId, amount } = body;

    if (!paymentId || !amount) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['paymentId', 'amount']
        },
        { status: 400 }
      );
    }

    // Verify payment exists and is valid
    const payment = await paymentService.getPaymentDetails(paymentId);

    if (payment.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Payment already processed or expired' },
        { status: 400 }
      );
    }

    // Create QRIS via Midtrans
    const qrisData = await midtransService.createQRIS({
      orderId: paymentId,
      amount: amount,
      customerDetails: {
        email: `payment-${paymentId}@temp.com`
      }
    });

    // Update payment with Midtrans order ID
    await paymentService.updatePaymentStatus(paymentId, 'WAITING_PAYMENT', {
      midtransOrderId: qrisData.orderId,
      midtransTransactionId: qrisData.transactionId
    });

    logger.info('QRIS created', {
      paymentId,
      transactionId: qrisData.transactionId
    });

    return NextResponse.json({
      success: true,
      data: {
        qrCodeUrl: qrisData.qrCodeUrl,
        transactionId: qrisData.transactionId,
        expiryTime: qrisData.expiryTime,
        amount: qrisData.grossAmount
      }
    });

  } catch (error: any) {
    logger.error('Failed to create QRIS', {
      error: error.message
    });

    return NextResponse.json(
      {
        error: 'Failed to create QRIS',
        message: error.message
      },
      { status: 500 }
    );
  }
}