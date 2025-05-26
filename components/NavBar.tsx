'use client'

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
  const pathname = usePathname();
  
  return (
    <Link 
      href={href}
      className={cn(
        "text-xs sm:text-base transition-colors",
        pathname === href
          ? 'text-white cursor-default'
          : 'text-[rgb(153,153,153)] hover:text-gray-300'
      )}
    >
      {children}
    </Link>
  );
};

const NavBar = () => {
  const pathname = usePathname();

  return (
    <nav className="w-full bg-black/60 px-4 md:px-8 py-4 top-0 left-0 right-0 z-[100] border-b border-[rgba(255,255,255,0.2)]">
      <div className="max-w-[1200px] mx-auto flex items-end">
        <div className="flex items-end space-x-4 md:space-x-8">
          <Link 
            href="/" 
            className={cn(
              "font-bold text-sm md:text-xl transition-colors",
              pathname === '/' 
                ? 'text-white cursor-default' 
                : 'text-[rgb(153,153,153)] hover:text-gray-300'
            )}
          >
            PlsCharts.com
          </Link>
          {/* <NavLink href="/airdrop">Airdrop</NavLink> */}
          <NavLink href="/bubbles">Bubbles</NavLink>      
          <NavLink href="/leagues">Leagues</NavLink>
          </div>
      </div>
    </nav>
  );
};

export default NavBar; 