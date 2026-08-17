import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import '../styles/site.css';
import '../styles/home-game.css';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
});

const spaceGrotesk = Space_Grotesk({
  variable: '--font-display',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Arpit Deosthale — Portfolio & Walkable Atlas | AI, Security & Full-Stack',
  description:
    'Portfolio of Arpit Deosthale: ML, and full-stack Engineer.',
  authors: [{ name: 'Arpit Deosthale' }],
  keywords: [
    'Arpit Deosthale',
    'AI Engineer',
    'Machine Learning',
    'Full Stack Developer',
    'IoT',
    'Portfolio',
    'Walkable Atlas',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased motion`}
    >
      <body className="min-h-full bg-[#0a0a0a] text-white selection:bg-amber-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
