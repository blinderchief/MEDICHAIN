"use client";

import { useState, useEffect } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";

// Simple connect wallet button wrapper
function ConnectWalletButton() {
  return (
    <ConnectButton.Custom>
      {({ openConnectModal }) => (
        <button
          onClick={openConnectModal}
          className="w-full px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium rounded-lg hover:from-cyan-600 hover:to-purple-600 transition-all"
        >
          Connect Wallet
        </button>
      )}
    </ConnectButton.Custom>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PatientProfile {
  id: string;
  clerk_user_id: string;
  wallet_address?: string;
  medical_history?: MedicalHistory;
  demographics?: Demographics;
  preferences?: Preferences;
  consent_status: "pending" | "granted" | "revoked";
  profile_completeness: number;
  created_at: string;
  updated_at: string;
}

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

// ─────────────────────────────────────────────────────────────────────────────
// Form Section Component
// ─────────────────────────────────────────────────────────────────────────────

function FormSection({
  title,
  description,
  children,
  icon,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="p-2 bg-cyan-100 dark:bg-cyan-900 rounded-lg text-cyan-600 dark:text-cyan-400">
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tag Input Component
// ─────────────────────────────────────────────────────────────────────────────

function TagInput({
  label,
  tags,
  onChange,
  placeholder,
  suggestions = [],
}: {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
  suggestions?: string[];
}) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput("");
    setShowSuggestions(false);
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  const filteredSuggestions = suggestions.filter(
    (s) => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s)
  );

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="relative">
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg min-h-[48px]">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="flex items-center gap-1 px-2 py-1 bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 rounded text-sm"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(i)}
                className="hover:text-cyan-900 dark:hover:text-cyan-100"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setShowSuggestions(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && input) {
                e.preventDefault();
                addTag(input);
              }
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={tags.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400"
          />
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-auto">
            {filteredSuggestions.map((suggestion, i) => (
              <button
                key={i}
                type="button"
                onClick={() => addTag(suggestion)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Profile Page
// ─────────────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  // Form state
  const [demographics, setDemographics] = useState<Demographics>({
    age: undefined,
    gender: "",
    ethnicity: "",
    location: { city: "", state: "", country: "", zip_code: "" },
  });

  const [medicalHistory, setMedicalHistory] = useState<MedicalHistory>({
    conditions: [],
    medications: [],
    allergies: [],
    surgeries: [],
    family_history: [],
  });

  const [preferences, setPreferences] = useState<Preferences>({
    travel_distance_miles: 50,
    willing_to_relocate: false,
    preferred_contact: "email",
    language: "English",
    notification_frequency: "daily",
  });

  const [isSaving, setIsSaving] = useState(false);

  // Fetch existing profile
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["patient-profile"],
    queryFn: async () => {
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/patients/me`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error("Profile not found");
      return response.json() as Promise<PatientProfile>;
    },
    enabled: isLoaded && isSignedIn,
    retry: false,
  });

  // Populate form with existing data
  useEffect(() => {
    if (profile) {
      if (profile.demographics) setDemographics(profile.demographics);
      if (profile.medical_history) setMedicalHistory(profile.medical_history);
      if (profile.preferences) setPreferences(profile.preferences);
    }
  }, [profile]);

  // Save profile mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      setIsSaving(true);
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/patients/me`,
        {
          method: profile ? "PUT" : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            demographics,
            medical_history: medicalHistory,
            preferences,
            wallet_address: address,
          }),
        }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-profile"] });
      setIsSaving(false);
    },
    onError: () => {
      setIsSaving(false);
    },
  });

  // AI Profile Analysis mutation
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
      return response.json();
    },
  });

  // Common medical conditions for suggestions
  const conditionSuggestions = [
    "Type 2 Diabetes",
    "Hypertension",
    "Asthma",
    "COPD",
    "Depression",
    "Anxiety",
    "Arthritis",
    "Heart Disease",
    "Cancer",
    "Alzheimer's Disease",
    "Parkinson's Disease",
    "Multiple Sclerosis",
    "Crohn's Disease",
    "Lupus",
  ];

  const medicationSuggestions = [
    "Metformin",
    "Lisinopril",
    "Amlodipine",
    "Metoprolol",
    "Omeprazole",
    "Levothyroxine",
    "Atorvastatin",
    "Albuterol",
    "Gabapentin",
    "Sertraline",
  ];

  const allergySuggestions = [
    "Penicillin",
    "Sulfa drugs",
    "Aspirin",
    "NSAIDs",
    "Latex",
    "Contrast dye",
    "Shellfish",
    "Peanuts",
    "Tree nuts",
    "Eggs",
  ];

  // Calculate profile completeness
  const calculateCompleteness = (): number => {
    let score = 0;
    const total = 10;

    if (demographics.age) score++;
    if (demographics.gender) score++;
    if (demographics.location?.city) score++;
    if (medicalHistory.conditions.length > 0) score++;
    if (medicalHistory.medications.length > 0) score++;
    if (medicalHistory.allergies.length > 0) score++;
    if (preferences.travel_distance_miles) score++;
    if (preferences.preferred_contact) score++;
    if (isConnected) score++;
    if (profile?.consent_status === "granted") score++;

    return Math.round((score / total) * 100);
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Sign In Required</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Please sign in to view and edit your profile.
          </p>
          <Link
            href="/sign-in"
            className="inline-block px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const completeness = calculateCompleteness();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage your health information for better trial matching
              </p>
            </div>
            
            <button
              onClick={() => saveMutation.mutate()}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Profile
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Profile Completeness Card */}
        <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">Profile Completeness</h2>
              <p className="text-cyan-100 text-sm">
                Complete your profile to get better trial matches
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{completeness}%</div>
              <div className="text-xs text-cyan-100">Complete</div>
            </div>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3">
            <div
              className="bg-white rounded-full h-3 transition-all duration-500"
              style={{ width: `${completeness}%` }}
            />
          </div>
          {completeness < 100 && (
            <p className="text-xs text-cyan-100 mt-2">
              💡 Tip: Add more medical history details to improve your match accuracy
            </p>
          )}
        </div>

        {/* User Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white text-2xl font-bold">
              {user?.firstName?.[0] || user?.emailAddresses[0]?.emailAddress[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {user?.fullName || "Anonymous User"}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {user?.emailAddresses[0]?.emailAddress}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Web3 Wallet Connection */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg text-purple-600 dark:text-purple-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Web3 Wallet</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isConnected
                    ? "Connected for blockchain consent verification"
                    : "Connect for on-chain consent and ASI token rewards"}
                </p>
              </div>
            </div>
            
            {isConnected ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-mono text-gray-900 dark:text-white">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </p>
                  <p className="text-xs text-green-600">Connected</p>
                </div>
                <button
                  onClick={() => disconnect()}
                  className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <ConnectWalletButton />
            )}
          </div>
        </div>

        {/* Demographics */}
        <FormSection
          title="Demographics"
          description="Basic information to help match you with eligible trials"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Age
              </label>
              <input
                type="number"
                value={demographics.age || ""}
                onChange={(e) => setDemographics({ ...demographics, age: parseInt(e.target.value) || undefined })}
                placeholder="Enter your age"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Gender
              </label>
              <select
                value={demographics.gender || ""}
                onChange={(e) => setDemographics({ ...demographics, gender: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:text-white"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary">Non-binary</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ethnicity
              </label>
              <select
                value={demographics.ethnicity || ""}
                onChange={(e) => setDemographics({ ...demographics, ethnicity: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:text-white"
              >
                <option value="">Select ethnicity</option>
                <option value="asian">Asian</option>
                <option value="black">Black or African American</option>
                <option value="hispanic">Hispanic or Latino</option>
                <option value="white">White</option>
                <option value="native-american">Native American</option>
                <option value="pacific-islander">Pacific Islander</option>
                <option value="mixed">Mixed / Multiple</option>
                <option value="other">Other</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                City
              </label>
              <input
                type="text"
                value={demographics.location?.city || ""}
                onChange={(e) =>
                  setDemographics({
                    ...demographics,
                    location: { ...demographics.location!, city: e.target.value },
                  })
                }
                placeholder="Enter your city"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                State/Province
              </label>
              <input
                type="text"
                value={demographics.location?.state || ""}
                onChange={(e) =>
                  setDemographics({
                    ...demographics,
                    location: { ...demographics.location!, state: e.target.value },
                  })
                }
                placeholder="Enter your state"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ZIP/Postal Code
              </label>
              <input
                type="text"
                value={demographics.location?.zip_code || ""}
                onChange={(e) =>
                  setDemographics({
                    ...demographics,
                    location: { ...demographics.location!, zip_code: e.target.value },
                  })
                }
                placeholder="Enter ZIP code"
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:text-white"
              />
            </div>
          </div>
        </FormSection>

        {/* Medical History */}
        <FormSection
          title="Medical History"
          description="Your health information helps us find the most relevant trials"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        >
          <div className="space-y-6">
            <TagInput
              label="Medical Conditions"
              tags={medicalHistory.conditions}
              onChange={(conditions) => setMedicalHistory({ ...medicalHistory, conditions })}
              placeholder="Add conditions (e.g., Type 2 Diabetes)..."
              suggestions={conditionSuggestions}
            />

            <TagInput
              label="Current Medications"
              tags={medicalHistory.medications}
              onChange={(medications) => setMedicalHistory({ ...medicalHistory, medications })}
              placeholder="Add medications (e.g., Metformin)..."
              suggestions={medicationSuggestions}
            />

            <TagInput
              label="Allergies"
              tags={medicalHistory.allergies}
              onChange={(allergies) => setMedicalHistory({ ...medicalHistory, allergies })}
              placeholder="Add allergies (e.g., Penicillin)..."
              suggestions={allergySuggestions}
            />

            <TagInput
              label="Past Surgeries"
              tags={medicalHistory.surgeries}
              onChange={(surgeries) => setMedicalHistory({ ...medicalHistory, surgeries })}
              placeholder="Add surgeries (e.g., Appendectomy)..."
            />

            <TagInput
              label="Family Medical History"
              tags={medicalHistory.family_history}
              onChange={(family_history) => setMedicalHistory({ ...medicalHistory, family_history })}
              placeholder="Add family conditions (e.g., Heart Disease - Father)..."
            />
          </div>

          {/* AI Analysis Button */}
          <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-cyan-50 dark:from-purple-900/20 dark:to-cyan-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">AI Profile Analysis</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Let our AI agents analyze your profile for better matching
                </p>
              </div>
              <button
                onClick={() => analysisMutation.mutate()}
                disabled={analysisMutation.isPending}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {analysisMutation.isPending ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Analyze Profile
                  </>
                )}
              </button>
            </div>
          </div>
        </FormSection>

        {/* Preferences */}
        <FormSection
          title="Trial Preferences"
          description="Customize how we search and notify you about trials"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Travel Distance (miles)
              </label>
              <input
                type="number"
                value={preferences.travel_distance_miles}
                onChange={(e) =>
                  setPreferences({ ...preferences, travel_distance_miles: parseInt(e.target.value) || 50 })
                }
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Preferred Contact Method
              </label>
              <select
                value={preferences.preferred_contact}
                onChange={(e) =>
                  setPreferences({ ...preferences, preferred_contact: e.target.value as any })
                }
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:text-white"
              >
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="both">Both</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notification Frequency
              </label>
              <select
                value={preferences.notification_frequency}
                onChange={(e) =>
                  setPreferences({ ...preferences, notification_frequency: e.target.value as any })
                }
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:text-white"
              >
                <option value="realtime">Real-time</option>
                <option value="daily">Daily digest</option>
                <option value="weekly">Weekly digest</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Language
              </label>
              <select
                value={preferences.language}
                onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent dark:text-white"
              >
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
                <option value="Chinese">Chinese</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.willing_to_relocate}
                onChange={(e) =>
                  setPreferences({ ...preferences, willing_to_relocate: e.target.checked })
                }
                className="w-5 h-5 rounded border-gray-300 text-cyan-500 focus:ring-cyan-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                I am willing to relocate for the right clinical trial opportunity
              </span>
            </label>
          </div>
        </FormSection>

        {/* Privacy Notice */}
        <div className="bg-gray-100 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-cyan-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                Your Data is Protected
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                MediChain is HIPAA-compliant and uses end-to-end encryption. Your medical data is stored
                securely and only shared with your explicit consent. All consent records are verified on the
                blockchain for complete transparency and auditability.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
