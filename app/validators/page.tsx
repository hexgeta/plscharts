'use client';

import { useState, useEffect } from 'react';
import { formatNumber } from '@/utils/format';

interface ValidatorInfo {
  address: string;
  blockNumber: string;
  timestamp: string;
}

interface ValidatorData {
  count: number;
  recentValidators: ValidatorInfo[];
  uniqueValidators: string[];
  method: string;
  timestamp: string;
  blocksAnalyzed: number;
}

interface ApiResponse {
  success: boolean;
  data: ValidatorData;
  message: string;
  error?: string;
}

export default function PulseChainValidators() {
  const [validatorData, setValidatorData] = useState<ValidatorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchValidatorData();
  }, []);

  const fetchValidatorData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/validators/pulsechain');
      const data: ApiResponse = await response.json();
      
      if (data.success) {
        setValidatorData(data.data);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch validator data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch validator data');
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mb-4"></div>
          <p className="text-white text-xl">Loading PulseChain validators...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">❌ Error</div>
          <p className="text-white">{error}</p>
          <button 
            onClick={fetchValidatorData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">
            PulseChain Validators
          </h1>
          <p className="text-gray-400">
            Current network validator information
          </p>
        </div>

        {validatorData && (
          <>
            {/* Main Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-900 rounded-lg p-6 text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">
                  {formatNumber(validatorData.count)}
                </div>
                <div className="text-gray-400">Active Validators</div>
              </div>
              
              <div className="bg-gray-900 rounded-lg p-6 text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">
                  {formatNumber(validatorData.blocksAnalyzed)}
                </div>
                <div className="text-gray-400">Blocks Analyzed</div>
              </div>
              
              <div className="bg-gray-900 rounded-lg p-6 text-center">
                <div className="text-3xl font-bold text-purple-400 mb-2">
                  {validatorData.method === 'bor_getCurrentValidators' ? 'Direct' : 'Analysis'}
                </div>
                <div className="text-gray-400">Detection Method</div>
              </div>
            </div>

            {/* Recent Validator Activity */}
            <div className="bg-gray-900 rounded-lg p-6 mb-8">
              <h2 className="text-2xl font-bold mb-4">Recent Validator Activity</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2">Validator Address</th>
                      <th className="text-left py-2">Block Number</th>
                      <th className="text-left py-2">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validatorData.recentValidators.map((validator, index) => (
                      <tr key={index} className="border-b border-gray-800 hover:bg-gray-800">
                        <td className="py-2 font-mono">
                          <a 
                            href={`https://scan.pulsechain.com/address/${validator.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300"
                          >
                            {formatAddress(validator.address)}
                          </a>
                        </td>
                        <td className="py-2">
                          <a 
                            href={`https://scan.pulsechain.com/block/${validator.blockNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-400 hover:text-green-300"
                          >
                            {formatNumber(parseInt(validator.blockNumber))}
                          </a>
                        </td>
                        <td className="py-2 text-gray-400">
                          {formatTimestamp(validator.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* All Validators */}
            <div className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4">All Active Validators</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                {validatorData.uniqueValidators.map((address, index) => (
                  <div key={index} className="font-mono">
                    <a 
                      href={`https://scan.pulsechain.com/address/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      {formatAddress(address)}
                    </a>
                  </div>
                ))}
              </div>
            </div>

            {/* Metadata */}
            <div className="mt-8 text-center text-gray-500 text-sm">
              <p>
                Last updated: {formatTimestamp(validatorData.timestamp)} | 
                Method: {validatorData.method}
              </p>
              <button 
                onClick={fetchValidatorData}
                className="mt-2 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Refresh Data
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 