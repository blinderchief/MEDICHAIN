// API Response Types

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

// User & Patient Types

export interface User {
  id: string;
  clerkId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: "patient" | "researcher" | "sponsor" | "admin";
  walletAddress?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Patient {
  id: string;
  userId: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  ethnicity?: string;
  location?: PatientLocation;
  medicalHistory?: MedicalHistory;
  consentPreferences?: ConsentPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface PatientLocation {
  country: string;
  state?: string;
  city?: string;
  postalCode?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  maxTravelDistance?: number; // in miles
}

export interface MedicalHistory {
  conditions: MedicalCondition[];
  medications: Medication[];
  allergies: string[];
  procedures: Procedure[];
  labResults?: LabResult[];
  vitalSigns?: VitalSigns;
}

export interface MedicalCondition {
  name: string;
  icdCode?: string;
  diagnosedDate?: string;
  status: "active" | "resolved" | "chronic";
  severity?: "mild" | "moderate" | "severe";
}

export interface Medication {
  name: string;
  dosage?: string;
  frequency?: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
}

export interface Procedure {
  name: string;
  date: string;
  outcome?: string;
}

export interface LabResult {
  testName: string;
  value: string;
  unit: string;
  normalRange?: string;
  date: string;
  isAbnormal?: boolean;
}

export interface VitalSigns {
  height?: number; // cm
  weight?: number; // kg
  bmi?: number;
  bloodPressure?: {
    systolic: number;
    diastolic: number;
  };
  heartRate?: number;
  recordedAt: string;
}

export interface ConsentPreferences {
  dataSharing: "none" | "anonymized" | "identified";
  marketingEmails: boolean;
  researchNotifications: boolean;
  thirdPartySharing: boolean;
}

// Trial Types

export interface Trial {
  id: string;
  nctId?: string;
  title: string;
  briefTitle?: string;
  sponsor: string;
  leadInvestigator?: string;
  phase: TrialPhase;
  status: TrialStatus;
  condition: string;
  conditions: string[];
  interventions: Intervention[];
  location: string;
  locations: TrialLocation[];
  targetEnrollment: number;
  target_enrollment?: number; // snake_case alias
  currentEnrollment: number;
  startDate: string;
  endDate?: string;
  briefDescription: string;
  detailedDescription?: string;
  eligibilityCriteria: EligibilityCriteria;
  compensation?: string;
  contactInfo?: ContactInfo;
  contact_info?: ContactInfo; // snake_case alias
  documents?: TrialDocument[];
  metadata?: TrialMetadata;
  isVerified?: boolean;
  is_verified?: boolean; // snake_case alias
  blockchainHash?: string;
  blockchain_hash?: string; // snake_case alias
  createdAt: string;
  updatedAt: string;
}

export type TrialPhase = "Phase I" | "Phase II" | "Phase III" | "Phase IV" | "Early Phase I" | "N/A";
export type TrialStatus = "recruiting" | "active" | "completed" | "suspended" | "withdrawn" | "not_yet_recruiting" | "terminated";

export interface Intervention {
  type: "Drug" | "Biological" | "Device" | "Procedure" | "Behavioral" | "Other";
  name: string;
  description?: string;
}

export interface TrialLocation {
  facility: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  status: "recruiting" | "not_recruiting" | "completed";
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface EligibilityCriteria {
  minimumAge?: number;
  maximumAge?: number;
  gender: "all" | "male" | "female";
  healthyVolunteers: boolean;
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  structuredCriteria?: StructuredCriterion[];
}

export interface StructuredCriterion {
  id: string;
  category: "inclusion" | "exclusion";
  criterion: string;
  type: "age" | "gender" | "condition" | "medication" | "lab_value" | "procedure" | "other";
  operator?: "equals" | "not_equals" | "greater_than" | "less_than" | "contains" | "not_contains";
  value?: string | number;
  unit?: string;
}

export interface ContactInfo {
  name: string;
  email?: string;
  phone?: string;
  role?: string;
}

export interface TrialDocument {
  id: string;
  type: "protocol" | "consent_form" | "brochure" | "other";
  title: string;
  url: string;
  version?: string;
  uploadedAt: string;
}

export interface TrialMetadata {
  studyType?: string;
  allocation?: string;
  interventionModel?: string;
  primaryPurpose?: string;
  masking?: string;
  lastUpdated?: string;
  source?: string;
}

// Match Types

export interface Match {
  id: string;
  patientId: string;
  trialId: string;
  trial?: Trial;
  matchScore: number;
  match_score?: number; // snake_case alias
  status: MatchStatus;
  eligibilityFactors: EligibilityFactor[];
  aiInsights?: string;
  aiExplanation?: AIExplanation;
  matchedAt: string;
  consentedAt?: string;
  enrolledAt?: string;
  declinedAt?: string;
  withdrawnAt?: string;
  metadata?: MatchMetadata;
  // Extended fields for display
  trialTitle?: string;
  trialPhase?: string;
  sponsor?: string;
  location?: string;
  condition?: string;
  trialStatus?: string;
  compensation?: string;
}

export type MatchStatus = "pending" | "consented" | "enrolled" | "declined" | "withdrawn" | "expired";

export interface EligibilityFactor {
  id: string;
  factor: string;
  category: "inclusion" | "exclusion";
  status: "met" | "not_met" | "unknown" | "partial";
  explanation?: string;
  confidence?: number;
  dataSource?: string;
}

export interface AIExplanation {
  summary: string;
  matchReasons: string[];
  potentialConcerns: string[];
  recommendations: string[];
  confidenceScore: number;
  generatedAt: string;
}

export interface MatchMetadata {
  algorithmVersion: string;
  processingTime: number;
  dataCompleteness: number;
  lastUpdated: string;
}

// Consent Types

export interface Consent {
  id: string;
  patientId: string;
  trialId: string;
  trial?: Trial;
  status: ConsentStatus;
  documents: ConsentDocument[];
  signature: ConsentSignature;
  blockchainRecord?: BlockchainRecord;
  createdAt: string;
  updatedAt: string;
  revokedAt?: string;
}

export type ConsentStatus = "pending" | "active" | "revoked" | "expired";

export interface ConsentDocument {
  id: string;
  type: "informed_consent" | "hipaa" | "privacy" | "data_sharing";
  title: string;
  version: string;
  url: string;
  required: boolean;
  agreedAt?: string;
}

export interface ConsentSignature {
  signedBy: string;
  signedAt: string;
  ipAddress?: string;
  userAgent?: string;
  signatureHash: string;
}

export interface BlockchainRecord {
  transactionHash: string;
  blockNumber: number;
  contractAddress: string;
  chainId: number;
  timestamp: string;
  verified: boolean;
}

// Analytics Types

export interface DashboardStats {
  totalMatches: number;
  highQualityMatches: number;
  averageMatchScore: number;
  pendingConsents: number;
  activeEnrollments: number;
  completedTrials: number;
  matchTrend: TrendData;
  enrollmentTrend: TrendData;
}

export interface TrendData {
  current: number;
  previous: number;
  change: number;
  changePercentage: number;
  direction: "up" | "down" | "stable";
}

export interface TrialAnalytics {
  trialId: string;
  enrollmentRate: number;
  screeningSuccessRate: number;
  averageTimeToEnroll: number; // days
  geographicDistribution: GeographicData[];
  demographicBreakdown: DemographicData;
  weeklyEnrollments: TimeSeriesData[];
}

export interface GeographicData {
  region: string;
  count: number;
  percentage: number;
}

export interface DemographicData {
  ageGroups: { group: string; count: number }[];
  genderDistribution: { gender: string; count: number }[];
  ethnicityDistribution: { ethnicity: string; count: number }[];
}

export interface TimeSeriesData {
  date: string;
  value: number;
}

// Search & Filter Types

export interface TrialSearchParams {
  query?: string;
  conditions?: string[];
  phases?: TrialPhase[];
  statuses?: TrialStatus[];
  location?: {
    lat: number;
    lng: number;
    radius: number; // miles
  };
  ageRange?: {
    min?: number;
    max?: number;
  };
  gender?: "all" | "male" | "female";
  healthyVolunteers?: boolean;
  hasCompensation?: boolean;
  sortBy?: "relevance" | "distance" | "enrollment" | "startDate";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface MatchFilterParams {
  statuses?: MatchStatus[];
  minScore?: number;
  maxScore?: number;
  dateRange?: {
    from?: string;
    to?: string;
  };
  sortBy?: "score" | "date" | "status";
  sortOrder?: "asc" | "desc";
}

// Notification Types

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
  readAt?: string;
}

export type NotificationType =
  | "new_match"
  | "match_update"
  | "consent_required"
  | "consent_confirmed"
  | "enrollment_update"
  | "trial_update"
  | "system";
