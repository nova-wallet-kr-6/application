"use client"
"use client";
import "@rainbow-me/rainbowkit/styles.css";
import {
    getDefaultConfig,
    RainbowKitProvider,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import {
    mainnet,
    polygon,
    optimism,
    arbitrum,
    base,
    liskSepolia,
} from "wagmi/chains";
import {
    QueryClientProvider,
    QueryClient,
} from "@tanstack/react-query";
import { WalletProvider } from "@/contexts/WalletContext";

const projectId =
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??
    process.env.WALLETCONNECT_PROJECT_ID;

if (!projectId) {
    throw new Error(
        "WalletConnect projectId belum diset. Tambahkan NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID di .env.",
    );
}

const config = getDefaultConfig({
    appName: "Nova Wallet",
    projectId,
    chains: [mainnet, polygon, optimism, arbitrum, base, liskSepolia],
    ssr: true,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider>
                    <WalletProvider>{children}</WalletProvider>
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}