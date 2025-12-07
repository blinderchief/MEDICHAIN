import Link from 'next/link';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { 
  Activity, 
  ArrowRight, 
  CheckCircle2, 
  Lock, 
  Search, 
  Shield, 
  Sparkles,
  Users,
  Wallet,
  Zap 
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-medichain-500 to-medichain-700 flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">MediChain</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-muted-foreground hover:text-foreground transition">
              Features
            </Link>
            <Link href="#how-it-works" className="text-muted-foreground hover:text-foreground transition">
              How It Works
            </Link>
            <Link href="#patients" className="text-muted-foreground hover:text-foreground transition">
              For Patients
            </Link>
            <Link href="#trials" className="text-muted-foreground hover:text-foreground transition">
              For Trials
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition">
                  Sign In
                </button>
              </SignInButton>
              <SignInButton mode="modal">
                <button className="px-4 py-2 text-sm font-medium bg-medichain-600 text-white rounded-lg hover:bg-medichain-700 transition">
                  Get Started
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link 
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium bg-medichain-600 text-white rounded-lg hover:bg-medichain-700 transition"
              >
                Dashboard
              </Link>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-medichain-100 dark:bg-medichain-900/30 text-medichain-700 dark:text-medichain-300 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Powered by SingularityNET AI
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
            The Right Trial.
            <br />
            <span className="gradient-text">The Right Patient.</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Decentralized AI matching for clinical trials. Privacy-first, verified on-chain, 
            with token rewards for participants. No middlemen.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-8 py-4 text-lg font-semibold bg-medichain-600 text-white rounded-xl hover:bg-medichain-700 transition flex items-center gap-2 shadow-lg shadow-medichain-500/25">
                  Find Your Trial
                  <ArrowRight className="w-5 h-5" />
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link 
                href="/dashboard/matches"
                className="px-8 py-4 text-lg font-semibold bg-medichain-600 text-white rounded-xl hover:bg-medichain-700 transition flex items-center gap-2 shadow-lg shadow-medichain-500/25"
              >
                Find Your Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
            </SignedIn>
            <Link 
              href="#how-it-works"
              className="px-8 py-4 text-lg font-semibold border-2 border-border rounded-xl hover:bg-muted transition"
            >
              Learn More
            </Link>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 max-w-4xl mx-auto">
            {[
              { label: 'Active Trials', value: '50,000+' },
              { label: 'Patients Matched', value: '12,500+' },
              { label: 'Match Accuracy', value: '94%' },
              { label: 'ASI Rewards', value: '$1.2M+' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-medichain-600">{stat.value}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-muted/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why MediChain?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A revolutionary approach to clinical trial matching powered by decentralized AI agents.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: 'Privacy-First Design',
                description: 'Your medical data stays private with zero-knowledge proofs and decentralized identifiers (DIDs).',
              },
              {
                icon: Zap,
                title: 'AI-Powered Matching',
                description: 'Gemini AI analyzes eligibility criteria with 94% accuracy using hybrid neuro-symbolic reasoning.',
              },
              {
                icon: Lock,
                title: 'On-Chain Verification',
                description: 'Every match and consent is verified on Base L2 blockchain for immutable audit trails.',
              },
              {
                icon: Wallet,
                title: 'ASI Token Rewards',
                description: 'Earn ASI tokens for participating in trials and contributing to medical research.',
              },
              {
                icon: Search,
                title: 'Real-Time Updates',
                description: 'Connected to ClinicalTrials.gov for the latest trial information and eligibility changes.',
              },
              {
                icon: Users,
                title: 'Patient-Centric',
                description: 'Designed for patients first. Simple onboarding, clear explanations, full control.',
              },
            ].map((feature) => (
              <div 
                key={feature.title}
                className="p-6 rounded-2xl bg-background border card-hover"
              >
                <div className="w-12 h-12 rounded-xl bg-medichain-100 dark:bg-medichain-900/30 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-medichain-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to find your perfect clinical trial match.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: '01',
                title: 'Create Your Profile',
                description: 'Upload your medical records or enter your health information. Your data is encrypted and you control who sees it.',
              },
              {
                step: '02',
                title: 'AI Finds Matches',
                description: 'Our AI agent mesh analyzes 50,000+ trials to find the best matches based on your unique health profile.',
              },
              {
                step: '03',
                title: 'Consent & Enroll',
                description: 'Review matches, sign digital consent, and connect with trial coordinators. Earn ASI tokens along the way.',
              },
            ].map((item, index) => (
              <div key={item.step} className="relative">
                <div className="text-7xl font-bold text-medichain-100 dark:text-medichain-900/30 absolute -top-4 -left-2">
                  {item.step}
                </div>
                <div className="relative z-10 pt-8">
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="w-8 h-8 text-medichain-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-medichain-600 to-medichain-800">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Find Your Trial?
          </h2>
          <p className="text-medichain-100 max-w-2xl mx-auto mb-8">
            Join thousands of patients who have found life-changing clinical trials through MediChain.
          </p>
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-8 py-4 text-lg font-semibold bg-white text-medichain-700 rounded-xl hover:bg-medichain-50 transition">
                Get Started Free
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link 
              href="/dashboard"
              className="inline-block px-8 py-4 text-lg font-semibold bg-white text-medichain-700 rounded-xl hover:bg-medichain-50 transition"
            >
              Go to Dashboard
            </Link>
          </SignedIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-muted/50">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-medichain-500 to-medichain-700 flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold">MediChain</span>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2024 MediChain. Built for SingularityNET Hackathon.
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground transition">Privacy</Link>
              <Link href="/terms" className="hover:text-foreground transition">Terms</Link>
              <Link href="/docs" className="hover:text-foreground transition">Docs</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
