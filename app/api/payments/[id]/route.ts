import { NextRequest, NextResponse } from "next/server";
import paymentService from "@/lib/services/payment.service";
import logger from "@/lib/utils/logger";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Validate UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: "Invalid payment ID format" },
        { status: 400 }
      );
    }

    // Extract user IP
    const userIp =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "0.0.0.0";

    const userCountry = "ID";

    // Fetch payment details
    const payment = await paymentService.getPaymentDetails(id, userCountry);

    // Update status
    await paymentService.updatePaymentStatus(id, payment.status, {
      userIp,
      userCountry,
    });

    logger.info("Payment details retrieved", {
      id,
      userCountry,
      paymentMethod: payment.paymentMethod,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: payment.id,
        cryptoAmount: payment.cryptoAmount,
        cryptoCurrency: payment.cryptoCurrency,
        fiatAmount: payment.fiatAmount,
        fiatCurrency: payment.fiatCurrency,
        receiverWallet: payment.receiverWallet,
        network: payment.network,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        userCountry: payment.userCountry,
        expiresAt: payment.expiresAt,
        createdAt: payment.createdAt,
      },
    });
  } catch (error: any) {
    logger.error("Failed to get payment details", {
      error: error.message,
    });

    if (error.message === "Payment request not found") {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }
    if (error.message === "Payment request expired") {
      return NextResponse.json({ error: "Payment expired" }, { status: 410 });
    }

    return NextResponse.json(
      {
        error: "Failed to retrieve payment",
        message: error.message,
      },
      { status: 500 }
    );
  }
}
