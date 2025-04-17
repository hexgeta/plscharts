import { CumBackingValueTRIO } from '@/hooks/CumBackingValueTRIO';
import TokenSphere from '@/components/TokenSphere';

interface TrioSphereProps {
  startAnimation?: boolean;
}

export default function TrioSphere({ startAnimation = false }: TrioSphereProps) {
  const { data: yieldData, isLoading } = CumBackingValueTRIO();

  const settings = {
    baseColorHex: '#00FF00' // Green for TRIO
  };

  return (
    <TokenSphere
      startAnimation={startAnimation}
      yieldData={yieldData || []}
      isLoading={isLoading}
      musicFile="trio.mp3"
      settings={settings}
    />
  );
} 