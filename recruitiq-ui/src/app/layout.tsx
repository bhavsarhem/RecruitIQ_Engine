import type { Metadata } from 'next';
import './globals.css';
import LenisProvider from '@/components/LenisProvider';

export const metadata: Metadata = {
  title: 'RecruitIQ — AI-Powered Candidate Intelligence Platform',
  description: 'Enterprise Candidate Fit Intelligence & Neural Scoring',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-[#04060c] text-white" suppressHydrationWarning>
        <LenisProvider>
          {children}
        </LenisProvider>
      </body>
    </html>
  );
}
