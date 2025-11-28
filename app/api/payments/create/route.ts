import { NextRequest, NextResponse } from "next/server";
import paymentService from "@/lib/services/payment.service";
import logger from "@/lib/utils/logger";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { cryptoAmount, cryptoCurrency, receiverWallet, network } = body;

        // Required fields check
        if (
            cryptoAmount == null ||        // correct way to check missing
            !cryptoCurrency ||
            !receiverWallet
        ) {
            return NextResponse.json(
                {
                    error: "Missing required fields",
                    required: ["cryptoAmount", "cryptoCurrency", "receiverWallet"],
                },
                { status: 400 }
            );
        }


        // Proper numeric parsing
        const amount =
            typeof cryptoAmount === "number"
                ? cryptoAmount
                : parseFloat(cryptoAmount);

        if (isNaN(amount) || amount < 0.00001 || amount > 100) {
            return NextResponse.json(
                { error: "Invalid crypto amount. Must be between 0.00001 and 100" },
                { status: 400 }
            );
        }

        // Crypto whitelist
        const validCryptos = ["BTC", "ETH", "USDT", "USDC", "MATIC", "BNB"];
        if (!validCryptos.includes(cryptoCurrency)) {
            return NextResponse.json(
                { error: "Unsupported cryptocurrency", supported: validCryptos },
                { status: 400 }
            );
        }

        // Network whitelist
        const validNetworks = [
            "ethereum",
            "polygon",
            "bsc",
            "arbitrum",
            "optimism",
            "bitcoin",
        ];
        if (network && !validNetworks.includes(network)) {
            return NextResponse.json(
                { error: "Unsupported network", supported: validNetworks },
                { status: 400 }
            );
        }

        // Create payment request
        const paymentRequest = await paymentService.createPaymentRequest({
            cryptoAmount: amount,
            cryptoCurrency,
            receiverWallet,
            network: network || "ethereum",
        });

        logger.info("Payment request created", {
            id: paymentRequest.id,
            amount,
            currency: cryptoCurrency,
        });

        return NextResponse.json(
            {
                success: true,
                data: paymentRequest,
            },
            { status: 201 }
        );
    } catch (error: any) {
        logger.error("Failed to create payment request", { error: error.message });

        return NextResponse.json(
            {
                error: "Failed to create payment request",
                message: error.message,
            },
            { status: 500 }
        );
    }
}
