'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Heart,
  Pill,
  FileText,
  Shield,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Plus,
  Trash2,
  Save,
  X,
  Dna,
  Activity,
  Stethoscope
} from 'lucide-react';

// Mock profile data
const mockProfile = {
  personalInfo: {
    dateOfBirth: '1985-06-15',
    gender: 'Male',
    ethnicity: 'Caucasian',
    phone: '+1 (555) 123-4567',
    address: 'Boston, MA 02115',
  },
  medicalConditions: [
    { id: '1', name: 'Type 2 Diabetes', diagnosedDate: '2019-03-15', status: 'active' },
    { id: '2', name: 'Hypertension', diagnosedDate: '2018-07-20', status: 'controlled' },
    { id: '3', name: 'Hyperlipidemia', diagnosedDate: '2020-01-10', status: 'active' },
  ],
  medications: [
    { id: '1', name: 'Metformin', dosage: '1000mg', frequency: 'Twice daily' },
    { id: '2', name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily' },
    { id: '3', name: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily at bedtime' },
  ],
  labResults: [
    { id: '1', name: 'HbA1c', value: '8.2%', date: '2024-11-15', status: 'elevated' },
    { id: '2', name: 'Blood Pressure', value: '128/82 mmHg', date: '2024-11-15', status: 'normal' },
    { id: '3', name: 'LDL Cholesterol', value: '145 mg/dL', date: '2024-11-15', status: 'elevated' },
    { id: '4', name: 'eGFR', value: '78 mL/min', date: '2024-11-15', status: 'normal' },
  ],
  geneticData: {
    uploaded: false,
    provider: null,
  },
  consentHistory: [
    { id: '1', trialName: 'Digital CBT for Depression', date: '2024-11-20', txHash: '0x1234...5678' },
  ],
};

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-medichain-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground">Loading your profile...</span>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'conditions', label: 'Conditions', icon: Heart },
    { id: 'medications', label: 'Medications', icon: Pill },
    { id: 'labs', label: 'Lab Results', icon: Activity },
    { id: 'genetic', label: 'Genetic Data', icon: Dna },
    { id: 'consents', label: 'Consent History', icon: Shield },
  ];

  const profileCompletion = 94;

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-medichain-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-medichain-500/25">
                  {user?.firstName?.[0]}{user?.lastName?.[0] || ''}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-950 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold">{user?.fullName || 'Your Profile'}</h1>
                <p className="text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="badge-success">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Member since {new Date(user?.createdAt || Date.now()).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition font-medium"
            >
              {isEditing ? (
                <>
                  <X className="w-4 h-4" />
                  Cancel
                </>
              ) : (
                <>
                  <Edit2 className="w-4 h-4" />
                  Edit Profile
                </>
              )}
            </button>
          </div>

          {/* Profile Completion */}
          <div className="mt-6 p-4 rounded-xl bg-white dark:bg-slate-900 border shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium">Profile Completion</span>
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{profileCompletion}%</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-1000"
                style={{ width: `${profileCompletion}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Add genetic data to complete your profile and unlock more trial matches.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition ${
                  isActive
                    ? 'bg-medichain-100 dark:bg-medichain-900/40 text-medichain-700 dark:text-medichain-300 border border-medichain-200 dark:border-medichain-800'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'overview' && (
              <>
                {/* Personal Information */}
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border shadow-sm">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-medichain-500" />
                    Personal Information
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Date of Birth</label>
                      <p className="font-medium">{new Date(mockProfile.personalInfo.dateOfBirth).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Gender</label>
                      <p className="font-medium">{mockProfile.personalInfo.gender}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Ethnicity</label>
                      <p className="font-medium">{mockProfile.personalInfo.ethnicity}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Phone</label>
                      <p className="font-medium">{mockProfile.personalInfo.phone}</p>
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm text-muted-foreground">Location</label>
                      <p className="font-medium flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        {mockProfile.personalInfo.address}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border shadow-sm text-center">
                    <p className="text-3xl font-bold text-pink-500">{mockProfile.medicalConditions.length}</p>
                    <p className="text-sm text-muted-foreground">Conditions</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border shadow-sm text-center">
                    <p className="text-3xl font-bold text-blue-500">{mockProfile.medications.length}</p>
                    <p className="text-sm text-muted-foreground">Medications</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border shadow-sm text-center">
                    <p className="text-3xl font-bold text-emerald-500">{mockProfile.labResults.length}</p>
                    <p className="text-sm text-muted-foreground">Lab Results</p>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'conditions' && (
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Heart className="w-5 h-5 text-pink-500" />
                    Medical Conditions
                  </h2>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-medichain-50 dark:bg-medichain-900/30 text-medichain-600 dark:text-medichain-400 text-sm font-medium hover:bg-medichain-100 dark:hover:bg-medichain-900/50 transition">
                    <Plus className="w-4 h-4" />
                    Add Condition
                  </button>
                </div>
                <div className="space-y-3">
                  {mockProfile.medicalConditions.map((condition) => (
                    <div 
                      key={condition.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700"
                    >
                      <div>
                        <p className="font-medium">{condition.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Diagnosed: {new Date(condition.diagnosedDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          condition.status === 'active' 
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                        }`}>
                          {condition.status}
                        </span>
                        {isEditing && (
                          <button className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'medications' && (
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Pill className="w-5 h-5 text-blue-500" />
                    Current Medications
                  </h2>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-medichain-50 dark:bg-medichain-900/30 text-medichain-600 dark:text-medichain-400 text-sm font-medium hover:bg-medichain-100 dark:hover:bg-medichain-900/50 transition">
                    <Plus className="w-4 h-4" />
                    Add Medication
                  </button>
                </div>
                <div className="space-y-3">
                  {mockProfile.medications.map((med) => (
                    <div 
                      key={med.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700"
                    >
                      <div>
                        <p className="font-medium">{med.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {med.dosage} • {med.frequency}
                        </p>
                      </div>
                      {isEditing && (
                        <button className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'labs' && (
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-500" />
                    Lab Results
                  </h2>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-medichain-50 dark:bg-medichain-900/30 text-medichain-600 dark:text-medichain-400 text-sm font-medium hover:bg-medichain-100 dark:hover:bg-medichain-900/50 transition">
                    <Plus className="w-4 h-4" />
                    Upload Results
                  </button>
                </div>
                <div className="space-y-3">
                  {mockProfile.labResults.map((lab) => (
                    <div 
                      key={lab.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700"
                    >
                      <div>
                        <p className="font-medium">{lab.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(lab.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{lab.value}</span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          lab.status === 'elevated' 
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                        }`}>
                          {lab.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'genetic' && (
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border shadow-sm">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Dna className="w-5 h-5 text-purple-500" />
                  Genetic Data
                </h2>
                {!mockProfile.geneticData.uploaded ? (
                  <div className="text-center py-12 px-6">
                    <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center mx-auto mb-4">
                      <Dna className="w-8 h-8 text-purple-500" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No Genetic Data</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      Upload your genetic data from 23andMe, AncestryDNA, or other providers to unlock personalized trial matches based on your genetic profile.
                    </p>
                    <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-semibold hover:from-purple-600 hover:to-indigo-600 transition shadow-lg shadow-purple-500/25">
                      Connect Genetic Data
                    </button>
                  </div>
                ) : (
                  <p>Genetic data from {mockProfile.geneticData.provider}</p>
                )}
              </div>
            )}

            {activeTab === 'consents' && (
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border shadow-sm">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-medichain-500" />
                  Consent History
                </h2>
                <div className="space-y-3">
                  {mockProfile.consentHistory.map((consent) => (
                    <div 
                      key={consent.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700"
                    >
                      <div>
                        <p className="font-medium">{consent.trialName}</p>
                        <p className="text-sm text-muted-foreground">
                          Consented: {new Date(consent.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="badge-success">
                          <CheckCircle2 className="w-3 h-3" />
                          On-chain
                        </span>
                        <a 
                          href={`https://basescan.org/tx/${consent.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-medichain-600 hover:text-medichain-700 font-mono"
                        >
                          {consent.txHash}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Data Privacy Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-medichain-600 via-medichain-700 to-blue-800 text-white shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5" />
                <h3 className="font-semibold">Your Data is Protected</h3>
              </div>
              <ul className="space-y-2 text-sm text-white/80">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  End-to-end encrypted
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  HIPAA compliant storage
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  On-chain consent verification
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  You control who sees your data
                </li>
              </ul>
            </div>

            {/* Connected Providers */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border shadow-sm">
              <h3 className="font-semibold mb-4">Connected Providers</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                      <Stethoscope className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Epic MyChart</p>
                      <p className="text-xs text-muted-foreground">Connected</p>
                    </div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
                <button className="w-full p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-sm text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" />
                  Connect Provider
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
