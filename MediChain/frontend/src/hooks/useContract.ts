"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { keccak256, toBytes } from "viem";
import { MEDICHAIN_CONTRACT_ADDRESS, MEDICHAIN_ABI } from "@/lib/contracts";

// Hook to get consent counter
export function useConsentCounter() {
  return useReadContract({
    address: MEDICHAIN_CONTRACT_ADDRESS,
    abi: MEDICHAIN_ABI,
    functionName: "consentCounter",
  });
}

// Hook to verify consent
export function useVerifyConsent(patientId: string, trialId: string) {
  const patientHash = patientId ? keccak256(toBytes(patientId)) : undefined;
  const trialHash = trialId ? keccak256(toBytes(trialId)) : undefined;

  return useReadContract({
    address: MEDICHAIN_CONTRACT_ADDRESS,
    abi: MEDICHAIN_ABI,
    functionName: "verifyConsent",
    args: patientHash && trialHash ? [patientHash, trialHash] : undefined,
    query: {
      enabled: !!patientHash && !!trialHash,
    },
  });
}

// Hook to get consent record
export function useGetConsent(consentId: bigint | undefined) {
  return useReadContract({
    address: MEDICHAIN_CONTRACT_ADDRESS,
    abi: MEDICHAIN_ABI,
    functionName: "getConsent",
    args: consentId ? [consentId] : undefined,
    query: {
      enabled: consentId !== undefined,
    },
  });
}

// Hook to record consent
export function useRecordConsent() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const recordConsent = async (patientId: string, trialId: string, consentDocument: string) => {
    const patientHash = keccak256(toBytes(patientId));
    const trialHash = keccak256(toBytes(trialId));
    const consentHash = keccak256(toBytes(consentDocument));

    writeContract({
      address: MEDICHAIN_CONTRACT_ADDRESS,
      abi: MEDICHAIN_ABI,
      functionName: "recordConsent",
      args: [patientHash, trialHash, consentHash],
    });
  };

  return {
    recordConsent,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}

// Hook to revoke consent
export function useRevokeConsent() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const revokeConsent = async (consentId: bigint) => {
    writeContract({
      address: MEDICHAIN_CONTRACT_ADDRESS,
      abi: MEDICHAIN_ABI,
      functionName: "revokeConsent",
      args: [consentId],
    });
  };

  return {
    revokeConsent,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}
