"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { LayoutDashboard, FlaskConical, Heart, User, Menu, X, Sparkles, Wallet } from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Trials", href: "/dashboard/trials", icon: FlaskConical },
  { name: "My Matches", href: "/dashboard/matches", icon: Heart, requiresAuth: true },
  { name: "Profile", href: "/dashboard/profile", icon: User, requiresAuth: true },
];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useUser();
  const { isConnected, address } = useAccount();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const filteredNavigation = navigation.filter(
    (item) => !item.requiresAuth || isSignedIn
  );

  const isLandingPage = pathname === "/";

  return (
    <nav 
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled || !isLandingPage
          ? "bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-700/80 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-18">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <div className="w-9 h-9 bg-gradient-to-br from-medichain-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-medichain-500/25 group-hover:shadow-medichain-500/40 transition-shadow">
                <FlaskConical className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight">
                <span className={scrolled || !isLandingPage ? "text-slate-900 dark:text-white" : "text-white"}>Medi</span>
                <span className="text-medichain-500">Chain</span>
              </span>
              <span className={`text-[10px] font-medium tracking-wider uppercase ${
                scrolled || !isLandingPage ? "text-slate-500" : "text-white/70"
              }`}>
                Clinical Trials
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-full p-1.5">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    isActive
                      ? "bg-white dark:bg-slate-700 text-medichain-600 dark:text-medichain-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2.5">
            {/* Wallet Status Badge */}
            {isConnected && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-full">
                <div className="relative">
                  <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                </div>
                <span className="text-xs font-mono font-medium text-emerald-700 dark:text-emerald-400">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
              </div>
            )}

            {/* Web3 Connect Button */}
            <div className="hidden sm:block">
              <ConnectButton 
                chainStatus="icon" 
                showBalance={false}
                accountStatus={{
                  smallScreen: 'avatar',
                  largeScreen: 'full',
                }}
              />
            </div>

            {/* Auth Buttons */}
            {isLoaded && (
              <>
                {isSignedIn ? (
                  <div className="flex items-center gap-2">
                    <UserButton
                      afterSignOutUrl="/"
                      appearance={{
                        elements: {
                          avatarBox: "w-9 h-9 ring-2 ring-slate-200 dark:ring-slate-700 ring-offset-2 ring-offset-white dark:ring-offset-slate-900",
                        },
                      }}
                    />
                  </div>
                ) : (
                  <div className="hidden sm:flex items-center gap-2">
                    <SignInButton mode="modal">
                      <button className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                        scrolled || !isLandingPage
                          ? "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                          : "text-white/90 hover:text-white hover:bg-white/10"
                      }`}>
                        Sign In
                      </button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <button className="group relative px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-medichain-500 to-blue-600 rounded-xl hover:from-medichain-600 hover:to-blue-700 transition-all shadow-lg shadow-medichain-500/25 hover:shadow-medichain-500/40 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Get Started
                      </button>
                    </SignUpButton>
                  </div>
                )}
              </>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2.5 rounded-xl transition-colors ${
                scrolled || !isLandingPage
                  ? "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  : "text-white hover:bg-white/10"
              }`}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700 shadow-xl animate-fade-in-up">
          <div className="px-4 py-5 space-y-2">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-medichain-50 dark:bg-medichain-900/30 text-medichain-600 dark:text-medichain-400 border border-medichain-200 dark:border-medichain-800"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    isActive 
                      ? "bg-medichain-100 dark:bg-medichain-900/50" 
                      : "bg-slate-100 dark:bg-slate-800"
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {item.name}
                </Link>
              );
            })}

            {/* Mobile Web3 & Auth */}
            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex justify-center">
                <ConnectButton />
              </div>
              
              {isLoaded && !isSignedIn && (
                <div className="flex gap-2">
                  <SignInButton mode="modal">
                    <button className="flex-1 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                      Sign In
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-medichain-500 to-blue-600 rounded-xl flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Get Started
                    </button>
                  </SignUpButton>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
