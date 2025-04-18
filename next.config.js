/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['raw.githubusercontent.com'],
  },
  trailingSlash: true,
  webpack: (config) => {
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });
    return config;
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: '/HEXCharts',
        destination: '/hex-charts',
        permanent: true,
      },
      {
        source: '/DeltaDiscounts',
        destination: '/delta-discounts',
        permanent: true,
      },
      // a catch-all redirect to prevent potential loops
      {
        source: '/Btc-Eth-Hex',
        destination: '/vs-hex',
        permanent: true,
      },
    ]
  },
};

module.exports = nextConfig;
