import Head from 'next/head';
import { withAuth } from '@/components/withAuth';

const ApiDocsPage = () => {
  return (
    <div className="p-4 sm:p-8">
      <Head>
        <title>API Documentation - LookIntoMaxi</title>
      </Head>
      
      <h1 className="text-2xl font-bold mt-10 mb-4 text-center">API Documentation</h1>
      <p className="text-white/60 text-center mb-8">
        Access real-time data about pooled HEX stake tokens through our API.
      </p>

      <div className="space-y-8 max-w-4xl mx-auto">
        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-400">Getting Started</h2>
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
            <p className="text-gray-300">
              Welcome to the LookIntoMaxi API. This API provides access to various endpoints
              for retrieving data about PulseChain tokens, prices, and analytics.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-400">Available Endpoints</h2>
          <div className="space-y-4">


            <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
              <h3 className="text-lg font-medium mb-2">GET /api/tokens</h3>
              <p className="text-gray-300 mb-2">
                Get detailed information about all tracked tokens.
              </p>
              <p className="text-gray-400 text-sm mb-4">
                Returns comprehensive data including stake metrics, token metrics, gas efficiency, and dates for each token.
              </p>
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Example Response:</h4>
                <pre className="bg-black p-4 rounded text-sm text-gray-300 overflow-x-auto">
{`{
  "tokens": {
    "pMAXI": {
      "name": "pMAXI",
      "stake": {
        "principal": 294323603.77,
        "tShares": 42104.44,
        "yieldSoFarHEX": 299413963.74,
        "backingHEX": 593737567.51,
        "percentageYieldEarnedSoFar": 1.02,
        "hexAPY": 0.3363,
        "minterAPY": 0.0073
      },
      "token": {
        "supply": 274546065,
        "burnedSupply": 19777538.77,
        "priceUSD": 0.007802,
        "priceHEX": 1.02200681,
        "costPerTShareUSD": 50.87,
        "backingPerToken": 2.16261547,
        "discountFromBacking": -0.5274,
        "discountFromMint": 0.022
      },
      "dates": {
        "stakeStartDate": "2022-05-01",
        "stakeEndDate": "2037-07-16",
        "daysTotal": 5555,
        "daysSinceStart": 1104,
        "daysLeft": 4451,
        "progressPercentage": 0.1987
      }
    },
    // ... other tokens
  },
  "lastUpdated": "2024-05-09T11:53:59.128Z"
}`}
                </pre>
              </div>
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Try it:</h4>
                <a 
                  href="https://app.lookintomaxi.com/api/tokens" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  https://app.lookintomaxi.com/api/tokens
                </a>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-400">Rate Limits & Data Freshness</h2>
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
            <p className="text-gray-300">
              Important information about our API:
            </p>
            <ul className="list-disc list-inside text-gray-300 mt-2 space-y-2">
              <li>Data updates every 5 minutes</li>
              <li>Responses are cached for 5 minutes to match data updates</li>
              <li>Rate limit: 10 requests per minute per IP</li>
              <li>Tip: Check the "lastUpdated" field in responses to see when data was last refreshed</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
};

export default withAuth(ApiDocsPage); 