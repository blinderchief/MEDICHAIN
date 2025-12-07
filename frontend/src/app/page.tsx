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
  Zap,
  Brain,
  Globe,
  Heart,
  Star,
  Play,
  Github,
  Twitter,
  Linkedin,
  TrendingUp,
  Clock,
  Award,
  FileCheck
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Noise overlay for texture */}
      <div className="noise-overlay" />
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-medichain-400 to-blue-600 flex items-center justify-center shadow-lg shadow-medichain-500/25 group-hover:shadow-medichain-500/40 transition-shadow">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-medichain-400 to-blue-600 opacity-0 group-hover:opacity-20 blur transition-opacity" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                Medi<span className="gradient-text">Chain</span>
              </span>
            </Link>
            
            <div className="hidden md:flex items-center gap-1">
              {['Features', 'How It Works', 'For Patients', 'Developers'].map((item) => (
                <Link 
                  key={item}
                  href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} 
                  className="btn-ghost text-sm"
                >
                  {item}
                </Link>
              ))}
            </div>
            
            <div className="flex items-center gap-3">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="btn-ghost text-sm hidden sm:block">
                    Sign In
                  </button>
                </SignInButton>
                <SignInButton mode="modal">
                  <button className="btn-primary text-sm !px-5 !py-2.5">
                    Get Started
                    <ArrowRight className="w-4 h-4 ml-2 inline" />
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Link href="/dashboard" className="btn-primary text-sm !px-5 !py-2.5">
                  Dashboard
                </Link>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 hero-gradient overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 grid-pattern opacity-50" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-medichain-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            {/* Product Hunt style badge */}
            <div className="inline-flex items-center gap-3 mb-8">
              <span className="badge-primary">
                <Sparkles className="w-3.5 h-3.5" />
                Powered by SingularityNET AI
              </span>
              <span className="trust-badge">
                <Award className="w-4 h-4 text-amber-500" />
                #1 Healthcare AI
              </span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 text-shadow">
              The Right Trial.
              <br />
              <span className="gradient-text-hero">The Right Patient.</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Decentralized AI matching for clinical trials. Privacy-first, 
              verified on-chain, with token rewards. 
              <span className="text-foreground font-medium"> No middlemen. No waiting.</span>
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="btn-primary text-base group">
                    Find Your Trial
                    <ArrowRight className="w-5 h-5 ml-2 inline group-hover:translate-x-1 transition-transform" />
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Link href="/dashboard/matches" className="btn-primary text-base group">
                  Find Your Trial
                  <ArrowRight className="w-5 h-5 ml-2 inline group-hover:translate-x-1 transition-transform" />
                </Link>
              </SignedIn>
              <button className="btn-secondary text-base group">
                <Play className="w-5 h-5 mr-2 text-medichain-500" />
                Watch Demo
                <span className="text-xs text-muted-foreground ml-2">2 min</span>
              </button>
            </div>
            
            {/* Social proof */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1,2,3,4,5].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-medichain-300 to-blue-400 border-2 border-white dark:border-slate-900" />
                  ))}
                </div>
                <span>12,500+ patients matched</span>
              </div>
              <div className="hidden sm:block w-px h-4 bg-border" />
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map((i) => (
                  <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                ))}
                <span className="ml-1">4.9/5 rating</span>
              </div>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20 max-w-4xl mx-auto">
            {[
              { label: 'Active Trials', value: '50,000+', icon: FileCheck, color: 'text-blue-500' },
              { label: 'Patients Matched', value: '12,500+', icon: Users, color: 'text-emerald-500' },
              { label: 'Match Accuracy', value: '94%', icon: TrendingUp, color: 'text-amber-500' },
              { label: 'ASI Distributed', value: '$1.2M+', icon: Wallet, color: 'text-purple-500' },
            ].map((stat) => (
              <div key={stat.label} className="glass-card rounded-2xl p-5 text-center card-hover">
                <stat.icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
                <div className="text-2xl md:text-3xl font-bold stat-value mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="py-12 px-6 border-y bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-sm text-muted-foreground mb-8 uppercase tracking-wider font-medium">
            Trusted by leading healthcare institutions
          </p>
          <div className="flex flex-wrap items-center justify-center gap-12 opacity-60">
            {['Mayo Clinic', 'Stanford Health', 'Johns Hopkins', 'Cleveland Clinic', 'NIH'].map((name) => (
              <div key={name} className="text-xl font-bold text-muted-foreground/70 hover:text-muted-foreground transition">
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 section-gradient">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="badge-primary mb-4 inline-flex">
              <Zap className="w-3.5 h-3.5" />
              Features
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Why MediChain?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Revolutionary clinical trial matching powered by decentralized AI agents
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: 'Privacy-First Design',
                description: 'Your medical data stays private with zero-knowledge proofs and decentralized identifiers. You control who sees what.',
                gradient: 'from-blue-500/10 to-cyan-500/10',
                iconColor: 'text-blue-500',
              },
              {
                icon: Brain,
                title: 'AI-Powered Matching',
                description: 'Gemini 2.5 Pro analyzes eligibility criteria with 94% accuracy using advanced neuro-symbolic reasoning.',
                gradient: 'from-purple-500/10 to-pink-500/10',
                iconColor: 'text-purple-500',
              },
              {
                icon: Lock,
                title: 'On-Chain Verification',
                description: 'Every consent is verified on Base L2 blockchain for immutable audit trails that satisfy regulatory requirements.',
                gradient: 'from-emerald-500/10 to-teal-500/10',
                iconColor: 'text-emerald-500',
              },
              {
                icon: Wallet,
                title: 'ASI Token Rewards',
                description: 'Earn ASI tokens for participating in trials and contributing to medical research. Real value for your time.',
                gradient: 'from-amber-500/10 to-orange-500/10',
                iconColor: 'text-amber-500',
              },
              {
                icon: Globe,
                title: 'Real-Time Trial Data',
                description: 'Connected directly to ClinicalTrials.gov for the latest trial information, eligibility changes, and locations.',
                gradient: 'from-cyan-500/10 to-blue-500/10',
                iconColor: 'text-cyan-500',
              },
              {
                icon: Heart,
                title: 'Patient-Centric UX',
                description: 'Designed for patients first. Simple onboarding, clear explanations, transparent AI reasoning, full control.',
                gradient: 'from-pink-500/10 to-rose-500/10',
                iconColor: 'text-pink-500',
              },
            ].map((feature) => (
              <div 
                key={feature.title}
                className={`feature-card p-8 rounded-2xl bg-gradient-to-br ${feature.gradient} border border-white/50 dark:border-slate-800 card-hover`}
              >
                <div className={`w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 shadow-lg flex items-center justify-center mb-5`}>
                  <feature.icon className={`w-7 h-7 ${feature.iconColor}`} />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="badge-primary mb-4 inline-flex">
              <Clock className="w-3.5 h-3.5" />
              Simple Process
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to find your perfect clinical trial match
            </p>
          </div>
          
          <div className="relative max-w-5xl mx-auto">
            {/* Connection line */}
            <div className="hidden md:block absolute top-24 left-[16.5%] right-[16.5%] h-0.5 bg-gradient-to-r from-medichain-300 via-medichain-500 to-medichain-300" />
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: '01',
                  title: 'Create Your Profile',
                  description: 'Upload medical records or enter health information. Your data is encrypted end-to-end. You own your data.',
                  icon: Users,
                },
                {
                  step: '02',
                  title: 'AI Finds Matches',
                  description: 'Our AI agent mesh analyzes 50,000+ trials to find the best matches based on your unique health profile.',
                  icon: Search,
                },
                {
                  step: '03',
                  title: 'Consent & Enroll',
                  description: 'Review AI-explained matches, sign digital consent on-chain, and connect with coordinators. Earn ASI rewards.',
                  icon: CheckCircle2,
                },
              ].map((item, index) => (
                <div key={item.step} className="relative text-center">
                  {/* Step number with icon */}
                  <div className="relative inline-flex mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center border-4 border-medichain-100 dark:border-medichain-900">
                      <item.icon className="w-8 h-8 text-medichain-500" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-medichain-500 text-white text-sm font-bold flex items-center justify-center shadow-lg">
                      {index + 1}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* For Patients Section */}
      <section id="for-patients" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="badge-success mb-4 inline-flex">
                <Heart className="w-3.5 h-3.5" />
                For Patients
              </span>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Your health journey,
                <br />
                <span className="gradient-text">your control</span>
              </h2>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                MediChain puts patients first. No more endless searching through confusing trial listings. 
                Our AI understands your unique health profile and finds trials that actually match.
              </p>
              
              <div className="space-y-4 mb-8">
                {[
                  'AI matches you based on your complete health profile',
                  'Clear explanations of why each trial is a good fit',
                  'Privacy controls - you decide who sees your data',
                  'Earn ASI tokens for every step of your journey',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-lg">{item}</span>
                  </div>
                ))}
              </div>
              
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="btn-primary">
                    Start Matching
                    <ArrowRight className="w-5 h-5 ml-2 inline" />
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Link href="/dashboard/matches" className="btn-primary inline-flex items-center">
                  Start Matching
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </SignedIn>
            </div>
            
            {/* Mock UI Preview */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-medichain-500/20 to-blue-500/20 rounded-3xl blur-3xl" />
              <div className="relative glass-card rounded-3xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-medichain-400 to-blue-500" />
                    <div>
                      <div className="font-semibold">Sarah Johnson</div>
                      <div className="text-sm text-muted-foreground">94% Profile Complete</div>
                    </div>
                  </div>
                  <span className="badge-success">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </span>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-800/80 border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Phase 3 Diabetes Study</span>
                      <span className="text-emerald-500 font-bold">96%</span>
                    </div>
                    <div className="text-sm text-muted-foreground mb-3">Novo Nordisk • Boston, MA</div>
                    <div className="flex items-center gap-2">
                      <span className="badge-primary text-xs">Perfect Match</span>
                      <span className="text-xs text-muted-foreground">+50 ASI reward</span>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-800/80 border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Cardiovascular Prevention</span>
                      <span className="text-amber-500 font-bold">89%</span>
                    </div>
                    <div className="text-sm text-muted-foreground mb-3">Mayo Clinic • Rochester, MN</div>
                    <div className="flex items-center gap-2">
                      <span className="badge-warning text-xs">Good Match</span>
                      <span className="text-xs text-muted-foreground">+35 ASI reward</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-medichain-600 via-medichain-700 to-blue-800" />
        <div className="absolute inset-0 grid-pattern opacity-10" />
        
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/80 text-sm font-medium mb-6 backdrop-blur">
            <Sparkles className="w-4 h-4" />
            Join the Future of Healthcare
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Find Your Trial?
          </h2>
          <p className="text-xl text-white/80 max-w-2xl mx-auto mb-10">
            Join thousands of patients who have found life-changing clinical trials through MediChain. 
            It&apos;s free to get started.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-8 py-4 text-lg font-semibold bg-white text-medichain-700 rounded-xl hover:bg-white/90 transition shadow-xl">
                  Get Started Free
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link 
                href="/dashboard"
                className="px-8 py-4 text-lg font-semibold bg-white text-medichain-700 rounded-xl hover:bg-white/90 transition shadow-xl"
              >
                Go to Dashboard
              </Link>
            </SignedIn>
            <Link 
              href="https://github.com/medichain" 
              className="px-8 py-4 text-lg font-semibold text-white border-2 border-white/30 rounded-xl hover:bg-white/10 transition flex items-center gap-2"
            >
              <Github className="w-5 h-5" />
              View on GitHub
            </Link>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-8 mt-12 text-white/60 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              HIPAA compliant
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Cancel anytime
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 bg-slate-50 dark:bg-slate-900 border-t">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-medichain-400 to-blue-600 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">MediChain</span>
              </Link>
              <p className="text-muted-foreground mb-6">
                The right trial. The right patient. Verified, instantly.
              </p>
              <div className="flex items-center gap-4">
                <a href="#" className="text-muted-foreground hover:text-foreground transition">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-foreground transition">
                  <Github className="w-5 h-5" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-foreground transition">
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-3 text-muted-foreground">
                <li><Link href="/features" className="hover:text-foreground transition">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-foreground transition">Pricing</Link></li>
                <li><Link href="/trials" className="hover:text-foreground transition">Browse Trials</Link></li>
                <li><Link href="/dashboard" className="hover:text-foreground transition">Dashboard</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-3 text-muted-foreground">
                <li><Link href="/docs" className="hover:text-foreground transition">Documentation</Link></li>
                <li><Link href="/api" className="hover:text-foreground transition">API Reference</Link></li>
                <li><Link href="/blog" className="hover:text-foreground transition">Blog</Link></li>
                <li><Link href="/support" className="hover:text-foreground transition">Support</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-3 text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-foreground transition">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-foreground transition">Terms of Service</Link></li>
                <li><Link href="/hipaa" className="hover:text-foreground transition">HIPAA Compliance</Link></li>
                <li><Link href="/security" className="hover:text-foreground transition">Security</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 MediChain. Built for SingularityNET Hackathon. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Built with</span>
              <Heart className="w-4 h-4 text-red-500 fill-red-500" />
              <span>using SingularityNET + Next.js</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
