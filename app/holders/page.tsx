import LeagueDistributionChart from '@/components/LeagueDistributionChart';

async function getHolderData() {
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:3000';
  
  console.log('Fetching holder data from:', `${baseUrl}/api/holders`);
  
  const response = await fetch(`${baseUrl}/api/holders`, {
    next: { revalidate: 3600 } // Cache for 1 hour
  });

  if (!response.ok) {
    console.error('Failed to fetch holder data:', response.status, response.statusText);
    throw new Error('Failed to fetch holder data');
  }

  const data = await response.json();
  console.log('Holder data received:', data);
  return data;
}

export default async function HoldersPage() {
  const data = await getHolderData();

  return (
    <div className="container mx-auto py-8 px-8 md:px-28">
      <h1 className="text-2xl font-bold mb-0 text-center">Token Holder Distribution</h1>
      <div className="rounded-lg shadow p-0">
        <LeagueDistributionChart data={data} />
      </div>
    </div>
  );
} 