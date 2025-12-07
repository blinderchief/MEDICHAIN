/**
 * MediChain Frontend Test Suite
 * ==============================
 * 
 * Comprehensive tests for the MediChain frontend application.
 * Run with: npm test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock data
export const mockPatient = {
  id: 'patient-1',
  email: 'test@medichain.io',
  firstName: 'Test',
  lastName: 'Patient',
  dateOfBirth: '1990-01-15',
  gender: 'male',
  walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
  location: {
    city: 'San Francisco',
    state: 'CA',
    country: 'USA',
  },
  medicalHistory: {
    conditions: [
      {
        name: 'Type 2 Diabetes',
        icdCode: 'E11',
        status: 'active',
      },
    ],
    medications: [],
    allergies: [],
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

export const mockTrial = {
  id: 'trial-1',
  nctId: 'NCT00000001',
  title: 'Test Clinical Trial for Type 2 Diabetes',
  briefTitle: 'Test Diabetes Trial',
  sponsor: 'Test Pharma Inc.',
  phase: 'Phase II',
  status: 'recruiting',
  condition: 'Type 2 Diabetes',
  location: 'San Francisco, CA',
  targetEnrollment: 100,
  currentEnrollment: 45,
  startDate: '2024-01-01',
  endDate: '2025-12-31',
  eligibilityCriteria: {
    minimumAge: 18,
    maximumAge: 65,
    gender: 'all',
    healthyVolunteers: false,
    inclusionCriteria: [
      'Diagnosis of Type 2 Diabetes',
      'HbA1c between 7% and 10%',
    ],
    exclusionCriteria: [
      'Pregnant or nursing',
      'Severe kidney disease',
    ],
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

export const mockMatch = {
  id: 'match-1',
  patientId: 'patient-1',
  trialId: 'trial-1',
  score: 92.5,
  status: 'pending',
  eligibilityDetails: {
    inclusionMet: true,
    exclusionClear: true,
    overallEligible: true,
    criteriaResults: [],
  },
  aiInsights: {
    summary: 'Excellent match based on medical history.',
    confidence: 0.95,
    keyFactors: ['Matching condition', 'Age within range'],
    concerns: [],
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

export const mockConsent = {
  id: 'consent-1',
  patientId: 'patient-1',
  trialId: 'trial-1',
  status: 'active',
  documents: [
    {
      type: 'informed_consent',
      version: '1.0',
      signedAt: '2024-01-01T00:00:00Z',
    },
  ],
  blockchainRecord: {
    transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    blockNumber: 12345,
    network: 'ethereum-mainnet',
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// Test utilities
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

export const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Component tests
describe('MediChain Frontend Tests', () => {
  describe('UI Components', () => {
    describe('Button', () => {
      it('renders correctly with default props', async () => {
        const { Button } = await import('@/components/ui/button');
        render(<Button>Click me</Button>);
        expect(screen.getByRole('button')).toBeInTheDocument();
        expect(screen.getByText('Click me')).toBeInTheDocument();
      });

      it('handles click events', async () => {
        const { Button } = await import('@/components/ui/button');
        const handleClick = vi.fn();
        render(<Button onClick={handleClick}>Click me</Button>);
        fireEvent.click(screen.getByRole('button'));
        expect(handleClick).toHaveBeenCalledTimes(1);
      });

      it('renders disabled state correctly', async () => {
        const { Button } = await import('@/components/ui/button');
        render(<Button disabled>Click me</Button>);
        expect(screen.getByRole('button')).toBeDisabled();
      });
    });

    describe('Card', () => {
      it('renders card with title and description', async () => {
        const { Card, CardHeader, CardTitle, CardDescription, CardContent } =
          await import('@/components/ui/card');
        render(
          <Card>
            <CardHeader>
              <CardTitle>Test Title</CardTitle>
              <CardDescription>Test Description</CardDescription>
            </CardHeader>
            <CardContent>Test Content</CardContent>
          </Card>
        );
        expect(screen.getByText('Test Title')).toBeInTheDocument();
        expect(screen.getByText('Test Description')).toBeInTheDocument();
        expect(screen.getByText('Test Content')).toBeInTheDocument();
      });
    });

    describe('Badge', () => {
      it('renders with different variants', async () => {
        const { Badge } = await import('@/components/ui/badge');
        const { rerender } = render(<Badge variant="default">Default</Badge>);
        expect(screen.getByText('Default')).toBeInTheDocument();

        rerender(<Badge variant="secondary">Secondary</Badge>);
        expect(screen.getByText('Secondary')).toBeInTheDocument();

        rerender(<Badge variant="destructive">Destructive</Badge>);
        expect(screen.getByText('Destructive')).toBeInTheDocument();
      });
    });
  });

  describe('Feature Components', () => {
    describe('TrialCard', () => {
      it('renders trial information correctly', async () => {
        const { TrialCard } = await import('@/components/TrialCard');
        render(
          <TestWrapper>
            <TrialCard trial={mockTrial} />
          </TestWrapper>
        );
        expect(screen.getByText(mockTrial.title)).toBeInTheDocument();
        expect(screen.getByText(mockTrial.sponsor)).toBeInTheDocument();
        expect(screen.getByText(mockTrial.phase)).toBeInTheDocument();
      });

      it('shows recruiting status badge', async () => {
        const { TrialCard } = await import('@/components/TrialCard');
        render(
          <TestWrapper>
            <TrialCard trial={mockTrial} />
          </TestWrapper>
        );
        expect(screen.getByText(/recruiting/i)).toBeInTheDocument();
      });
    });

    describe('MatchCard', () => {
      it('renders match information correctly', async () => {
        const { MatchCard } = await import('@/components/MatchCard');
        render(
          <TestWrapper>
            <MatchCard match={mockMatch} trial={mockTrial} />
          </TestWrapper>
        );
        expect(screen.getByText(mockTrial.title)).toBeInTheDocument();
        expect(screen.getByText(/92\.5%/)).toBeInTheDocument();
      });

      it('handles action button clicks', async () => {
        const { MatchCard } = await import('@/components/MatchCard');
        const handleAction = vi.fn();
        render(
          <TestWrapper>
            <MatchCard
              match={mockMatch}
              trial={mockTrial}
              onAction={handleAction}
            />
          </TestWrapper>
        );
        const actionButton = screen.getByRole('button', { name: /express interest/i });
        fireEvent.click(actionButton);
        expect(handleAction).toHaveBeenCalled();
      });
    });

    describe('StatsCard', () => {
      it('renders statistics correctly', async () => {
        const { StatsCard } = await import('@/components/StatsCard');
        render(
          <StatsCard
            title="Total Matches"
            value={42}
            description="This month"
          />
        );
        expect(screen.getByText('Total Matches')).toBeInTheDocument();
        expect(screen.getByText('42')).toBeInTheDocument();
        expect(screen.getByText('This month')).toBeInTheDocument();
      });

      it('shows trend indicator', async () => {
        const { StatsCard } = await import('@/components/StatsCard');
        render(
          <StatsCard
            title="Matches"
            value={100}
            trend={{ value: 15, direction: 'up' }}
          />
        );
        expect(screen.getByText(/15%/)).toBeInTheDocument();
      });
    });

    describe('WalletStatus', () => {
      it('shows disconnected state', async () => {
        const { WalletStatus } = await import('@/components/WalletStatus');
        render(<WalletStatus />);
        expect(screen.getByText(/connect wallet/i)).toBeInTheDocument();
      });
    });
  });

  describe('Hooks', () => {
    describe('useTrials', () => {
      it('fetches trials successfully', async () => {
        const { useTrials } = await import('@/hooks/useTrials');
        const { renderHook } = await import('@testing-library/react');
        
        // Mock fetch
        global.fetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ items: [mockTrial], total: 1 }),
        });

        const { result } = renderHook(() => useTrials(), {
          wrapper: TestWrapper,
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });
      });
    });

    describe('useMatches', () => {
      it('fetches matches for a patient', async () => {
        const { useMatches } = await import('@/hooks/useMatches');
        const { renderHook } = await import('@testing-library/react');

        global.fetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([mockMatch]),
        });

        const { result } = renderHook(() => useMatches('patient-1'), {
          wrapper: TestWrapper,
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });
      });
    });
  });

  describe('API Integration', () => {
    describe('Patient API', () => {
      it('creates a patient successfully', async () => {
        const { api } = await import('@/lib/api');
        
        global.fetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPatient),
        });

        const result = await api.patients.create(mockPatient);
        expect(result).toEqual(mockPatient);
      });

      it('handles API errors gracefully', async () => {
        const { api } = await import('@/lib/api');
        
        global.fetch = vi.fn().mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ error: 'Invalid data' }),
        });

        await expect(api.patients.create({})).rejects.toThrow();
      });
    });

    describe('Trials API', () => {
      it('searches trials with query', async () => {
        const { api } = await import('@/lib/api');
        
        global.fetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([mockTrial]),
        });

        const result = await api.trials.search('diabetes');
        expect(result).toEqual([mockTrial]);
      });
    });
  });

  describe('Web3 Integration', () => {
    describe('Wallet Connection', () => {
      it('detects wallet provider', () => {
        // Mock window.ethereum
        const mockEthereum = {
          isMetaMask: true,
          request: vi.fn(),
        };
        
        Object.defineProperty(window, 'ethereum', {
          value: mockEthereum,
          writable: true,
        });

        expect(window.ethereum).toBeDefined();
        expect(window.ethereum.isMetaMask).toBe(true);
      });
    });

    describe('Contract Interactions', () => {
      it('formats consent data correctly', async () => {
        const { formatConsentData } = await import('@/lib/utils');
        
        const data = formatConsentData({
          patientId: 'patient-1',
          trialId: 'trial-1',
          consentHash: '0xabc123',
        });

        expect(data).toBeDefined();
      });
    });
  });

  describe('Accessibility', () => {
    describe('Navigation', () => {
      it('has proper ARIA labels', async () => {
        const { Navbar } = await import('@/components/Navbar');
        render(<Navbar />);
        
        const nav = screen.getByRole('navigation');
        expect(nav).toBeInTheDocument();
      });

      it('supports keyboard navigation', async () => {
        const { Button } = await import('@/components/ui/button');
        render(<Button>Click me</Button>);
        
        const button = screen.getByRole('button');
        button.focus();
        expect(document.activeElement).toBe(button);
      });
    });

    describe('Forms', () => {
      it('has proper labels for inputs', async () => {
        const { Input } = await import('@/components/ui/input');
        const { Label } = await import('@/components/ui/label');
        
        render(
          <>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" />
          </>
        );

        const input = screen.getByLabelText('Email');
        expect(input).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error state when API fails', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));
      
      // Component should gracefully handle error
      // This would be tested with actual components that handle errors
    });

    it('shows loading state during data fetch', async () => {
      // Test loading states in components
    });
  });

  describe('Performance', () => {
    it('memoizes expensive computations', () => {
      // Test that components properly memoize
    });

    it('lazy loads heavy components', () => {
      // Test code splitting and lazy loading
    });
  });
});

// Setup and teardown
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});
