'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface LeagueData {
  league_name: string;
  user_holders: number;
}

interface HolderData {
  plsx: LeagueData[];
  hex: LeagueData[];
  hdrn: LeagueData[];
  com: LeagueData[];
  inc: LeagueData[];
  totalSupplies?: {
    plsx: number;
    hex: number;
    hdrn: number;
    com: number;
    inc: number;
  };
}

interface Props {
  data: HolderData;
}

// Only show individual bars for top leagues
const TOP_LEAGUES = ['🔱', '🐋', '🦈', '🐬', '🦑', '🐢'];
const SMALL_LEAGUES = ['🦀 ', '🦐 ', '🐚'];

const LEAGUES = [
  { emoji: '🔱', name: 'Poseidon', minPercentage: 10 },
  { emoji: '🐋', name: 'Whale', minPercentage: 1 },
  { emoji: '🦈', name: 'Shark', minPercentage: 0.1 },
  { emoji: '🐬', name: 'Dolphin', minPercentage: 0.01 },
  { emoji: '🦑', name: 'Squid', minPercentage: 0.001 },
  { emoji: '🐢', name: 'Turtle', minPercentage: 0.0001 },
  { emoji: '🦀', name: 'Crab', minPercentage: 0.00001 },
  { emoji: '🦐', name: 'Shrimp', minPercentage: 0.000001 },
  { emoji: '🐚', name: 'Shell', minPercentage: 0 }
];

const LEAGUE_NAMES = {
  '🔱': 'Poseidon',
  '🐋': 'Whale',
  '🦈': 'Shark',
  '🐬': 'Dolphin', 
  '🦑': 'Squid',
  '🐢': 'Turtle',
  '🦀': 'Crab',
  '🦐': 'Shrimp',
  '🐚': 'Shell'
} as const;

// Add a small offset to zero values for log scale (only when not showing percentages or when value is meaningful)
const addOffset = (value: number, showPercentage: boolean = false) => {
  // If the value is 0, use a very small value for tooltip to work but visually appear as no bar
  if (value === 0) {
    return 0.00001; // Very small value that will be barely visible but allows tooltip
  }
  // For non-zero values, ensure they're at least visible on the log scale
  if (showPercentage && value > 0 && value < 0.001) {
    return 0.001; // Minimum visible value for percentage mode
  }
  if (!showPercentage && value > 0 && value < 0.001) {
    return 0.001; // Minimum visible value for holder count mode
  }
  return value;
};

export default function LeagueDistributionChart({ data }: Props) {
  console.log('LeagueDistributionChart received data:', data);
  console.log('INC data specifically:', data?.inc);
  
  const [chartData, setChartData] = useState<any[]>([]);
  const [isRendered, setIsRendered] = useState(false);
  const [visibleTokens, setVisibleTokens] = useState({
    HEX: true,
    PLSX: true,
    INC: true,
    HDRN: false,
    COM: false
  });

  const handleLegendClick = (dataKey: string) => {
    setVisibleTokens(prev => ({
      ...prev,
      [dataKey]: !prev[dataKey]
    }));
  };
  const [showPercentage, setShowPercentage] = useState(false);

  // Add responsive font sizes state
  const [isMobile, setIsMobile] = useState(false);

  // Check screen size on mount and resize
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    
    if (data) {
      // Calculate percentage values if needed
      const getLeagueValue = (league: string, token: 'plsx' | 'hex' | 'hdrn' | 'com' | 'inc') => {
        const leagueData = data[token]?.find(h => h.league_name === league);
        const holders = leagueData?.user_holders || 0;
        
        if (showPercentage) {
          // Calculate percentage of total holders
          const totalEntry = data[token]?.find(h => h.league_name === 'TOTAL');
          const totalHolders = totalEntry?.user_holders || 0;
          
          if (totalHolders > 0) {
            const percentage = (holders / totalHolders) * 100;
            return percentage;
          }
        }
        
        return holders;
      };

      // Transform data for the chart
      const transformedData = TOP_LEAGUES.map((emoji) => {
        const plsxValue = getLeagueValue(emoji, 'plsx');
        const hexValue = getLeagueValue(emoji, 'hex');
        const hdrnValue = getLeagueValue(emoji, 'hdrn');
        const comValue = getLeagueValue(emoji, 'com');
        const incValue = getLeagueValue(emoji, 'inc');

        const plsxLeague = data.plsx?.find(h => h.league_name === emoji);
        const hexLeague = data.hex?.find(h => h.league_name === emoji);
        const hdrnLeague = data.hdrn?.find(h => h.league_name === emoji);
        const comLeague = data.com?.find(h => h.league_name === emoji);
        const incLeague = data.inc?.find(h => h.league_name === emoji);

        return {
          name: emoji,
          HEX: addOffset(hexValue, showPercentage),
          PLSX: addOffset(plsxValue, showPercentage),
          INC: addOffset(incValue, showPercentage),
          HDRN: addOffset(hdrnValue, showPercentage),
          COM: addOffset(comValue, showPercentage),
          // Store original values for tooltip
          originalHEX: hexLeague?.user_holders || 0,
          originalPLSX: plsxLeague?.user_holders || 0,
          originalINC: incLeague?.user_holders || 0,
          originalHDRN: hdrnLeague?.user_holders || 0,
          originalCOM: comLeague?.user_holders || 0,
          // Store percentage values for tooltip
          percentageHEX: showPercentage ? hexValue : 0,
          percentagePLSX: showPercentage ? plsxValue : 0,
          percentageINC: showPercentage ? incValue : 0,
          percentageHDRN: showPercentage ? hdrnValue : 0,
          percentageCOM: showPercentage ? comValue : 0,
          // Add league name for tooltip
          tooltipName: `${emoji} ${LEAGUE_NAMES[emoji]}`
        };
      });

      // Calculate remaining holders: TOTAL - major leagues (🔱🐋🦈🐬🦑🐢)
      const calculateRemainingHolders = (tokenData: LeagueData[]) => {
        const totalEntry = tokenData.find(l => l.league_name === 'TOTAL');
        const totalHolders = totalEntry?.user_holders || 0;
        
        const majorLeagueHolders = tokenData
          .filter(l => ['🔱', '🐋', '🦈', '🐬', '🦑', '🐢'].includes(l.league_name))
          .reduce((sum, l) => sum + (l.user_holders || 0), 0);
        
        const remainingHolders = totalHolders - majorLeagueHolders;
        return remainingHolders > 0 ? remainingHolders : 0;
      };

      // Calculate Others values (for both holder count and percentage modes)
      const getOthersValue = (token: 'plsx' | 'hex' | 'hdrn' | 'com' | 'inc') => {
        const remainingHolders = calculateRemainingHolders(data[token] || []);
        
        if (showPercentage) {
          const totalEntry = data[token]?.find(h => h.league_name === 'TOTAL');
          const totalHolders = totalEntry?.user_holders || 0;
          
          if (totalHolders > 0) {
            return (remainingHolders / totalHolders) * 100;
          }
        }
        
        return remainingHolders;
      };

      const smallLeaguesTotals = {
        name: "🦀 🦐 🐚",
        HEX: addOffset(getOthersValue('hex'), showPercentage),
        PLSX: addOffset(getOthersValue('plsx'), showPercentage),
        INC: addOffset(getOthersValue('inc'), showPercentage),
        HDRN: addOffset(getOthersValue('hdrn'), showPercentage),
        COM: addOffset(getOthersValue('com'), showPercentage),
        // Store original values for tooltip
        originalHEX: calculateRemainingHolders(data.hex || []),
        originalPLSX: calculateRemainingHolders(data.plsx || []),
        originalINC: calculateRemainingHolders(data.inc || []),
        originalHDRN: calculateRemainingHolders(data.hdrn || []),
        originalCOM: calculateRemainingHolders(data.com || []),
        // Store percentage values for tooltip
        percentageHEX: showPercentage ? getOthersValue('hex') : 0,
        percentagePLSX: showPercentage ? getOthersValue('plsx') : 0,
        percentageINC: showPercentage ? getOthersValue('inc') : 0,
        percentageHDRN: showPercentage ? getOthersValue('hdrn') : 0,
        percentageCOM: showPercentage ? getOthersValue('com') : 0,
        // Add descriptive name for tooltip
        tooltipName: "🦀 🦐 🐚 "
      };

      const finalChartData = [...transformedData, smallLeaguesTotals];
      setChartData(finalChartData);
      
      // Remove delay for debugging
      setIsRendered(true);
    } else {
      console.log('No data received, setting empty chart data');
      setChartData([]);
      setIsRendered(true);
    }
  }, [data, showPercentage]);

  // If no data, show empty state
  if (isRendered && chartData.length === 0) {
    return (
      <div className="w-full h-[450px] relative py-4">
        <div className="w-full h-full p-5 border border-white/20 rounded-2xl bg-black/10 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="text-4xl opacity-20">📊</div>
            <p className="text-white/40 text-sm font-medium">No league distribution data available</p>
            <p className="text-white/20 text-xs">Check back later for holder statistics</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        .pixelated-bars .recharts-bar-rectangle {
          filter: contrast(1.2) saturate(1.1);
          image-rendering: pixelated;
          image-rendering: -moz-crisp-edges;
          image-rendering: crisp-edges;
        }
        
        .pixelated-bars .recharts-bar-rectangle rect {
          filter: 
            drop-shadow(1px 0px 0px rgba(0,0,0,0.3))
            drop-shadow(-1px 0px 0px rgba(0,0,0,0.3))
            drop-shadow(0px 1px 0px rgba(0,0,0,0.3))
            drop-shadow(0px -1px 0px rgba(0,0,0,0.3))
            drop-shadow(2px 2px 0px rgba(0,0,0,0.2));
          shape-rendering: crispEdges;
        }
        
        .pixelated-bars .recharts-bar-rectangle rect {
          background-image: 
            repeating-linear-gradient(
              to top,
              transparent 0px,
              transparent 19px,
              rgba(0,0,0,0.4) 19px,
              rgba(0,0,0,0.4) 21px
            );
          background-size: 100% 20px;
          background-repeat: repeat-y;
        }
        
        .minecraft-grid .recharts-cartesian-grid {
          z-index: 999 !important;
          position: relative !important;
        }
        
        .minecraft-grid .recharts-cartesian-grid-horizontal line {
          stroke: #000000 !important;
          stroke-width: 2 !important;
          stroke-dasharray: none !important;
          opacity: 1 !important;
          fill: none !important;
        }
        
        .minecraft-grid .recharts-cartesian-grid line {
          stroke: #000000 !important;
          stroke-width: 2 !important;
          stroke-dasharray: none !important;
          opacity: 1 !important;
          fill: none !important;
        }
        
        .minecraft-grid .recharts-cartesian-grid * {
          stroke: #000000 !important;
          fill: none !important;
        }
        
        .minecraft-grid .recharts-bar-rectangle {
          z-index: 1 !important;
        }
        
        .minecraft-grid .recharts-cartesian-grid g {
          z-index: 999 !important;
          position: relative !important;
        }
      `}</style>
      <div className="w-full relative py-4">
        {/* Toggle Button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowPercentage(!showPercentage)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm font-medium transition-all duration-200 backdrop-blur-sm"
          >
            {showPercentage ? 'Show Holders' : 'Show % of Holders'}
          </button>
        </div>
        
        <div className="w-full h-[450px] relative">
          {!isRendered ? (
          <div className="w-full h-full p-5 border border-white/20 rounded-2xl bg-black/20 backdrop-blur-sm">
            <div className="h-8 w-48 bg-white/10 rounded-lg mb-8 ml-10 animate-pulse" />
            <div className="w-full h-[300px] flex items-end justify-around px-10 gap-1">
              {[...Array(7)].map((_, i) => (
                <div 
                  key={i} 
                  className={`flex-1 bg-gradient-to-t from-white/20 to-white/10 rounded-t-sm mx-0.5 animate-pulse ${
                    i % 3 === 0 ? 'h-2/5' : i % 3 === 1 ? 'h-3/5' : 'h-1/2'
                  }`}
                  style={{
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
            <div className="flex justify-between items-center mt-6 px-10">
              <div className="h-4 w-16 bg-white/10 rounded-full animate-pulse" />
              <div className="h-4 w-20 bg-white/10 rounded-full animate-pulse" />
              <div className="h-4 w-16 bg-white/10 rounded-full animate-pulse" />
            </div>
          </div>
        ) : (
          <div className="w-full h-full p-5 border border-white/20 rounded-2xl bg-black/10 backdrop-blur-sm">
            <ResponsiveContainer width="100%" height="100%" className="pixelated-bars minecraft-grid">
              <BarChart 
                data={chartData} 
                margin={{ top: 30, right: 30, left: 30, bottom: 40 }}
                barGap={2}
                style={{
                  imageRendering: 'pixelated'
                }}
              >
                <XAxis 
                  dataKey="name"
                  axisLine={{ stroke: '#888', strokeWidth: 0 }}
                  tickLine={{ stroke: '#888', strokeWidth: 0 }}
                  tick={{ fill: '#888', fontSize: isMobile ? 12 : 22, dy: 10 }}
                  angle={0}
                  textAnchor="middle"
                  height={40}
                  label={{ value: 'League', position: 'insideBottom', offset: -25, style: { textAnchor: 'middle', fill: '#888', fontSize: isMobile ? '10px' : '14px' } }}
                />
                <YAxis 
                  scale="log"
                  domain={[showPercentage ? 0.00001 : 0.00001, showPercentage ? 100 : 'auto']}
                  axisLine={false}
                  tickLine={{ stroke: '#888', strokeWidth: 0 }}
                  tick={{ fill: '#888', fontSize: isMobile ? 10 : 14 }}
                  ticks={showPercentage ? [0.0001, 0.001, 0.01, 0.1, 1, 10, 100] : [0, 1, 10, 100, 1000, 10000, 100000, 1000000]}
                  allowDataOverflow={true}
                  label={{ value: showPercentage ? '% of Total Holders' : 'Holders', angle: -90, position: 'insideLeft', offset: -20, style: { textAnchor: 'middle', fill: 'gray', fontSize: isMobile ? '10px' : '14px' } }}
                  tickFormatter={(value) => {
                    if (showPercentage) {
                      // Clean powers of 10 formatting for percentage
                      if (value >= 100) {
                        return "100%";
                      } else if (value >= 10) {
                        return "10%";
                      } else if (value >= 1) {
                        return "1%";
                      } else if (value >= 0.1) {
                        return "0.1%";
                      } else if (value >= 0.01) {
                        return "0.01%";
                      } else if (value >= 0.001) {
                        return "0.001%";
                      } else if (value >= 0.0001) {
                        return "0.0001%";
                      } else {
                        return "0%";
                      }
                    }
                    
                    // For holders mode
                    if (value === 0) return "0";
                    if (value <= 0.00001) return "0";
                    
                    return value >= 1000000 
                      ? `${(value / 1000000).toFixed(1)}M`
                      : value >= 1000 
                        ? `${(value / 1000).toFixed(1)}K` 
                        : value.toString();
                  }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(13, 13, 13, 0.9)', 
                    border: '1px solid rgba(255, 255, 255, 0.15)', 
                    borderRadius: '12px',
                    padding: isMobile ? '12px' : '16px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
                    backdropFilter: 'blur(8px)'
                  }}
                  labelStyle={{ 
                    color: 'white', 
                    marginBottom: isMobile ? '8px' : '12px', 
                    fontSize: isMobile ? '12px' : '14px',
                    fontWeight: '600'
                  }}
                  itemStyle={{ 
                    color: 'white', 
                    whiteSpace: 'pre-line',
                    fontSize: isMobile ? '11px' : '13px',
                    fontWeight: '500'
                  }}
                  formatter={(value: number, name: string, props: any) => {
                    const originalValue = props.payload[`original${name}`];
                    const percentageValue = props.payload[`percentage${name}`];
                    const colors = {
                      'PLSX': '#FF0005',
                      'HEX': '#FF04FC', 
                      'HDRN': '#7A59F7',
                      'COM': '#FE544F',
                      'INC': '#00FF6C'
                    };
                    
                    // Helper function to format percentage with at least 1 significant figure
                    const formatPercentage = (percent: number): string => {
                      if (percent === 0) return '0%';
                      
                      // Find the magnitude to determine decimal places needed
                      const magnitude = Math.floor(Math.log10(Math.abs(percent)));
                      
                      if (percent >= 1) {
                        // For percentages >= 1%, show 2 decimal places
                        return `${percent.toFixed(2)}%`;
                      } else if (percent >= 0.01) {
                        // For percentages >= 0.01%, show 3 decimal places
                        return `${percent.toFixed(3)}%`;
                      } else if (percent >= 0.001) {
                        // For percentages >= 0.001%, show 4 decimal places
                        return `${percent.toFixed(4)}%`;
                      } else if (percent >= 0.0001) {
                        // For percentages >= 0.0001%, show 5 decimal places
                        return `${percent.toFixed(5)}%`;
                      } else if (percent >= 0.00001) {
                        // For percentages >= 0.00001%, show 6 decimal places
                        return `${percent.toFixed(6)}%`;
                      } else {
                        // For very small percentages, use scientific notation or very high precision
                        return percent < 0.000001 ? `${percent.toExponential(2)}%` : `${percent.toFixed(7)}%`;
                      }
                    };
                    
                    const displayValue = originalValue === 0 
                      ? '0 holders'
                      : showPercentage && percentageValue !== undefined
                        ? `${formatPercentage(percentageValue)} of holders`
                        : `${originalValue.toLocaleString()} ${originalValue === 1 ? 'holder' : 'holders'}`;
                    
                    return [
                      <span style={{ color: colors[name as keyof typeof colors] || '#ffffff' }}>
                        {displayValue}
                      </span>, 
                      <span style={{ color: colors[name as keyof typeof colors] || '#ffffff' }}>
                        {name}
                      </span>
                    ];
                  }}
                  labelFormatter={(label) => {
                    const item = chartData.find(d => d.name === label);
                    return item?.tooltipName || label;
                  }}
                  cursor={{ 
                    fill: 'black'
                  }}
                />
                <Legend 
                  verticalAlign="top"
                  height={36}
                  iconType="rect"
                  wrapperStyle={{
                    paddingBottom: '20px',
                    fontSize: isMobile ? '12px' : '14px',
                    fontWeight: '600'
                  }}
                  onClick={(data) => {
                    if (data.dataKey && typeof data.dataKey === 'string') {
                      handleLegendClick(data.dataKey);
                    }
                  }}
                  formatter={(value) => (
                    <span style={{ 
                      color: value === 'PLSX' ? '#FF0005' : 
                             value === 'HEX' ? '#FF04FC' : 
                             value === 'HDRN' ? '#7A59F7' : 
                             value === 'COM' ? '#FE544F' : 
                             value === 'INC' ? '#00FF6C' : '#ffffff',
                      marginLeft: '8px',
                      opacity: visibleTokens[value as keyof typeof visibleTokens] ? 1 : 0.3,
                      cursor: 'pointer'
                    }}>
                      {value}
                    </span>
                  )}
                />
                <Bar 
                  dataKey="HEX" 
                  fill="#FF04FC" 
                  radius={[0, 0, 0, 0]}
                  isAnimationActive={false}
                  barSize={20}
                  hide={!visibleTokens.HEX}
                />
                <Bar 
                  dataKey="PLSX" 
                  fill="#FF0005" 
                  radius={[0, 0, 0, 0]}
                  isAnimationActive={false}
                  barSize={20}
                  hide={!visibleTokens.PLSX}
                />
                <Bar 
                  dataKey="INC" 
                  fill="#00FF6C" 
                  radius={[0, 0, 0, 0]}
                  isAnimationActive={false}
                  barSize={20}
                  hide={!visibleTokens.INC}
                />
                <Bar 
                  dataKey="HDRN" 
                  fill="#7A59F7" 
                  radius={[0, 0, 0, 0]}
                  isAnimationActive={false}
                  barSize={20}
                  hide={!visibleTokens.HDRN}
                />
                <Bar 
                  dataKey="COM" 
                  fill="#FE544F" 
                  radius={[0, 0, 0, 0]}
                  isAnimationActive={false}
                  barSize={20}
                  hide={!visibleTokens.COM}
                />
                <CartesianGrid 
                  strokeDasharray="0 0" 
                  stroke="#000000" 
                  strokeWidth={2}
                  horizontal={true}
                  vertical={false}
                  opacity={1}
                  style={{ 
                    zIndex: 999,
                    pointerEvents: 'none'
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        </div>
      </div>
    </>
  );
} 