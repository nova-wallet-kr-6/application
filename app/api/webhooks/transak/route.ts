import { NextRequest, NextResponse } from 'next/server';
import paymentService from '@/lib/services/payment.service';
import transakService from '@/lib/services/transak.service';
import logger from '@/lib/utils/logger';
import prisma from '@/lib/config/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const decryptedData = transakService.decryptWebhook(body);
    const webhook = decryptedData;

    await prisma.webhookLog.create({
      data: {
        source: 'transak',
        eventType: webhook.eventName,
        orderId: webhook.data?.id,
        payload: webhook,
        signature: request.headers.get('x-transak-signature') || undefined
      }
    });

    const { eventName, data } = webhook;

    logger.info('Transak webhook received', {
      event: eventName,
      orderId: data?.id,
      status: data?.status
    });

    switch (eventName) {
      case 'ORDER_COMPLETED':
        await paymentService.handleTransakSuccess(data.id, {
          partnerOrderId: data.partnerOrderId,
          cryptoAmount: data.cryptoAmount,
          transactionHash: data.transactionHash,
          walletAddress: data.walletAddress
        });
        break;

      case 'ORDER_FAILED':
        await paymentService.updatePaymentStatus(data.partnerOrderId, 'FAILED', {
          transakOrderId: data.id,
          errorMessage: data.statusReason || 'Transak order failed'
        });
        break;

      case 'ORDER_PROCESSING':
        await paymentService.updatePaymentStatus(data.partnerOrderId, 'PROCESSING_CRYPTO', {
          transakOrderId: data.id
        });
        break;
    }

    return NextResponse.json({ status: 'OK' });

  } catch (error: any) {
    logger.error('Transak webhook error', error);
    return NextResponse.json({ status: 'ERROR' });
  }
}