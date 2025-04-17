import { CumBackingValueBASE } from '@/hooks/CumBackingValueBASE';
import TokenSphere from '@/components/TokenSphere';

interface BaseSphereProps {
  startAnimation?: boolean;
}

export default function BaseSphere({ startAnimation = false }: BaseSphereProps) {
  const { data: yieldData, isLoading } = CumBackingValueBASE();

  const settings = {
    baseColorHex: '#3991ED' // Blue for BASE
  };

  return (
    <TokenSphere
      startAnimation={startAnimation}
      yieldData={yieldData || []}
      isLoading={isLoading}
      musicFile="base2.mp3"
      settings={settings}
    />
  );
} 