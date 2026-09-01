import './globals.css';
import type { Metadata } from 'next';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Mivo — Unified Real-Time Communication Platform',
  description:
    'Experience fluid real-time communication across chat, voice huddles, video meetings, screen sharing, and live broadcast stages.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#0B0E14] text-slate-100 antialiased h-screen w-screen overflow-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
