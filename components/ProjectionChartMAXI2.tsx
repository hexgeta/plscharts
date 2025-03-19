import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Skeleton } from "@/components/ui/skeleton2";
import { CumBackingValueMAXI } from '@/hooks/CumBackingValueMAXI';
import { START_DAY, END_DAY } from '@/constants/projectionConstants';

// Constants for regression calculations
const LINEAR_SLOPE_MULTIPLIER = 0.9;    // Range: 0.1 to 10 - Higher values create steeper linear trends
const EXPONENTIAL_CURVE_INTENSITY = 0.6; // Range: 0.1 to 2 - Higher values create more aggressive exponential curves
const EXPONENTIAL_Y_OFFSET = 0.62;      // Range: -1 to 1 - Moves exponential backing projection up/down

// Sine wave parameters
const SINE_AMPLITUDE = 1;     // Range: 0.1 to 2 - Controls wave height
const SINE_FREQUENCY = 0.01;    // Range: 0.001 to 0.1 - Controls wave length
const SINE_PHASE = 4.7;         // Range: 0 to 2π - Shifts waves left/right
const SINE_OFFSET = -0.15;       // Range: -1 to 1 - Moves entire sine curve up/down

// End-of-stake dampening parameters
const DAMPENING_FACTOR = 0.003; // Range: 0.0001 to 0.01 - How quickly waves flatten
const END_DAMPENING_START = 5000; // Range: 4000 to 5400 - Day to start reducing wave amplitude

interface ProjectionChartV2Props {
  title?: string;
}

interface ProjectionDataPoint {
  day: number;
  date: string;
  backingRatio: number | null;
  discount: number | null;
  trendValue?: number | null;
  linearTrend?: number | null;
  sineTrend?: number | null;
}

interface ProjectionTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

function calculateExponentialRegression(data: ProjectionDataPoint[], curveIntensity = EXPONENTIAL_CURVE_INTENSITY) {
  const n = data.length;
  let sumX = 0;
  let sumY = 0;
  let sumXlnY = 0;
  let sumXX = 0;
  
  const startX = START_DAY;
  const startY = 1;
  
  // Filter out points without backingRatio
  const validPoints = data.filter(point => point.backingRatio !== null);
  
  validPoints.forEach(point => {
    const x = point.day - startX;
    const y = point.backingRatio as number;
    const lnY = Math.log(y);
    
    sumX += x;
    sumY += lnY;
    sumXlnY += x * lnY;
    sumXX += x * x;
  });
  
  const a = (n * sumXlnY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const b = Math.log(startY);
  
  return {
    calculate: (x: number) => {
      const adjustedX = x - startX;
      return Math.exp((a * adjustedX + b) * curveIntensity) + EXPONENTIAL_Y_OFFSET;
    }
  };
}

function calculateLinearRegression(data: ProjectionDataPoint[], slopeMultiplier = LINEAR_SLOPE_MULTIPLIER) {
  const n = data.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  
  const startX = START_DAY;
  const startY = 1;
  
  // Filter out points without backingRatio
  const validPoints = data.filter(point => point.backingRatio !== null);
  
  validPoints.forEach(point => {
    const x = point.day - startX;
    const y = point.backingRatio as number;
    
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  });
  
  const baseSlope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const slope = baseSlope * slopeMultiplier;
  const intercept = startY;
  
  return {
    calculate: (x: number) => slope * (x - startX) + intercept
  };
}

function calculateSineRegression(data: ProjectionDataPoint[], exponentialRegression: { calculate: (x: number) => number }) {
  // Get today's date and calculate the day number
  const today = new Date();
  const startDate = new Date('2022-05-01');
  const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
  const currentDay = 881 + daysSinceStart;
  
  return {
    calculate: (x: number) => {
      const expValue = exponentialRegression.calculate(x);
      const daysAfterToday = x - currentDay;
      
      if (daysAfterToday <= 0) return null;
      
      const daysToEnd = END_DAY - x;
      const endDampeningMultiplier = x > END_DAMPENING_START 
        ? Math.exp(-DAMPENING_FACTOR * (x - END_DAMPENING_START))
        : 1;
      
      return expValue + (
        SINE_AMPLITUDE * Math.sin(SINE_FREQUENCY * (x - currentDay) + SINE_PHASE)
        * endDampeningMultiplier
      ) + SINE_OFFSET;
    }
  };
}

// Custom tooltip component
const ProjectionTooltip = ({ active, payload, label }: ProjectionTooltipProps) => {
  if (active && payload && payload.length) {
    const orderedPayload = [
      payload.find(p => p.dataKey === "backingRatio"),    // Backing Value
      payload.find(p => p.dataKey === "discount"),        // Market Value
      payload.find(p => p.dataKey === "trendValue"),      // Projected Backing Value (Exponential)
      payload.find(p => p.dataKey === "sineTrend"),       // Market Oscillation
      payload.find(p => p.dataKey === "linearTrend"),     // Projected Backing Value (Linear)
    ].filter(Boolean);

    return (
      <div style={{ 
        backgroundColor: 'rgba(0, 0, 0, 0.85)', 
        border: '1px solid rgba(255, 255, 255, 0.2)', 
        borderRadius: '10px',
        padding: '10px'
      }}>
        <p style={{ color: 'white', margin: '0 0 5px' }}>{`Day: ${label}`}</p>
        {orderedPayload.map((entry, index) => (
          entry && (
            <p key={index} style={{ color: 'white', margin: '3px 0' }}>
              <span style={{ color: entry.color }}>●</span>
              {` ${entry.name}: ${Number(entry.value).toFixed(2)}`}
            </p>
          )
        ))}
      </div>
    );
  }
  return null;
};

function ProjectionChartMAXI2({ title = 'pMAXI Ⓜ️' }: ProjectionChartV2Props) {
  const { data: rawData, error, isLoading } = CumBackingValueMAXI();
  const [visibleLines, setVisibleLines] = useState({
    backingRatio: true,
    discount: true,
    trendValue: true,
    linearTrend: false,
    sineTrend: true
  });

  const projectionData = useMemo(() => {
    if (!rawData || rawData.length === 0) return [];

    // Convert the rawData to include day numbers
    const historicalData = rawData.map((item, index) => ({
      ...item,
      day: 881 + index, // Starting from day 881
      backingRatio: item.backingRatio,
      discount: item.discount
    }));

    // Calculate projections using the historical data
    const regression = calculateExponentialRegression(historicalData, EXPONENTIAL_CURVE_INTENSITY);
    const linearRegression = calculateLinearRegression(historicalData, LINEAR_SLOPE_MULTIPLIER);
    const sineRegression = calculateSineRegression(historicalData, regression);

    // Get the last day from historical data
    const lastDay = historicalData[historicalData.length - 1].day;

    // Generate projection points
    const projectionPoints: ProjectionDataPoint[] = [];
    for (let i = 0; i <= 100; i++) {
      const day = lastDay + (i * ((END_DAY - lastDay) / 100));
      
      // Calculate date safely
      const baseDate = new Date('2022-05-01');
      const daysToAdd = (day - 881);
      const millisecondsToAdd = daysToAdd * 24 * 60 * 60 * 1000;
      
      // Check if the resulting date would be valid
      const targetDate = new Date(baseDate.getTime());
      try {
        targetDate.setTime(baseDate.getTime() + millisecondsToAdd);
        projectionPoints.push({
          day,
          date: targetDate.toISOString().split('T')[0],
          backingRatio: null, // No historical backing ratio for projections
          discount: null, // No historical market price for projections
          linearTrend: linearRegression.calculate(day),
          trendValue: regression.calculate(day),
          sineTrend: sineRegression.calculate(day)
        });
      } catch (e) {
        console.warn(`Skipping invalid date calculation for day ${day}`);
        projectionPoints.push({
          day,
          date: 'N/A',
          backingRatio: null,
          discount: null,
          linearTrend: linearRegression.calculate(day),
          trendValue: regression.calculate(day),
          sineTrend: sineRegression.calculate(day)
        });
      }
    }

    // Combine historical and projection data
    const combinedData = [
      ...historicalData.map(item => ({
        ...item,
        linearTrend: null,
        trendValue: null,
        sineTrend: null
      })),
      ...projectionPoints
    ];

    return combinedData;
  }, [rawData]);

  const projectionXAxisTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let day = 1000; day <= 5000; day += 500) {
      ticks.push(day);
    }
    ticks.push(5555);
    return ticks;
  }, []);

  const handleProjectionLegendClick = (dataKey: string) => {
    setVisibleLines(prev => ({
      ...prev,
      [dataKey]: !prev[dataKey]
    }));
  };

  const projectionLegend = (props: any) => {
    const { payload } = props;
    
    const orderedLegendItems = [
      payload.find(p => p.dataKey === "backingRatio"),    // Backing Value
      payload.find(p => p.dataKey === "discount"),        // Market Value
      payload.find(p => p.dataKey === "trendValue"),      // Projected Backing Value (Exponential)
      payload.find(p => p.dataKey === "sineTrend"),       // Market Oscillation
      payload.find(p => p.dataKey === "linearTrend"),     // Projected Backing Value (Linear)
    ].filter(Boolean);

    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        width: '100%', 
        marginTop: '40px',
        marginBottom: '0px'
      }}>
        <ul style={{ 
          listStyle: 'none', 
          padding: 0, 
          display: 'flex', 
          flexWrap: 'wrap', 
          justifyContent: 'center',
          gap: '24px'
        }}>
          {orderedLegendItems.map((entry: any, index: number) => (
            <li 
              key={`item-${index}`}
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center',
                cursor: 'pointer' 
              }}
              onClick={() => handleProjectionLegendClick(entry.dataKey)}
            >
              <span style={{ 
                color: entry.color, 
                marginRight: 5,
                fontSize: '24px',
                lineHeight: '1',
                display: 'flex',
                alignItems: 'center'
              }}>●</span>
              <span style={{ 
                color: visibleLines[entry.dataKey as keyof typeof visibleLines] ? '#fff' : '#888',
                fontSize: '12px',
                lineHeight: '1'
              }}>
                {entry.value}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  if (error) {
    return <div>Error loading projection data</div>;
  }

  return (
    <div className="w-full h-[450px] my-10 relative">
      {isLoading ? (
        <Skeleton variant="chart" />
      ) : (
        <div style={{ width: '100%', height: '100%', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '15px' }}>
          <h2 style={{ textAlign: 'left', color: 'white', fontSize: '24px', marginBottom: '0px', marginLeft: '40px'}}>
            {title} (Post OA staking, real-time)</h2>
          <ResponsiveContainer width="100%" height="100%" debounce={1}>
            <LineChart data={projectionData} margin={{ top: 30, right: 20, left: 20, bottom: 60 }}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="rgba(136, 136, 136, 0.2)" 
                vertical={false} 
              />
              <XAxis 
                dataKey="day" 
                axisLine={{ stroke: '#888', strokeWidth: 0 }}
                tickLine={{ stroke: '#888', strokeWidth: 0}}
                tick={{ fill: '#888', fontSize: 14, dy: 5 }}
                ticks={projectionXAxisTicks}
                domain={[881, 5555]}
                type="number"
                allowDataOverflow={true}
                scale="linear"
                label={{ 
                  value: 'DAY', 
                  position: 'bottom',
                  offset: 10,
                  style: { 
                    fill: '#888',
                    fontSize: 12,
                    marginTop: '0px',
                  }
                }}
              />
              <YAxis 
                domain={[0, 25]}
                ticks={[0, 1, 5, 10, 15, 20, 25]}
                axisLine={false}
                tickLine={{ stroke: '#888', strokeWidth: 0 }}
                tick={{ fill: '#888', fontSize: 14, dx: -5}}
                tickFormatter={(value) => `${value.toFixed(0)}`}
                label={{ 
                  value: 'HEX', 
                  position: 'left',
                  angle: -90,
                  offset: 0,
                  style: { 
                    fill: '#888',
                    fontSize: 12,
                    marginTop: '0px',
                  }
                }}
              />
              <Tooltip content={<ProjectionTooltip />} />
              <Legend content={projectionLegend} />
              <Line 
                type="monotone" 
                dataKey="backingRatio" 
                name="Backing Value" 
                dot={false} 
                strokeWidth={2} 
                stroke='rgba(112, 214, 104)'
                activeDot={{ r: 4, fill: 'rgba(112, 214, 104)', stroke: 'white' }}
                connectNulls={false}
                isAnimationActive={true}
                hide={!visibleLines.backingRatio}
              />
              <Line 
                type="monotone" 
                dataKey="discount" 
                name="Market Value" 
                dot={false} 
                strokeWidth={2} 
                stroke='#3991ED'
                activeDot={{ r: 4, fill: '#3991ED', stroke: 'white' }}
                hide={!visibleLines.discount}
                connectNulls={false}
                isAnimationActive={true}
              />
              <Line 
                type="linear"
                dataKey="linearTrend"
                name="Projected Backing Value (Linear)"
                dot={false}
                strokeWidth={2}
                stroke="#474747"
                activeDot={{ r: 4, fill: '#474747', stroke: 'white' }}
                hide={!visibleLines.linearTrend}
                connectNulls={false}
                isAnimationActive={true}
              />
              <Line 
                type="monotone"
                dataKey="trendValue"
                name="Projected Backing Value (Exp.)"
                dot={false}
                strokeWidth={2}
                stroke="#23411F"
                activeDot={{ r: 4, fill: '#23411F', stroke: 'white' }}
                connectNulls={false}
                isAnimationActive={true}
                hide={!visibleLines.trendValue}
              />
              <Line 
                type="monotone"
                dataKey="sineTrend"
                name="Projected Market Value (Exp.)"
                dot={false}
                strokeWidth={2}
                stroke="#132B47"
                activeDot={{ r: 4, fill: '#132B47', stroke: 'white' }}
                connectNulls={false}
                isAnimationActive={true}
                hide={!visibleLines.sineTrend}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default ProjectionChartMAXI2;