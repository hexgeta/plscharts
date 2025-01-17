import '../styles/global.css';
import React from 'react';
import type { AppProps } from 'next/app';
import NavigationBar from '../components/NavBar';
import Footer from '../components/Footer';
import Head from 'next/head';
import { useRouter } from 'next/router';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isLivestreamPage = router.pathname === '/radio';

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