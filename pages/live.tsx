import { GetServerSideProps } from 'next';
import Head from 'next/head';

// This could be moved to an environment variable or API endpoint later
const STREAM_URL = 'https://x.com/i/broadcasts/1kvKpynqlqdGE';
const BASE_URL = 'https://app.lookintomaxi.com';

// Define the props type
type LivePageProps = {
  timestamp: string;
};

export const getServerSideProps: GetServerSideProps = async () => {
  // Generate a unique timestamp for each server-side render
  const timestamp = Date.now();
  
  return {
    props: {
      timestamp,
    },
  };
};

export default function LivePage({ timestamp }: LivePageProps) {
  return (
    <>
      <Head>
        {/* Primary Meta Tags */}
        <title>LookIntoMaxi Live Stream {timestamp}</title>
        <meta name="title" content={`LookIntoMaxi Live Stream ${timestamp}`} />
        <meta name="description" content="Join the live stream now! Real-time crypto analysis and community discussion." />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${BASE_URL}/live`} />
        <meta property="og:title" content={`LookIntoMaxi Live Stream ${timestamp}`} />
        <meta property="og:description" content="Join the live stream now! Real-time crypto analysis and community discussion." />
        <meta property="og:image" content={`${BASE_URL}/og-image.jpg`} />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={`${BASE_URL}/live`} />
        <meta property="twitter:title" content={`LookIntoMaxi Live Stream ${timestamp}`} />
        <meta property="twitter:description" content="Join the live stream now! Real-time crypto analysis and community discussion." />
        <meta property="twitter:image" content={`${BASE_URL}/og-image.jpg`} />

        {/* Force social media platforms to fetch fresh metadata */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </Head>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.location.href = "${STREAM_URL}";
          `,
        }}
      />
    </>
  );
} 