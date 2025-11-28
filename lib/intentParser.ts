export type Intent =
  | "GET_BALANCE"
  | "SEND"
  | "SWAP"
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
const AMOUNT_REGEX = /(\d+(\.\d+)?)/;

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
  const amountMatch = message.match(AMOUNT_REGEX)?.[0];
  const amount = amountMatch ? Number(amountMatch) : undefined;
  const token = detectToken(message);
  const { chainId, chainName } = detectChain(message);

  let intent: Intent = "UNKNOWN";
  let confidence = 0.3;

  if (/saldo|balance|cek saldo|berapa/i.test(lowerMessage)) {
    intent = "GET_BALANCE";
    confidence = 0.95;
  } else if (/kirim|send|transfer/i.test(lowerMessage)) {
    intent = "SEND";
    confidence = 0.9;
  } else if (/swap|tukar|convert/i.test(lowerMessage)) {
    intent = "SWAP";
    confidence = 0.7;
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
    },
  };
};

