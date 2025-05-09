import Head from 'next/head';
import { withAuth } from '@/components/withAuth';

const ApiDocsPage = () => {
  return (
    <div className="p-2 sm:p-4">
      <Head>
        <title>API Documentation - LookIntoMaxi</title>
      </Head>
      
      <h1 className="text-2xl font-bold mt-10 mb-4 text-center">API Documentation</h1>
      <p className="text-white/60 text-center mb-8">
        Access real-time data about PulseChain tokens, prices, and analytics through our API.
      </p>

      <div className="space-y-8 max-w-4xl mx-auto">
        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-400">Getting Started</h2>
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
            <p className="text-gray-300 mb-4">
              Welcome to the LookIntoMaxi API. This API provides access to various endpoints
              for retrieving data about PulseChain tokens, prices, and analytics.
            </p>
            <p className="text-gray-300 mb-4">
              To use the API, you'll need to include your API key in the headers of your requests:
            </p>
            <pre className="bg-black p-4 rounded text-sm text-gray-300 overflow-x-auto">
              {`Authorization: Bearer YOUR_API_KEY`}
            </pre>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-400">Available Endpoints</h2>
          <div className="space-y-4">
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
              <h3 className="text-lg font-medium mb-2">GET /api/prices</h3>
              <p className="text-gray-300 mb-2">
                Retrieve current prices for PulseChain tokens.
              </p>
              <p className="text-gray-400 text-sm">
                Returns real-time price data including MAXI and other tracked tokens.
              </p>
            </div>

            <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
              <h3 className="text-lg font-medium mb-2">GET /api/tokens</h3>
              <p className="text-gray-300 mb-2">
                Get detailed information about specific tokens.
              </p>
              <p className="text-gray-400 text-sm">
                Includes market cap, volume, and other relevant metrics.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-400">Rate Limits</h2>
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
            <p className="text-gray-300">
              The API is rate limited to:
            </p>
            <ul className="list-disc list-inside text-gray-300 mt-2">
              <li>100 requests per minute for standard tier</li>
              <li>1000 requests per minute for premium tier</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
};

export default withAuth(ApiDocsPage); 