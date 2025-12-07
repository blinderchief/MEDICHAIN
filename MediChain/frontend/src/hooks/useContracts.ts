"use client";

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useCallback, useState } from "react";
import { parseAbiItem, type Address } from "viem";

// Contract ABIs (simplified - full ABIs should be imported from generated artifacts)
const CONSENT_REGISTRY_ABI = [
  {
    name: "recordConsent",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "patientId", type: "bytes32" },
      { name: "trialId", type: "bytes32" },
      { name: "consentHash", type: "bytes32" },
      { name: "documentHashes", type: "bytes32[]" },
    ],
    outputs: [{ name: "consentId", type: "uint256" }],
  },
  {
    name: "revokeConsent",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "consentId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "getConsent",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "consentId", type: "uint256" }],
    outputs: [
      {
        name: "consent",
        type: "tuple",
        components: [
          { name: "patientId", type: "bytes32" },
          { name: "trialId", type: "bytes32" },
          { name: "consentHash", type: "bytes32" },
          { name: "timestamp", type: "uint256" },
          { name: "isRevoked", type: "bool" },
          { name: "revokedAt", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "verifyConsent",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "patientId", type: "bytes32" },
      { name: "trialId", type: "bytes32" },
    ],
    outputs: [{ name: "isValid", type: "bool" }],
  },
  {
    name: "getPatientConsents",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "patientId", type: "bytes32" }],
    outputs: [{ name: "consentIds", type: "uint256[]" }],
  },
] as const;

const TRIAL_REGISTRY_ABI = [
  {
    name: "registerTrial",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "trialId", type: "bytes32" },
      { name: "metadataHash", type: "bytes32" },
      { name: "sponsor", type: "address" },
      { name: "targetEnrollment", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "updateEnrollment",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "trialId", type: "bytes32" },
      { name: "newCount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "getTrial",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "trialId", type: "bytes32" }],
    outputs: [
      {
        name: "trial",
        type: "tuple",
        components: [
          { name: "metadataHash", type: "bytes32" },
          { name: "sponsor", type: "address" },
          { name: "targetEnrollment", type: "uint256" },
          { name: "currentEnrollment", type: "uint256" },
          { name: "isActive", type: "bool" },
          { name: "registeredAt", type: "uint256" },
        ],
      },
    ],
  },
] as const;

// Contract addresses (from environment)
const CONSENT_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_CONSENT_REGISTRY_ADDRESS as Address;
const TRIAL_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_TRIAL_REGISTRY_ADDRESS as Address;

// Types
interface ConsentData {
  patientId: `0x${string}`;
  trialId: `0x${string}`;
  consentHash: `0x${string}`;
  documentHashes: `0x${string}`[];
}

interface TrialData {
  trialId: `0x${string}`;
  metadataHash: `0x${string}`;
  sponsor: Address;
  targetEnrollment: bigint;
}

interface TransactionStatus {
  status: "idle" | "pending" | "confirming" | "success" | "error";
  hash?: `0x${string}`;
  error?: Error;
}

// Helper functions
function stringToBytes32(str: string): `0x${string}` {
  const hex = Buffer.from(str).toString("hex").padEnd(64, "0");
  return `0x${hex}` as `0x${string}`;
}

function hashData(data: string): `0x${string}` {
  // Simple hash - in production, use proper keccak256
  const hash = Array.from(data)
    .reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0)
    .toString(16)
    .padStart(64, "0");
  return `0x${hash}` as `0x${string}`;
}

// Main hook
export function useContracts() {
  const { address, isConnected } = useAccount();
  const [txStatus, setTxStatus] = useState<TransactionStatus>({ status: "idle" });

  // Contract write hooks
  const { writeContractAsync: writeConsent } = useWriteContract();
  const { writeContractAsync: writeTrial } = useWriteContract();

  // Record consent on blockchain
  const recordConsent = useCallback(
    async (data: {
      patientId: string;
      trialId: string;
      consentData: string;
      documentIds: string[];
    }) => {
      if (!isConnected || !address) {
        throw new Error("Wallet not connected");
      }

      setTxStatus({ status: "pending" });

      try {
        const consentPayload: ConsentData = {
          patientId: stringToBytes32(data.patientId),
          trialId: stringToBytes32(data.trialId),
          consentHash: hashData(data.consentData),
          documentHashes: data.documentIds.map((id) => stringToBytes32(id)),
        };

        const hash = await writeConsent({
          address: CONSENT_REGISTRY_ADDRESS,
          abi: CONSENT_REGISTRY_ABI,
          functionName: "recordConsent",
          args: [
            consentPayload.patientId,
            consentPayload.trialId,
            consentPayload.consentHash,
            consentPayload.documentHashes,
          ],
        });

        setTxStatus({ status: "confirming", hash });

        // Wait for confirmation would be handled separately
        return hash;
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Transaction failed");
        setTxStatus({ status: "error", error: err });
        throw err;
      }
    },
    [isConnected, address, writeConsent]
  );

  // Revoke consent
  const revokeConsent = useCallback(
    async (consentId: bigint) => {
      if (!isConnected || !address) {
        throw new Error("Wallet not connected");
      }

      setTxStatus({ status: "pending" });

      try {
        const hash = await writeConsent({
          address: CONSENT_REGISTRY_ADDRESS,
          abi: CONSENT_REGISTRY_ABI,
          functionName: "revokeConsent",
          args: [consentId],
        });

        setTxStatus({ status: "confirming", hash });
        return hash;
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Transaction failed");
        setTxStatus({ status: "error", error: err });
        throw err;
      }
    },
    [isConnected, address, writeConsent]
  );

  // Register a trial
  const registerTrial = useCallback(
    async (data: {
      trialId: string;
      metadata: string;
      targetEnrollment: number;
    }) => {
      if (!isConnected || !address) {
        throw new Error("Wallet not connected");
      }

      setTxStatus({ status: "pending" });

      try {
        const trialPayload: TrialData = {
          trialId: stringToBytes32(data.trialId),
          metadataHash: hashData(data.metadata),
          sponsor: address,
          targetEnrollment: BigInt(data.targetEnrollment),
        };

        const hash = await writeTrial({
          address: TRIAL_REGISTRY_ADDRESS,
          abi: TRIAL_REGISTRY_ABI,
          functionName: "registerTrial",
          args: [
            trialPayload.trialId,
            trialPayload.metadataHash,
            trialPayload.sponsor,
            trialPayload.targetEnrollment,
          ],
        });

        setTxStatus({ status: "confirming", hash });
        return hash;
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Transaction failed");
        setTxStatus({ status: "error", error: err });
        throw err;
      }
    },
    [isConnected, address, writeTrial]
  );

  // Reset transaction status
  const resetTxStatus = useCallback(() => {
    setTxStatus({ status: "idle" });
  }, []);

  return {
    // State
    isConnected,
    address,
    txStatus,

    // Actions
    recordConsent,
    revokeConsent,
    registerTrial,
    resetTxStatus,

    // Utilities
    stringToBytes32,
    hashData,
  };
}

// Hook for reading consent data
export function useConsentData(patientId?: string, trialId?: string) {
  const patientIdBytes = patientId ? stringToBytes32(patientId) : undefined;
  const trialIdBytes = trialId ? stringToBytes32(trialId) : undefined;

  const { data: isValid, isLoading: isValidating } = useReadContract({
    address: CONSENT_REGISTRY_ADDRESS,
    abi: CONSENT_REGISTRY_ABI,
    functionName: "verifyConsent",
    args: patientIdBytes && trialIdBytes ? [patientIdBytes, trialIdBytes] : undefined,
    query: {
      enabled: !!patientIdBytes && !!trialIdBytes,
    },
  });

  const { data: consentIds, isLoading: isLoadingConsents } = useReadContract({
    address: CONSENT_REGISTRY_ADDRESS,
    abi: CONSENT_REGISTRY_ABI,
    functionName: "getPatientConsents",
    args: patientIdBytes ? [patientIdBytes] : undefined,
    query: {
      enabled: !!patientIdBytes,
    },
  });

  return {
    isValid,
    isValidating,
    consentIds,
    isLoadingConsents,
  };
}

// Hook for reading trial data
export function useTrialData(trialId?: string) {
  const trialIdBytes = trialId ? stringToBytes32(trialId) : undefined;

  const { data: trial, isLoading, refetch } = useReadContract({
    address: TRIAL_REGISTRY_ADDRESS,
    abi: TRIAL_REGISTRY_ABI,
    functionName: "getTrial",
    args: trialIdBytes ? [trialIdBytes] : undefined,
    query: {
      enabled: !!trialIdBytes,
    },
  });

  return {
    trial,
    isLoading,
    refetch,
  };
}

// Helper function - exported for use elsewhere
export { stringToBytes32, hashData };

function stringToBytes32Export(str: string): `0x${string}` {
  const hex = Buffer.from(str).toString("hex").padEnd(64, "0");
  return `0x${hex}` as `0x${string}`;
}

function hashDataExport(data: string): `0x${string}` {
  const hash = Array.from(data)
    .reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0)
    .toString(16)
    .padStart(64, "0");
  return `0x${hash}` as `0x${string}`;
}
