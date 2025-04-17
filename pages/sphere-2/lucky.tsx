import { CumBackingValueLUCKY } from '@/hooks/CumBackingValueLUCKY';
import TokenSphere from '@/components/TokenSphere';

interface LuckySphereProps {
  startAnimation?: boolean;
}

export default function LuckySphere({ startAnimation = false }: LuckySphereProps) {
  const { data: yieldData, isLoading } = CumBackingValueLUCKY();

  const settings = {
    baseColorHex: '#FFD700' // Gold for LUCKY
  };

  return (
    <TokenSphere
      startAnimation={startAnimation}
      yieldData={yieldData || []}
      isLoading={isLoading}
      musicFile="lucky.mp3"
      settings={settings}
    />
  );
} 