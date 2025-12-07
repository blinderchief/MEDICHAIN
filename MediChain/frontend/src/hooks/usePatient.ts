"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { useAccount } from "wagmi";
import { Patient } from "@/lib/api";

interface MedicalHistory {
  conditions: string[];
  medications: string[];
  allergies: string[];
  surgeries: string[];
  family_history: string[];
}

interface Demographics {
  age?: number;
  gender?: string;
  ethnicity?: string;
  location?: {
    city: string;
    state: string;
    country: string;
    zip_code: string;
  };
}

interface Preferences {
  travel_distance_miles: number;
  willing_to_relocate: boolean;
  preferred_contact: "email" | "phone" | "both";
  language: string;
  notification_frequency: "realtime" | "daily" | "weekly";
}

interface PatientProfile extends Patient {
  medical_history?: MedicalHistory;
  demographics?: Demographics;
  preferences?: Preferences;
  profile_completeness: number;
  consent_status?: "granted" | "revoked" | "pending" | null;
  wallet_address?: string;
}

interface UpdateProfileData {
  medical_history?: MedicalHistory;
  demographics?: Demographics;
  preferences?: Preferences;
  wallet_address?: string;
}

/**
 * Hook for managing the current patient's profile
 */
export function usePatient() {
  const { getToken } = useAuth();
  const { address } = useAccount();
  const queryClient = useQueryClient();

  // Fetch patient profile
  const query = useQuery({
    queryKey: ["patient-profile"],
    queryFn: async () => {
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/patients/me`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error("Failed to fetch profile");
      }
      return response.json() as Promise<PatientProfile>;
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Create or update profile
  const updateMutation = useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      const token = await getToken();
      const method = query.data ? "PUT" : "POST";
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/patients/me`,
        {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...data,
            wallet_address: data.wallet_address || address,
          }),
        }
      );
      if (!response.ok) throw new Error("Failed to update profile");
      return response.json() as Promise<PatientProfile>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["patient-profile"], data);
    },
  });

  // Run AI profile analysis
  const analysisMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/agents/orchestrate/profile`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) throw new Error("Failed to analyze profile");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-profile"] });
    },
  });

  // Calculate profile completeness
  const calculateCompleteness = (profile?: PatientProfile | null): number => {
    if (!profile) return 0;
    
    let score = 0;
    const total = 10;

    if (profile.demographics?.age) score++;
    if (profile.demographics?.gender) score++;
    if (profile.demographics?.location?.city) score++;
    if (profile.medical_history?.conditions?.length) score++;
    if (profile.medical_history?.medications?.length) score++;
    if (profile.medical_history?.allergies?.length) score++;
    if (profile.preferences?.travel_distance_miles) score++;
    if (profile.preferences?.preferred_contact) score++;
    if (profile.wallet_address) score++;
    if (profile.consent_status === "granted") score++;

    return Math.round((score / total) * 100);
  };

  return {
    patient: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    profileCompleteness: calculateCompleteness(query.data),
    updateProfile: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,
    runAnalysis: analysisMutation.mutate,
    isAnalyzing: analysisMutation.isPending,
    refetch: query.refetch,
  };
}

/**
 * Hook for checking consent status
 */
export function useConsent() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  // Grant consent
  const grantMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/patients/me/consent`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "grant" }),
        }
      );
      if (!response.ok) throw new Error("Failed to grant consent");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-profile"] });
    },
  });

  // Revoke consent
  const revokeMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/patients/me/consent`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "revoke" }),
        }
      );
      if (!response.ok) throw new Error("Failed to revoke consent");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-profile"] });
    },
  });

  return {
    grantConsent: grantMutation.mutate,
    revokeConsent: revokeMutation.mutate,
    isGranting: grantMutation.isPending,
    isRevoking: revokeMutation.isPending,
  };
}
