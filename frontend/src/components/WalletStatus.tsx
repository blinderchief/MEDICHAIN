"use client";

import { useAccount, useBalance, useDisconnect, useEnsName } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import {
  Wallet,
  ExternalLink,
  Copy,
  Check,
  LogOut,
  ChevronDown,
  Shield,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface WalletStatusProps {
  showBalance?: boolean;
  compact?: boolean;
}

export function WalletStatus({ showBalance = true, compact = false }: WalletStatusProps) {
  const { address, isConnected, isConnecting, chain } = useAccount();
  const { data: ensName } = useEnsName({ address });
  const { data: balance } = useBalance({ address });
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  
  const [copied, setCopied] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (bal: typeof balance) => {
    if (!bal) return "0";
    return parseFloat(bal.formatted).toFixed(4);
  };

  const getExplorerUrl = () => {
    if (!chain || !address) return "#";
    const explorers: Record<number, string> = {
      1: "https://etherscan.io",
      8453: "https://basescan.org",
      84532: "https://sepolia.basescan.org",
      42161: "https://arbiscan.io",
      421614: "https://sepolia.arbiscan.io",
    };
    const baseUrl = explorers[chain.id] || "https://etherscan.io";
    return `${baseUrl}/address/${address}`;
  };

  // Not connected state
  if (!isConnected) {
    return (
      <Button
        onClick={() => openConnectModal?.()}
        disabled={isConnecting}
        variant="outline"
        className={`${
          compact ? "px-3 py-1.5" : "px-4 py-2"
        } border-cyan-200 text-cyan-700 hover:bg-cyan-50`}
      >
        {isConnecting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Wallet className="w-4 h-4 mr-2" />
            Connect Wallet
          </>
        )}
      </Button>
    );
  }

  // Compact version
  if (compact) {
    return (
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 hover:border-cyan-300 transition-colors"
        >
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-medium text-gray-900">
            {ensName || formatAddress(address!)}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {isMenuOpen && (
          <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white shadow-lg border border-gray-200 overflow-hidden z-50">
            <div className="p-4 bg-gradient-to-r from-cyan-50 to-blue-50 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {ensName || "Wallet Connected"}
                  </p>
                  <p className="text-xs text-gray-500">{chain?.name}</p>
                </div>
              </div>
            </div>

            <div className="p-3 space-y-2">
              {showBalance && balance && (
                <div className="p-2 rounded-lg bg-gray-50 flex items-center justify-between">
                  <span className="text-sm text-gray-500">Balance</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatBalance(balance)} {balance.symbol}
                  </span>
                </div>
              )}

              <button
                onClick={copyAddress}
                className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-sm text-gray-700">
                  {copied ? "Copied!" : formatAddress(address!)}
                </span>
              </button>

              <a
                href={getExplorerUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700">View on Explorer</span>
              </a>

              <button
                onClick={() => {
                  disconnect();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Disconnect</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full version
  return (
    <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              {ensName || "Connected Wallet"}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-gray-500">{chain?.name}</span>
            </div>
          </div>
        </div>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <Shield className="w-3 h-3 mr-1" />
          Verified
        </Badge>
      </div>

      {/* Address */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-white/50 mb-3">
        <span className="text-sm font-mono text-gray-700 flex-1 truncate">
          {address}
        </span>
        <button
          onClick={copyAddress}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4 text-gray-400" />
          )}
        </button>
      </div>

      {/* Balance */}
      {showBalance && balance && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-white/50 mb-3">
          <span className="text-sm text-gray-500">Balance</span>
          <span className="text-lg font-semibold text-gray-900">
            {formatBalance(balance)} {balance.symbol}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <a
          href={getExplorerUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1"
        >
          <Button variant="outline" size="sm" className="w-full">
            <ExternalLink className="w-4 h-4 mr-1" />
            Explorer
          </Button>
        </a>
        <Button
          variant="outline"
          size="sm"
          onClick={() => disconnect()}
          className="flex-1 text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="w-4 h-4 mr-1" />
          Disconnect
        </Button>
      </div>
    </div>
  );
}
