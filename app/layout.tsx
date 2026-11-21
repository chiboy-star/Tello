import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { BrandSplash } from '@/components/brand-splash';
import { SwLifecycle } from '@/components/sw-lifecycle';
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

const criticalBackgroundCss = `
  html {
    background-color: #F7F6F2;
    color: #14201B;
  }
  html.dark {
    background-color: #0E1512 !important;
    color: #EAF0EC !important;
  }
  @media (prefers-color-scheme: dark) {
    html:not(.light) {
      background-color: #0E1512 !important;
      color: #EAF0EC !important;
    }
  }
  #brand-splash {
    background-color: #F7F6F2;
  }
  html.dark #brand-splash {
    background-color: #0E1512 !important;
  }
  @media (prefers-color-scheme: dark) {
    html:not(.light) #brand-splash {
      background-color: #0E1512 !important;
    }
  }
`;

const prePaintInlineScript = `
(function() {
  try {
    // 1. Theme application before first paint (eliminates white flash in dark mode)
    var savedTheme = localStorage.getItem('theme');
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = savedTheme === 'dark' || (!savedTheme && systemDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.documentElement.style.backgroundColor = '#0E1512';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.documentElement.style.backgroundColor = '#F7F6F2';
    }

    var isStandalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && navigator.standalone === true);
    var isLanding = window.location.pathname === '/';
    var search = window.location.search;
    var hasForceSplash = search.indexOf('splash=1') !== -1;
    var hasSuppressSplash = search.indexOf('splash=0') !== -1;
    
    // Standalone PWA redirect away from landing page before paint (Part 2)
    var hasAuthCookie = document.cookie.indexOf('-auth-token') !== -1;
    var isReturning = !!localStorage.getItem('tallo.returning');
    if (isStandalone && isLanding) {
      if (hasAuthCookie) {
        window.location.replace('/home');
        return;
      } else {
        window.location.replace(isReturning ? '/login' : '/signup');
        return;
      }
    }
    
    // 2. Splash decision before paint (Part 1 Policy Change)
    var showSplash = false;
    if (hasSuppressSplash) {
      showSplash = false;
    } else if (hasForceSplash) {
      showSplash = true;
      try { sessionStorage.setItem('tallo.splash.session', '1'); } catch(e) {}
    } else if (isStandalone) {
      // Installed PWA: every cold launch (compact version), same session flag
      var pwaSession = sessionStorage.getItem('tallo.splash.session');
      if (!pwaSession) {
        showSplash = true;
        try { sessionStorage.setItem('tallo.splash.session', '1'); } catch(e) {}
      }
    } else {
      // Web: first page load of every browser session (new tab/window) on whatever route
      var webSession = sessionStorage.getItem('tallo.splash.session');
      if (!webSession) {
        showSplash = true;
        try {
          sessionStorage.setItem('tallo.splash.session', '1');
          localStorage.setItem('tallo.intro.v1', '1');
        } catch(e) {}
      }
    }
    
    if (showSplash) {
      document.documentElement.dataset.splash = '1';
    } else {
      document.documentElement.dataset.splash = '0';
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
        <meta name="color-scheme" content="light dark" />
        <style dangerouslySetInnerHTML={{ __html: criticalBackgroundCss }} />
        <script dangerouslySetInnerHTML={{ __html: prePaintInlineScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-text selection:bg-brand-soft selection:text-brand">
        <BrandSplash />
        <SwLifecycle />
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
