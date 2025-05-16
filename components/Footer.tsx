// Static component with revalidation
export const revalidate = 2592000; // 30 days in seconds

import React from 'react';
import Link from 'next/link';

// Cache the current year to avoid recalculating it on every render
const CURRENT_YEAR = new Date().getFullYear();

const Footer = () => {
  return (
    <footer className="w-full bg-black px-4 border-t border-[rgba(255,255,255,0.2)] py-8 relative z-[100] bg-opacity-100">
      <div className="absolute inset-0 bg-black" />
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 relative">
        <div className="col-span-1">
          <h3 className="text-s font-semibold mb-2 break-all">
            PlsCharts {CURRENT_YEAR}
          </h3>
        </div>
        <div className="col-span-1">
          <h3 className="text-s font-semibold mb-2">Links</h3>
          <ul className="text-sm space-y-1">
            <li><a href="https://app.pulsex.com/swap" target="_blank" rel="noopener noreferrer" className="text-[rgb(153,153,153)] hover:text-gray-300">PulseX</a></li>
            <li><a href="https://hex.pulsechainapp.com/" target="_blank" rel="noopener noreferrer" className="text-[rgb(153,153,153)] hover:text-gray-300">Stake HEX</a></li>
            <li><a href="https://bridge.pulsechainapp.com/" target="_blank" rel="noopener noreferrer" className="text-[rgb(153,153,153)] hover:text-gray-300">Bridge</a></li>
            <li><a href="https://piteas.io/" target="_blank" rel="noopener noreferrer" className="text-[rgb(153,153,153)] hover:text-gray-300">DEX Aggregator</a></li>
          </ul>
        </div>
        <div className="col-span-1">
          <h3 className="text-s font-semibold mb-2">Resources</h3>
          <ul className="text-sm space-y-1">
            <li><a href="#" className="text-[rgb(153,153,153)] hover:text-gray-300">Documentation</a></li>
            <li><a href="#" className="text-[rgb(153,153,153)] hover:text-gray-300">API</a></li>
            <li><a href="#" className="text-[rgb(153,153,153)] hover:text-gray-300">Support</a></li>
          </ul>
        </div>
        <div className="col-span-1">
          <h3 className="text-s font-semibold mb-2">Community</h3>
          <ul className="text-sm space-y-1">
            <li><a href="#" className="text-[rgb(153,153,153)] hover:text-gray-300">Twitter</a></li>
            <li><a href="#" className="text-[rgb(153,153,153)] hover:text-gray-300">Discord</a></li>
            <li><a href="#" className="text-[rgb(153,153,153)] hover:text-gray-300">Telegram</a></li>
          </ul>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
