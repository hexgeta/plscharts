'use client'

import { Roboto_Mono } from 'next/font/google'

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700']
})

export default function FontTest() {
  return (
    <div className={`${robotoMono.className} min-h-screen bg-black text-white p-10 flex flex-col items-center justify-center relative`}>
      <style jsx>{`
        @keyframes phosphor {
          0% { text-shadow: 0.4389924193300864px 0 1px rgba(0,30,255,0.5), -0.4389924193300864px 0 1px rgba(255,0,80,0.3), 0 0 3px; }
          5% { text-shadow: 2.7928974010788217px 0 1px rgba(0,30,255,0.5), -2.7928974010788217px 0 1px rgba(255,0,80,0.3), 0 0 3px; }
          10% { text-shadow: 0.02956275843481219px 0 1px rgba(0,30,255,0.5), -0.02956275843481219px 0 1px rgba(255,0,80,0.3), 0 0 3px; }
          15% { text-shadow: 0.40218538552878136px 0 1px rgba(0,30,255,0.5), -0.40218538552878136px 0 1px rgba(255,0,80,0.3), 0 0 3px; }
          20% { text-shadow: 3.4794037899852017px 0 1px rgba(0,30,255,0.5), -3.4794037899852017px 0 1px rgba(255,0,80,0.3), 0 0 3px; }
          25% { text-shadow: 1.6125630401149584px 0 1px rgba(0,30,255,0.5), -1.6125630401149584px 0 1px rgba(255,0,80,0.3), 0 0 3px; }
          30% { text-shadow: 0.7015590085143956px 0 1px rgba(0,30,255,0.5), -0.7015590085143956px 0 1px rgba(255,0,80,0.3), 0 0 3px; }
          35% { text-shadow: 3.896914047650351px 0 1px rgba(0,30,255,0.5), -3.896914047650351px 0 1px rgba(255,0,80,0.3), 0 0 3px; }
          40% { text-shadow: 3.870905614848819px 0 1px rgba(0,30,255,0.5), -3.870905614848819px 0 1px rgba(255,0,80,0.3), 0 0 3px; }
          45% { text-shadow: 2.231056963361899px 0 1px rgba(0,30,255,0.5), -2.231056963361899px 0 1px rgba(255,0,80,0.3), 0 0 3px; }
          50% { text-shadow: 0.08084290417898504px 0 1px rgba(0,30,255,0.5), -0.08084290417898504px 0 1px rgba(255,0,80,0.3), 0 0 3px; }
          55% { text-shadow: 2.3758461067427543px 0 1px rgba(0,30,255,0.5), -2.3758461067427543px 0 1px rgba(255,0,80,0.3), 0 0 3px; }
          60% { text-shadow: 2.202193051050636px 0 1px rgba(0,30,255,0.5), -2.202193051050636px 0 1px rgba(255,0,80,0.3), 0 0 3px; }
          65% { text-shadow: 2.8638780614874975px 0 1px rgba(0,30,255,0.5), -2.8638780614874975px 0 1px rgba(255,0,80,0.3), 0 0 3px; }
          70% { text-shadow: 0.48874025155497314px 0 1px rgba(0,30,255,0.5), -0.48874025155497314px 0 1px rgba(255,0,80,0.3), 0 0 3px; }
          75% { text-shadow: 1.8948491305757957px 0 1px rgba(0,30,255,0.5), -1.8948491305757957px 0 1px rgba(255,0,80,0.3), 0 0 3px; }
          80% { text-shadow: 0.0833037308038857px 0 1px rgba(0,30,255,0.5), -0.0833037308038857px 0 1px rgba(255,0,80,0.3), 0 0 3px; }
          85% { text-shadow: 0.09769827255241735px 0 1px rgba(0,30,255,0.5), -0.09769827255241735px 0 1px rgba(255,0,80,0.3), 0 0 3px; }
          90% { text-shadow: 3.443339761481782px 0 1px rgba(0,30,255,0.5), -3.443339761481782px 0 1px rgba(255,0,80,0.3), 0 0 3px; }
          95% { text-shadow: 2.1841838852799786px 0 1px rgba(0,30,255,0.5), -2.1841838852799786px 0 1px rgba(255,0,80,0.3), 0 0 3px; }
          100% { text-shadow: 2.6208764473832513px 0 1px rgba(0,30,255,0.5), -2.6208764473832513px 0 1px rgba(255,0,80,0.3), 0 0 3px; }
        }
        
        .phosphor {
          animation: phosphor 1.6s infinite;
        }
        
        .crt-container::before {
          content: "";
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1000;
          background: linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.25) 50%), linear-gradient(90deg, rgba(255,0,0,0.06), rgba(0,255,0,0.02), rgba(0,0,255,0.06));
          background-size: 100% 2px, 3px 100%;
        }
      `}</style>

      <div className="crt-container w-full min-h-screen flex flex-col items-center justify-center p-10 bg-black">
        <h1 className="text-5xl font-bold mb-8 text-center phosphor">
          Font Testing CRT Effects
        </h1>
        
        <p className="text-2xl mb-12 opacity-80 text-center phosphor">
          Roboto Mono with Phosphor & Scanlines
        </p>
        
        <div className="text-xl mb-6 text-center max-w-4xl phosphor">
          This is a demonstration of the Roboto Mono font family with phosphor animation and scanlines.
          The combination creates a classic CRT monitor appearance.
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 mb-8 text-sm max-w-2xl overflow-x-auto phosphor">
          <pre>{`Phosphor Animation + Scanlines
Classic CRT monitor effects active`}</pre>
        </div>

        <div className="grid gap-6 my-12 max-w-4xl w-full">
          <div className="text-center p-6 border border-gray-700 rounded-lg bg-gray-900">
            <div className="font-light phosphor">Light (300): The quick brown fox jumps over the lazy dog</div>
          </div>
          <div className="text-center p-6 border border-gray-700 rounded-lg bg-gray-900">
            <div className="font-normal phosphor">Regular (400): The quick brown fox jumps over the lazy dog</div>
          </div>
          <div className="text-center p-6 border border-gray-700 rounded-lg bg-gray-900">
            <div className="font-medium phosphor">Medium (500): The quick brown fox jumps over the lazy dog</div>
          </div>
          <div className="text-center p-6 border border-gray-700 rounded-lg bg-gray-900">
            <div className="font-semibold phosphor">Semi-Bold (600): The quick brown fox jumps over the lazy dog</div>
          </div>
          <div className="text-center p-6 border border-gray-700 rounded-lg bg-gray-900">
            <div className="font-bold phosphor">Bold (700): The quick brown fox jumps over the lazy dog</div>
          </div>
        </div>

        <div className="text-3xl my-8 text-center phosphor">
          0123456789 | $73,497 -0.3% | 18,559,259 HEX
        </div>

        <div className="text-2xl my-8 text-center tracking-widest phosphor">
          !@#$%^&*()_+-=[]{}|;':&quot;,./?`~
        </div>

        <div className="text-xl text-center max-w-4xl phosphor">
          Portfolio balances, stake IDs, addresses, and percentages all look crisp and readable
          with this monospace font and CRT effect combination.
        </div>
      </div>
    </div>
  )
} 