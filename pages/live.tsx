import { GetServerSideProps } from 'next';
import { useEffect } from 'react';
import Head from 'next/head';

// This could be moved to an environment variable or API endpoint later
const STREAM_URL = 'https://x.com/i/broadcasts/1kvKpynqlqdGE';
const BASE_URL = 'https://app.lookintomaxi.com';

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  // Server-side redirect
  res.setHeader('Location', STREAM_URL);
  res.statusCode = 302;
  res.end();

  return {
    props: {
      timestamp: Date.now(),
    },
  };
};

export default function LivePage() {
  useEffect(() => {
    // Client-side redirect backup
    window.location.href = STREAM_URL;
  }, []);

  return (
    <>
      <Head>
        {/* Primary Meta Tags */}
        <title>LookIntoMaxi Live Stream</title>
        <meta name="title" content="LookIntoMaxi Live Stream" />
        <meta name="description" content="Join the live stream now! Real-time crypto analysis and community discussion." />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${BASE_URL}/live`} />
        <meta property="og:title" content="LookIntoMaxi Live Stream" />
        <meta property="og:description" content="Join the live stream now! Real-time crypto analysis and community discussion." />
        <meta property="og:image" content={`${BASE_URL}/og-image.jpg`} />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={`${BASE_URL}/live`} />
        <meta property="twitter:title" content="LookIntoMaxi Live Stream" />
        <meta property="twitter:description" content="Join the live stream now! Real-time crypto analysis and community discussion." />
        <meta property="twitter:image" content={`${BASE_URL}/og-image.jpg`} />

        {/* Force social media platforms to fetch fresh metadata */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </Head>
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Redirecting to Live Stream...</h1>
          <p className="text-gray-400">If you are not redirected, <a href={STREAM_URL} className="text-blue-400 hover:text-blue-300">click here</a></p>
        </div>
      </div>
    </>
  );
} 