import Link from 'next/link';
import Image from 'next/image';
import { TOKEN_LOGOS } from '@/constants/crypto';

const SPHERES = [
  {
    id: 'maxi',
    name: 'MAXI',
    color: '#3991ED'
  },
  {
    id: 'deci',
    name: 'DECI',
    color: '#FF0000'
  },
  {
    id: 'lucky',
    name: 'LUCKY',
    color: '#0AE25A'
  },
  {
    id: 'trio',
    name: 'TRIO',
    color: '#FFFFFF'
  },
  {
    id: 'base',
    name: 'BASE',
    color: '#E17034'
  }
];

export default function SpheresPage() {
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Yield Spheres</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {SPHERES.map((sphere) => (
          <Link 
            key={sphere.id}
            href={`/sphere/${sphere.id}`}
            className="block"
          >
            <div className="bg-black border border-white/10 rounded-lg p-4 hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-2">
                <Image
                  src={TOKEN_LOGOS[sphere.name]}
                  alt={`${sphere.name} logo`}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
                <span className="text-xl font-bold">p{sphere.name}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
} 