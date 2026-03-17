import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'AniVerse',
    template: '%s | AniVerse',
  },
  description: 'Tu universo de anime, manga y cultura japonesa. Descubre, conecta y comparte tu pasión.',
  keywords: ['anime', 'manga', 'cultura japonesa', 'comunidad'],
  openGraph: {
    title: 'AniVerse',
    description: 'Tu universo de anime y manga',
    type: 'website',
    locale: 'es_ES',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="es" className={inter.variable}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
