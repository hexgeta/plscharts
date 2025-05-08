import { GetServerSideProps } from 'next';
import Head from 'next/head';

// This could be moved to an environment variable or API endpoint later
const STREAM_URL = 'https://x.com/i/broadcasts/1kvKpynqlqdGE';
const BASE_URL = 'https://app.lookintomaxi.com';

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  // Check if the request is from Twitter's bot
  const userAgent = req.headers['user-agent'] || '';
  const isTwitterBot = userAgent.toLowerCase().includes('twitterbot');

  if (!isTwitterBot) {
    // If not Twitter bot, redirect
    res.setHeader('Location', STREAM_URL);
    res.statusCode = 302;
    res.end();
  }

  return {
    props: {},
  };
};

export default function LivePage() {
  return (
    <>
      <Head>
        {/* Primary Meta Tags */}
        <title>🔴 LookIntoMaxi Live Stream</title>
        <meta name="title" content="🔴 LookIntoMaxi Live Stream" />
        <meta name="description" content="Join the live stream now! Real-time crypto analysis and community discussion 🚀" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${BASE_URL}/live`} />
        <meta property="og:title" content="🔴 LookIntoMaxi Live Stream" />
        <meta property="og:description" content="Join the live stream now! Real-time crypto analysis and community discussion 🚀" />
        <meta property="og:image" content={`${BASE_URL}/og-image.jpg`} />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={`${BASE_URL}/live`} />
        <meta property="twitter:title" content="🔴 LookIntoMaxi Live Stream" />
        <meta property="twitter:description" content="Join the live stream now! Real-time crypto analysis and community discussion 🚀" />
        <meta property="twitter:image" content={`${BASE_URL}/og-image.jpg`} />

        {/* No cache headers */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </Head>
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">🔴 Live Stream</h1>
          <p className="text-gray-400">Redirecting to stream...</p>
          <script dangerouslySetInnerHTML={{ __html: `window.location.href = "${STREAM_URL}";` }} />
        </div>
      </div>
    </>
  );
} 