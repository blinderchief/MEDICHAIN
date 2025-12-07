"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

// Pages that have their own navigation (landing/marketing pages)
const pagesWithCustomNav = ["/"];

// Pages that shouldn't show global footer (have their own or shouldn't have footer)
const pagesWithoutFooter = ["/", "/sign-in", "/sign-up"];

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  const showNavbar = !pagesWithCustomNav.includes(pathname);
  const showFooter = !pagesWithoutFooter.some(page => pathname === page || pathname.startsWith(page + "/"));

  return (
    <>
      {showNavbar && <Navbar />}
      <main className={showNavbar ? "flex-1" : "flex-1"}>
        {children}
      </main>
      {showFooter && <Footer />}
    </>
  );
}
