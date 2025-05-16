'use client';

import Link from 'next/link';

// Cache the current year to avoid recalculating it on every render
const CURRENT_YEAR = new Date().getFullYear();

const Footer = () => {
  return (
    <footer className="w-full bg-black/60 px-8 py-8 border-t border-[rgba(255,255,255,0.2)] relative z-[100]">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
        <div className="col-span-1">
          <h3 className="text-s font-semibold mb-2">
            PlsCharts.com {CURRENT_YEAR}
          </h3>
        </div>
        <div className="col-span-1">
          <h3 className="text-s font-semibold mb-2">Links</h3>
          <ul className="text-sm space-y-1">
            <li><a href="https://pulsex.pulsechainapp.com/" target="_blank" rel="noopener noreferrer" className="text-[rgb(153,153,153)] hover:text-gray-300">PulseX</a></li>
            <li><a href="https://hex.pulsechainapp.com/" target="_blank" rel="noopener noreferrer" className="text-[rgb(153,153,153)] hover:text-gray-300">Stake HEX</a></li>
            <li><a href="https://bridge.pulsechainapp.com/" target="_blank" rel="noopener noreferrer" className="text-[rgb(153,153,153)] hover:text-gray-300">Bridge</a></li>
            <li><a href="https://piteas.io/" target="_blank" rel="noopener noreferrer" className="text-[rgb(153,153,153)] hover:text-gray-300">DEX Aggregator</a></li>
          </ul>
        </div>
        <div className="col-span-1">
          <h3 className="text-s font-semibold mb-2">Resources</h3>
          <ul className="text-sm space-y-1">
            <li><a href="https://gotealdefi.com/" target="_blank" rel="noopener noreferrer" className="text-[rgb(153,153,153)] hover:text-gray-300">GoRealDefi</a></li>
            <li><a href="https://scan.pulsechain.com/" target="_blank" rel="noopener noreferrer" className="text-[rgb(153,153,153)] hover:text-gray-300">Block Explorer</a></li>
          </ul>
        </div>
        <div className="col-span-1">
          <h3 className="text-s font-semibold mb-2">Community</h3>
          <ul className="text-sm space-y-1">
            <li><a href="https://twitter.com/plscharts" target="_blank" rel="noopener noreferrer" className="text-[rgb(153,153,153)] hover:text-gray-300">Twitter</a></li>
            <li><a href="https://richardheart.com/" target="_blank" rel="noopener noreferrer" className="text-[rgb(153,153,153)] hover:text-gray-300">Richard Heart</a></li>
          </ul>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
