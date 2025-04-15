import React from 'react';
import Link from 'next/link';

const Footer = () => {
  return (
    <footer className="w-full bg-black px-4 border-t border-[rgba(255,255,255,0.2)] py-8">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
        <div className="col-span-1">
          <h3 className="text-s font-semibold mb-2 break-all">
            LOOKINTOMAXI {new Date().getFullYear()}
          </h3>
          <p className="text-sm">Donation address:</p>
          <p className="text-sm break-all text-[rgb(153,153,153)] hover:text-gray-300 cursor-pointer max-w-[170px]" onClick={() => navigator.clipboard.writeText('0x1F12DAE5450522b445Fe1882C4F8D2Cf67B38a43')}>
            0x1F12DAE5450522b445Fe1882C4F8D2Cf67B38a43
          </p>
        </div>
        <div className="col-span-1">
          <h3 className="text-s font-semibold mb-2">More charts</h3>
          <ul className="text-sm space-y-1">
            {/* <li><Link href="/vs-hex" className="text-[rgb(153,153,153)] hover:text-gray-300">BTC vs ETH vs HEX Visual</Link></li> */}
            <li><Link href="/combined-hex" className="text-[rgb(153,153,153)] hover:text-gray-300">Combined HEX Price</Link></li>
            <li><Link href="/liquidity" className="text-[rgb(153,153,153)] hover:text-gray-300">HEX Liquidity</Link></li>
            <li><Link href="/ratios" className="text-[rgb(153,153,153)] hover:text-gray-300">Crypto Ratios</Link></li>
            <li><Link href="/tshares" className="text-[rgb(153,153,153)] hover:text-gray-300">T-Share Supply</Link></li>

            <li><Link href="/crypto-gains" className="text-[rgb(153,153,153)] hover:text-gray-300">Crypto Gains</Link></li>
            <li><Link href="/sphere/maxi" className="text-[rgb(153,153,153)] hover:text-gray-300">MAXI Sphere</Link></li>

            <li><Link href="/hex-gains" className="text-[rgb(153,153,153)] hover:text-gray-300">HEX Gains</Link></li>
            <li><Link href="/oa-stakes" className="text-[rgb(153,153,153)] hover:text-gray-300">OA Stakes</Link></li>
            <li><Link href="/pls-sac" className="text-[rgb(153,153,153)] hover:text-gray-300">PLS Sac Wallets</Link></li>

          </ul>
        </div>
        <div className="col-span-1">
          <h3 className="text-s font-semibold mb-2">Links</h3>
          <ul className="text-sm space-y-1">
          <li><Link href="https://www.maximusdao.com/" className="text-[rgb(153,153,153)] hover:text-gray-300">Official site</Link></li>
            <li><Link href="https://docs.lookintomaxi.com/" className="text-[rgb(153,153,153)] hover:text-gray-300">Docs</Link></li>
            <li><Link href="/radio" className="text-[rgb(153,153,153)] hover:text-gray-300">Radio</Link></li>
            <li><Link href="/calendar" className="text-[rgb(153,153,153)] hover:text-gray-300">Calendar</Link></li>
            <li><Link href="https://app.piteas.io/#/swap?inputCurrency=PLS&outputCurrency=0x0d86EB9f43C57f6FF3BC9E23D8F9d82503f0e84b" className="text-[rgb(153,153,153)] hover:text-gray-300">Buy</Link></li>

          </ul>
        </div>
        <div className="col-span-1">
          <h3 className="text-s font-semibold mb-2">Legal</h3>
          <ul className="text-sm space-y-1">
          <li><Link href="/privacy-policy" className="text-[rgb(153,153,153)] hover:text-gray-300">Privacy</Link></li>
            <li><Link href="/terms-and-conditions" className="text-[rgb(153,153,153)] hover:text-gray-300">T&C</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
