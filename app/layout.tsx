import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { BrandSplash } from '@/components/brand-splash';
import { QueryProvider } from '@/components/query-provider';

const bricolage = Bricolage_Grotesque({
  variable: '--font-display',
  subsets: ['latin'],
  display: 'swap',
});

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F6F2' },
    { media: '(prefers-color-scheme: dark)', color: '#0E1512' },
  ],
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'Tallo — Know your shop',
  description: 'Fast, lightweight sales, stock, and credit tracker for shop owners.',
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg',
  },
};

const prePaintInlineScript = `
(function() {
  try {
    var isStandalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && navigator.standalone === true);
    var isLanding = window.location.pathname === '/';
    var hasUrlSplash = window.location.search.indexOf('splash=1') !== -1;
    
    // Check if user has auth cookie
    var hasAuthCookie = document.cookie.indexOf('-auth-token') !== -1;
    var isReturning = !!localStorage.getItem('tallo.returning');
    
    // 1. Standalone PWA redirect away from landing page before paint (Part 2)
    if (isStandalone && isLanding) {
      if (hasAuthCookie) {
        window.location.replace('/home');
        return;
      } else {
        window.location.replace(isReturning ? '/login' : '/signup');
        return;
      }
    }
    
    // 2. Splash decision before paint (Part 1)
    var showSplash = false;
    if (hasUrlSplash) {
      showSplash = true;
    } else if (isStandalone) {
      var pwaCold = !sessionStorage.getItem('tallo.pwa.cold');
      if (pwaCold) {
        showSplash = true;
        sessionStorage.setItem('tallo.pwa.cold', '1');
      }
    } else {
      var firstWebVisit = !localStorage.getItem('tallo.intro.v1');
      if (firstWebVisit) {
        showSplash = true;
        localStorage.setItem('tallo.intro.v1', '1');
      }
    }
    
    if (showSplash) {
      document.documentElement.dataset.splash = '1';
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bricolage.variable} ${inter.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: prePaintInlineScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-text selection:bg-brand-soft selection:text-brand">
        <BrandSplash />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-on-brand focus:shadow-subtle"
        >
          Skip to content
        </a>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <QueryProvider>
            <div id="app-root" className="min-h-full flex flex-col flex-1">
              {children}
            </div>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
