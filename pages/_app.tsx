import '../styles/global.css';
import React from 'react';
import type { AppProps } from 'next/app';
import NavigationBar from '../components/NavBar';
import Footer from '../components/Footer';
import Head from 'next/head';
import { useRouter } from 'next/router';
import MaintenancePage from '../components/MaintenancePage';

// Set this to true to enable maintenance mode
const MAINTENANCE_MODE = true;

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isLivestreamPage = router.pathname === '/radio' || router.pathname === '/liveprices' || router.pathname === '/ethprices' || router.pathname === '/plsprices' || router.pathname === '/pdaiprices' || router.pathname === '/wbtcprices';

  // Check if we're on the private subdomain
  const isPrivateAccess = typeof window !== 'undefined' && window.location.hostname === 'private.lookintomaxi.com';

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
    <div>
      <Head>
        <title>LookIntoMaxi Ⓜ️🛡️🍀🎲🟠</title>
        <meta name="description" content="Don't fade liquid hex stakes bro - This is a Maximus Dao stats & charts site. Earn passive yield in your cold hardware wallet & sell at any time!" />
      </Head>
      {!isLivestreamPage && <NavigationBar />}
      <div className="App">
        <Component {...pageProps} />
      </div>
      {!isLivestreamPage && <Footer/>}
    </div>
  );
}

export default MyApp;