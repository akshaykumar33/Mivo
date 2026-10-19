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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300..800;1,14..32,300..800&family=Plus+Jakarta+Sans:ital,wght@0,400..800;1,400..800&family=JetBrains+Mono:ital,wght@0,400..700;1,400..700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('mivo_theme');
                if (!theme || theme === 'midnight') {
                  theme = 'crimson-cream';
                  localStorage.setItem('mivo_theme', 'crimson-cream');
                }
                document.documentElement.setAttribute('data-theme', theme);
                if (theme === 'crimson-cream' || theme === 'light-frost' || theme === 'solar-warm') {
                  document.documentElement.classList.add('light-mode');
                  document.documentElement.classList.remove('dark-mode');
                } else {
                  document.documentElement.classList.add('dark-mode');
                  document.documentElement.classList.remove('light-mode');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="antialiased h-screen w-screen overflow-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

