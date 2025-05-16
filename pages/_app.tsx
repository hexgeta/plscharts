import '@/styles/global.css';
import React from 'react';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { SWRConfig } from 'swr';
import { swrConfig } from '@/utils/swr-config';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import Footer from '@/components/Footer';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <SWRConfig value={swrConfig}>
      <ThemeProvider>
        <Head>
          <title>PLSCharts</title>
          <meta name="description" content="PlsCharts.com" />
        </Head>
        <div className="App">
          <Component {...pageProps} />
        </div>
        <Footer />
        <Toaster />
      </ThemeProvider>
    </SWRConfig>
  );
}