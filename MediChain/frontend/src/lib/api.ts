import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const axiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor for adding auth token
axiosInstance.interceptors.request.use(
  async (config) => {
    // Token will be added by Clerk's session
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      if (typeof window !== 'undefined') {
        window.location.href = '/sign-in';
      }
    }
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Trial {
  id: string;
  nct_id: string;
  nctId?: string;
  title: string;
  official_title?: string;
  briefTitle?: string;
  description?: string;
  detailed_description?: string;
  briefDescription?: string;
  detailedDescription?: string;
  status: string;
  phase?: string;
  study_type?: string;
  sponsor?: string;
  condition?: string;
  conditions?: string[];
  interventions?: any;
  eligibility_criteria?: any;
  eligibilityCriteria?: any;
  location?: string;
  locations?: string[];
  contacts?: any;
  enrollment_count?: number;
  targetEnrollment?: number;
  target_enrollment?: number;
  currentEnrollment?: number;
  start_date?: string;
  startDate?: string;
  completion_date?: string;
  endDate?: string;
  source_url?: string;
  is_active: boolean;
  is_verified?: boolean;
  isVerified?: boolean;
  blockchain_hash?: string;
  blockchainHash?: string;
  contact_info?: any;
  contactInfo?: any;
  created_at: string;
  createdAt?: string;
  updated_at: string;
  updatedAt?: string;
}

export interface Patient {
  id: string;
  clerk_user_id: string;
  did?: string;
  demographics?: any;
  conditions?: string[];
  medications?: string[];
  lab_results?: any;
  preferences?: any;
  wallet_address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  patient_id: string;
  patientId?: string;
  trial_id: string;
  trialId?: string;
  status: string;
  confidence_score: number;
  match_score?: number;
  matchScore?: number;
  eligibility_score?: number;
  eligibilityScore?: number;
  location_score?: number;
  preference_score?: number;
  reasoning?: any;
  ai_explanation?: string;
  aiExplanation?: string;
  matched_criteria?: any;
  unmatched_criteria?: any;
  consent_hash?: string;
  consent_tx_hash?: string;
  consent_signed_at?: string;
  asi_reward_amount?: number;
  asi_reward_tx_hash?: string;
  created_by?: string;
  created_at: string;
  createdAt?: string;
  updated_at: string;
  updatedAt?: string;
  // Extended fields for display  
  trialTitle?: string;
  trialPhase?: string;
  sponsor?: string;
  location?: string;
  condition?: string;
  trialStatus?: string;
  compensation?: string;
  eligibilityFactors?: any[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Structured API Object
// ─────────────────────────────────────────────────────────────────────────────

export const api = {
  // Health
  health: {
    check: () => axiosInstance.get('/health'),
  },
  
  // Trials
  trials: {
    list: async (params?: any): Promise<PaginatedResponse<Trial>> => {
      const response = await axiosInstance.get<Trial[]>('/trials', { params });
      // Backend returns array directly, wrap in paginated response
      const trials = Array.isArray(response) ? response : (response as any).data || [];
      return {
        items: trials,
        total: trials.length,
        page: params?.page || 1,
        pages: 1,
        limit: params?.limit || 20,
      };
    },
    get: async (id: string): Promise<Trial> => {
      return axiosInstance.get(`/trials/${id}`);
    },
    search: (query: string, params?: any) => 
      axiosInstance.get('/trials', { params: { query, ...params } }),
    sync: () => axiosInstance.post('/trials/sync-clinicaltrials-gov'),
  },
  
  // Patients
  patients: {
    get: (id: string) => axiosInstance.get(`/patients/${id}`),
    getMe: (clerkUserId: string) => 
      axiosInstance.get('/patients/me', { params: { clerk_user_id: clerkUserId } }),
    create: (data: any) => axiosInstance.post('/patients', data),
    update: (id: string, data: any) => axiosInstance.put(`/patients/${id}`, data),
  },
  
  // Matches
  matches: {
    list: (params?: any) => axiosInstance.get('/matches', { params }),
    get: (id: string) => axiosInstance.get(`/matches/${id}`),
    getForPatient: (patientId: string, params?: any) => 
      axiosInstance.get(`/matches/patient/${patientId}`, { params }),
    create: (data: any) => axiosInstance.post('/matches', data),
    update: (id: string, data: any) => axiosInstance.put(`/matches/${id}`, data),
    updateStatus: (id: string, status: string) => 
      axiosInstance.put(`/matches/${id}/status`, null, { params: { new_status: status } }),
    recordConsent: (id: string, data: any) => axiosInstance.post(`/matches/${id}/consent`, data),
  },
  
  // Agents
  agents: {
    orchestrate: {
      match: (data: any) => axiosInstance.post('/agents/orchestrate/match', data),
      profile: (data: any) => axiosInstance.post('/agents/orchestrate/profile', data),
      enroll: (data: any) => axiosInstance.post('/agents/orchestrate/enroll', data),
    },
    health: () => axiosInstance.get('/agents/health'),
  },
};

// Legacy exports for backward compatibility
export const getHealth = () => axiosInstance.get('/health');
export const getTrials = (params?: any) => axiosInstance.get('/trials', { params });
export const getTrial = (id: string) => axiosInstance.get(`/trials/${id}`);
export const searchTrials = (query: string, params?: any) => 
  axiosInstance.get('/trials/search', { params: { query, ...params } });
export const syncTrials = () => axiosInstance.post('/trials/sync-clinicaltrials-gov');
export const getPatient = (id: string) => axiosInstance.get(`/patients/${id}`);
export const createPatient = (data: any) => axiosInstance.post('/patients', data);
export const updatePatient = (id: string, data: any) => axiosInstance.put(`/patients/${id}`, data);
export const findMatches = (patientId: string, params?: any) => 
  axiosInstance.post('/matches/find', { patient_id: patientId, ...params });
export const getMatch = (id: string) => axiosInstance.get(`/matches/${id}`);

export default api;
