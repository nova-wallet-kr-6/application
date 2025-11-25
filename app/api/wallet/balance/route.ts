import { NextResponse } from "next/server";
import {
  createPublicClient,
  formatEther,
  http,
  isAddress,
  type Hex,
} from "viem";
import type { Chain } from "viem/chains";
import { liskSepolia } from "viem/chains";

type BalanceRequestBody = {
  address: Hex;
  chainId: number;
};

const chainMap: Record<number, Chain> = {
  [liskSepolia.id]: liskSepolia,
};

const rpcOverride: Record<number, string | undefined> = {
  [liskSepolia.id]:
    process.env.NEXT_PUBLIC_LISK_SEPOLIA_RPC ??
    process.env.LISK_SEPOLIA_RPC ??
    "https://rpc.ankr.com/lisk_sepolia",
};

const getChain = (chainId: number) => chainMap[chainId];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<BalanceRequestBody>;

    if (!body?.address || !isAddress(body.address)) {
      return NextResponse.json(
        { error: "Alamat wallet tidak valid." },
        { status: 400 },
      );
    }

    if (typeof body.chainId !== "number") {
      return NextResponse.json(
        { error: "chainId wajib berupa angka." },
        { status: 400 },
      );
    }

    const chain = getChain(body.chainId);

    if (!chain) {
      return NextResponse.json(
        { error: `Chain ${body.chainId} belum didukung.` },
        { status: 400 },
      );
    }

    // Gunakan RPC override kalau ada, kalau tidak pakai default dari chain
    const rpcUrl = rpcOverride[chain.id];

    const client = createPublicClient({
      chain,
      transport: rpcUrl ? http(rpcUrl) : http(), // Biarkan viem pilih default
    });

    const balanceWei = await client.getBalance({
      address: body.address,
    });

    const balanceEth = formatEther(balanceWei);

    return NextResponse.json({
      address: body.address,
      chainId: chain.id,
      formattedChainName: chain.name,
      balanceWei: balanceWei.toString(),
      balanceEth,
    });
  } catch (error) {
    console.error("[wallet/balance] error", error);
    return NextResponse.json(
      {
        error: "Terjadi kesalahan saat mengambil saldo.",
      },
      { status: 500 },
    );
  }
}


