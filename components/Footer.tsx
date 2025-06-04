'use client';

import Link from 'next/link';

// Cache the current year to avoid recalculating it on every render
const CURRENT_YEAR = new Date().getFullYear();

const Footer = () => {
  return (
    <footer className="w-full bg-black/60 px-4 py-8 border-t border-[rgba(255,255,255,0.2)] relative z-[100]">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
        <div className="col-span-1">
          <h3 className="text-s font-semibold mb-2">
            PlsCharts {CURRENT_YEAR}
          </h3>
          <p className="text-sm text-[rgb(153,153,153)]">
            Donate: <span 
              className="break-all cursor-pointer hover:text-gray-300" 
              onClick={() => {
                navigator.clipboard.writeText('0x1F12DAE5450522b445Fe1882C4F8D2Cf67B38a43');
                const popup = document.createElement('div');
                popup.textContent = '✓ Copied!';
                popup.className = 'fixed bottom-4 left-4 bg-white text-black px-4 py-2 rounded-md text-sm z-[1000]';
                document.body.appendChild(popup);
                setTimeout(() => popup.remove(), 2000);
              }}
            >0x1F12DAE5450522b445Fe1882C4F8D2Cf67B38a43</span>
          </p>
        </div>
        <div className="col-span-1">
          <h3 className="text-s font-semibold mb-2">Links</h3>
          <ul className="text-sm space-y-1">
          <li><a href="https://hexscout.com/buy" target="_blank" rel="noopener noreferrer" className="text-[rgb(153,153,153)] hover:text-gray-300">Buy pHEX</a></li>
          <li><a href="https://www.zkp2p.xyz/swap?inputCurrency=USD&paymentPlatform=venmo&toToken=1%3A0x2b591e99afe9f32eaa6214f7b7629768c40eeb39&tab=buy" target="_blank" rel="noopener noreferrer" className="text-[rgb(153,153,153)] hover:text-gray-300">Buy eHEX</a></li>

            <li><a href="https://bridge.pulsechainapp.com/" target="_blank" rel="noopener noreferrer" className="text-[rgb(153,153,153)] hover:text-gray-300">Bridge</a></li>
            <li><a href="https://pulsex.pulsechainapp.com/" target="_blank" rel="noopener noreferrer" className="text-[rgb(153,153,153)] hover:text-gray-300">PulseX</a></li>
            <li><a href="https://hex.pulsechainapp.com/" target="_blank" rel="noopener noreferrer" className="text-[rgb(153,153,153)] hover:text-gray-300">Stake HEX</a></li>
            <li><a href="https://piteas.io/" target="_blank" rel="noopener noreferrer" className="text-[rgb(153,153,153)] hover:text-gray-300">DEX Aggregator</a></li>
          </ul>
        </div>
        <div className="col-span-1">
          <h3 className="text-s font-semibold mb-2">Resources</h3>
          <ul className="text-sm space-y-1">
            <li><a href="https://gorealdefi.com/" target="_blank" rel="noopener noreferrer" className="text-[rgb(153,153,153)] hover:text-gray-300">GoRealDefi</a></li>
            <li><a href="https://scan.pulsechain.com/" target="_blank" rel="noopener noreferrer" className="text-[rgb(153,153,153)] hover:text-gray-300">Block Explorer</a></li>
          </ul>
        </div>
        <div className="col-span-1">
          <h3 className="text-s font-semibold mb-2">Community</h3>
          <ul className="text-sm space-y-1">
            <li><a href="https://twitter.com/plscharts" target="_blank" rel="noopener noreferrer" className="text-[rgb(153,153,153)] hover:text-gray-300">Trending on Twitter</a></li>
            <li><a href="https://richardheart.com/" target="_blank" rel="noopener noreferrer" className="text-[rgb(153,153,153)] hover:text-gray-300">Richard Heart's Twitter</a></li>
            <li><a href="https://cryptovideos.io/" target="_blank" rel="noopener noreferrer" className="text-[rgb(153,153,153)] hover:text-gray-300">Top Streamers</a></li>

          </ul>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
