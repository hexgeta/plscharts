import '@/styles/global.css';
import React, { useEffect, useState } from 'react';
import type { AppProps } from 'next/app';
import AuthNavBar from '../components/AuthNavBar';
import Footer from '../components/Footer';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MaintenancePage from '../components/MaintenancePage';
import { MusicProvider } from '../contexts/MusicContext';

// Set this to true to enable maintenance mode
const MAINTENANCE_MODE = false;

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [isPrivateAccess, setIsPrivateAccess] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const isLivestreamPage = router.pathname === '/radio' || 
                          router.pathname === '/liveprices' || 
                          router.pathname === '/ethprices' || 
                          router.pathname === '/plsprices' || 
                          router.pathname === '/pdaiprices' || 
                          router.pathname === '/wbtcprices' ||
                          router.pathname === '/hero';

  useEffect(() => {
    setIsMounted(true);
    const hostname = window.location.hostname;
    setIsPrivateAccess(hostname === 'private.lookintomaxi.com' || hostname === 'localhost');
  }, []);

  if (!isMounted) {
    return null;
  }

  // Show maintenance page only if maintenance mode is on AND we're not on private subdomain
  if (MAINTENANCE_MODE && !isPrivateAccess) {
    return (
      <>
        <Head>
          <title>Maintenance - LookIntoMaxi Ⓜ️🛡️🍀🎲🟠</title>
          <meta name="description" content="Site is currently under maintenance." />
        </Head>
        <MaintenancePage />
      </>
    );
  }

  return (
    <MusicProvider>
      <Head>
        <title>LookIntoMaxi Ⓜ️🛡️🍀🎲🟠</title>
        <meta name="description" content="Don't fade liquid hex stakes bro - This is a Maximus Dao stats & charts site. Earn passive yield in your cold hardware wallet & sell at any time!" />
        {isPrivateAccess && (
          <>
            <meta name="robots" content="noindex, nofollow" />
            <meta name="googlebot" content="noindex, nofollow" />
          </>
        )}
      </Head>
      {!isLivestreamPage && <AuthNavBar />}
      <div className="App">
        <Component {...pageProps} />
      </div>
      {!isLivestreamPage && <Footer/>}
    </MusicProvider>
  );
}

export default MyApp;