import { NextRequest, NextResponse } from 'next/server';
import paymentService from '@/lib/services/payment.service';
import transakService from '@/lib/services/transak.service';
import logger from '@/lib/utils/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const { paymentId } = params;

    const payment = await paymentService.getPaymentDetails(paymentId);

    if (payment.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Payment already processed or expired' },
        { status: 400 }
      );
    }

    const widgetConfig = transakService.generateWidgetConfig({
      cryptoCurrency: payment.cryptoCurrency,
      cryptoAmount: payment.cryptoAmount,
      fiatCurrency: payment.fiatCurrency,
      fiatAmount: payment.fiatAmount,
      walletAddress: payment.receiverWallet,
      network: payment.network,
      partnerOrderId: payment.id
    });

    return NextResponse.json({
      success: true,
      data: widgetConfig
    });

  } catch (error: any) {
    logger.error('Failed to get Transak config', {
      paymentId: params.paymentId,
      error: error.message
    });

    return NextResponse.json(
      {
        error: 'Failed to get widget configuration',
        message: error.message
      },
      { status: 500 }
    );
  }
}