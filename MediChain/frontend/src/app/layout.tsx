import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/Providers';
import { ClientLayout } from '@/components/ClientLayout';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'MediChain | Decentralized Clinical Trial Matching',
  description: 'The right trial. The right patient. Verified, instantly — no middlemen.',
  keywords: ['clinical trials', 'AI matching', 'decentralized', 'healthcare', 'blockchain'],
  authors: [{ name: 'MediChain Team' }],
  openGraph: {
    title: 'MediChain | Decentralized Clinical Trial Matching',
    description: 'The right trial. The right patient. Verified, instantly — no middlemen.',
    url: 'https://medichain.io',
    siteName: 'MediChain',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MediChain | Decentralized Clinical Trial Matching',
    description: 'The right trial. The right patient. Verified, instantly — no middlemen.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased min-h-screen bg-gray-50 flex flex-col`}>
        <Providers>
          <ClientLayout>
            {children}
          </ClientLayout>
        </Providers>
      </body>
    </html>
  );
}
