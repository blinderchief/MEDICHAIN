"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { baseSepolia, base, hardhat } from "wagmi/chains";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo";

// Supported chains
const chains = [baseSepolia, base, hardhat] as const;

// Create wagmi config using RainbowKit
export const wagmiConfig = getDefaultConfig({
  appName: "MediChain",
  projectId,
  chains,
  transports: {
    [baseSepolia.id]: http(),
    [base.id]: http(),
    [hardhat.id]: http("http://localhost:8545"),
  },
  ssr: true,
});
