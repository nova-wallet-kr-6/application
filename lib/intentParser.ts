export type Intent =
    | "GET_BALANCE"
    | "SEND"
    | "SWAP"
    | "CONSULT_SLIPPAGE"
    | "UNKNOWN";

export type ParsedIntent = {
    intent: Intent;
    confidence: number;
    entities: {
        amount?: number;
        token?: string;
        toAddress?: string;
        chainId?: number;
        chainName?: string;
        tradingPair?: string; // e.g., "BTC/USDT", "ETH/USDT"
    };
};

const DEFAULT_CHAIN_ID = 4202; // Lisk Sepolia default

const chainKeywords: Record<number, string[]> = {
    4202: ["lisk", "lisk sepolia", "sepolia"],
    1: ["ethereum", "mainnet", "eth"],
    137: ["polygon", "matic"],
    10: ["optimism", "op"],
    42161: ["arbitrum"],
    8453: ["base"],
};

const tokenKeywords: Record<string, string[]> = {
    ETH: ["eth", "ethereum"],
    MATIC: ["matic", "polygon"],
    USDT: ["usdt", "tether"],
    USDC: ["usdc", "circle"],
};

const ADDRESS_REGEX = /0x[a-fA-F0-9]{40}/;
// Improved regex to handle very small numbers and scientific notation
const AMOUNT_REGEX = /(\d+(?:\.\d+)?(?:e[+-]?\d+)?)/i;

const containsKeywords = (text: string, keywords: string[]) =>
    keywords.some((keyword) => text.includes(keyword));

const detectChain = (text: string): { chainId: number; chainName: string } => {
    const lowerText = text.toLowerCase();
    for (const [chainId, keywords] of Object.entries(chainKeywords)) {
        if (containsKeywords(lowerText, keywords)) {
            return { chainId: Number(chainId), chainName: keywords[0] };
        }
    }
    return { chainId: DEFAULT_CHAIN_ID, chainName: "Lisk Sepolia" };
};

const detectToken = (text: string): string | undefined => {
    const lowerText = text.toLowerCase();
    for (const [token, keywords] of Object.entries(tokenKeywords)) {
        if (containsKeywords(lowerText, keywords)) {
            return token;
        }
    }
    return undefined;
};

export const parseIntent = (message: string): ParsedIntent => {
    const lowerMessage = message.toLowerCase();

    const toAddress = message.match(ADDRESS_REGEX)?.[0];

    // Improved amount extraction - find all number patterns and take the most specific one
    // Exclude numbers that are part of addresses (0x...)
    const addressPattern = /0x[a-fA-F0-9]{40}/;
    const messageWithoutAddress = addressPattern.test(message)
        ? message.replace(addressPattern, '')
        : message;

    const amountMatches = messageWithoutAddress.match(/(\d+(?:\.\d+)?(?:e[+-]?\d+)?)/gi);
    let amount: number | undefined = undefined;

    if (amountMatches && amountMatches.length > 0) {
        // Try to find the most relevant amount (usually the one with more decimal places or explicit mention)
        // For very small numbers, prefer the one with more precision
        const amounts = amountMatches.map(m => {
            try {
                const num = Number(m);
                // Exclude 0 and very large numbers (likely chain IDs or other context)
                if (num === 0 || num > 1000000) return null;
                return num;
            } catch {
                return null;
            }
        }).filter((n): n is number => n !== null && !isNaN(n));

        if (amounts.length > 0) {
            // If there are multiple numbers, prefer the one that's mentioned with token symbol
            const withToken = lowerMessage.match(/(\d+(?:\.\d+)?(?:e[+-]?\d+)?)\s*(?:eth|lsk|usdt|usdc|matic|bnb)/i);
            if (withToken) {
                const tokenAmount = Number(withToken[1]);
                if (tokenAmount > 0 && tokenAmount <= 1000000) {
                    amount = tokenAmount;
                }
            } else {
                // Take the first valid number that's reasonable (not too large, not 0)
                amount = amounts[0];
            }
        }
    }

    const token = detectToken(message);
    const { chainId, chainName } = detectChain(message);

    let intent: Intent = "UNKNOWN";
    let confidence = 0.3;

    // PRIORITAS: Check CONSULT_SLIPPAGE SEBELUM SEND untuk menghindari false positive
    // Keywords untuk konsultasi slippage/exchange
    const consultKeywords = [
        /slippage/i,
        /bandingkan.*exchange/i,
        /compare.*exchange/i,
        /mana.*exchange/i,
        /exchange.*mana/i,
        /exchange.*apa/i,
        /mana.*terbaik/i,
        /terbaik.*exchange/i,
        /prediksi.*biaya/i,
        /hitung.*biaya/i,
        /konsultasi/i,
        /mending.*beli/i,
        /mending.*jual/i,
        /mending.*di.*exchange/i,
        /mending.*exchange/i,
        /mana.*yang.*lebih/i,
        /mana.*lebih.*murah/i,
        /rekomendasi.*exchange/i,
        /di.*exchange.*mana/i,
        /di.*exchange.*apa/i,
    ];

    // Check if message contains trading pair format (BASE/QUOTE) - likely CONSULT_SLIPPAGE follow-up
    const tradingPairPattern = /([A-Z]{2,10}\/[A-Z]{2,10})/;
    const tradingPairMatch = message.match(tradingPairPattern);
    const tradingPair = tradingPairMatch ? tradingPairMatch[1] : undefined;
    const hasTradingPair = !!tradingPair;

    if (/saldo|balance|cek saldo|berapa/i.test(lowerMessage)) {
        intent = "GET_BALANCE";
        confidence = 0.95;
    } else if (consultKeywords.some(regex => regex.test(lowerMessage)) || hasTradingPair) {
        // Consult slippage intent - PRIORITAS TINGGI untuk menghindari false positive dengan SEND
        // Also detect trading pair format (BASE/QUOTE) as CONSULT_SLIPPAGE follow-up
        intent = "CONSULT_SLIPPAGE";
        confidence = hasTradingPair ? 0.8 : 0.9; // Slightly lower confidence for trading pair only
    } else if (/kirim|send|transfer|tf/i.test(lowerMessage)) {
        intent = "SEND";
        confidence = 0.9;
    } else if (toAddress && amount) {
        // Implicit SEND intent: if message contains amount and address
        intent = "SEND";
        confidence = 0.8;
    } else if (toAddress && /kesini|ke\s+(?:sini|address|wallet|alamat)/i.test(lowerMessage)) {
        // If message contains address with direction words (kesini, ke address, etc), likely SEND intent
        intent = "SEND";
        confidence = 0.7;
    } else if (/swap|tukar|convert/i.test(lowerMessage)) {
        intent = "SWAP";
        confidence = 0.7;
    } else if (/yakin|ya|ok|oke|setuju|konfirmasi|lakukan|execute|proses|lanjut/i.test(lowerMessage)) {
        // Confirmation keywords - might be confirming a previous SEND intent
        // This helps with multi-turn conversation where user confirms after providing details
        intent = "SEND";
        confidence = 0.6; // Lower confidence, but will be combined with accumulated entities
    }

    return {
        intent,
        confidence,
        entities: {
            amount,
            token,
            toAddress,
            chainId,
            chainName,
            tradingPair,
        },
    };
};

