import { CumBackingValueMAXI } from '@/hooks/CumBackingValueMAXI';
import TokenSphere from '@/components/TokenSphere';

interface MaxiSphereProps {
  startAnimation?: boolean;
}

export default function MaxiSphere({ startAnimation = false }: MaxiSphereProps) {
  const { data: yieldData, isLoading } = CumBackingValueMAXI();

  const settings = {
    baseColorHex: '#3991ED', // MAXI blue
    spiralPoints: 5555,
    progressSpeed: 0.2
  };

  return (
    <TokenSphere
      startAnimation={startAnimation}
      yieldData={yieldData || []}
      isLoading={isLoading}
      musicFile="maxi.mp3"
      settings={settings}
    />
  );
} 
