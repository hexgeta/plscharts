import { useState, useEffect } from 'react';
import axios from 'axios';

// Constants for regression calculations
const LINEAR_SLOPE_MULTIPLIER = 1;    
const EXPONENTIAL_CURVE_INTENSITY = 1; 
const SINE_AMPLITUDE = 0.8;     
const SINE_FREQUENCY = 0.01;    
const SINE_PHASE = 4.7;           
const SINE_OFFSET = 0.15;          
const DAMPENING_FACTOR = 0.003; 
const END_DAMPENING_START = 5000; 
const START_DAY = 881;
const END_DAY = 5555;

interface DataPoint {
  date: string;
  backingValue: number;
  discount: number;
  day: number;
  trendValue?: number;
  linearTrend?: number;
  sineTrend?: number;
}

function calculateExponentialRegression(data: DataPoint[], curveIntensity = 0.03) {
  const n = data.length;
  let sumX = 0;
  let sumY = 0;
  let sumXlnY = 0;
  let sumXX = 0;
  
  const startX = START_DAY;
  const startY = 1;
  
  data.forEach(point => {
    const x = point.day - startX;
    const lnY = Math.log(point.backingValue);
    
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
      return Math.exp((a * adjustedX + b) * curveIntensity);
    }
  };
}

function calculateLinearRegression(data: DataPoint[], slopeMultiplier = 1.0) {
  const n = data.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  
  const startX = START_DAY;
  const startY = 1;
  
  data.forEach(point => {
    const x = point.day - startX;
    const y = point.backingValue;
    
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

function calculateSineRegression(data: DataPoint[], exponentialRegression: { calculate: (x: number) => number }) {
  const lastDataPoint = data[data.length - 1];
  const startDay = lastDataPoint.day;
  
  return {
    calculate: (x: number) => {
      const expValue = exponentialRegression.calculate(x);
      const daysAfterLast = x - startDay;
      
      if (daysAfterLast <= 0) return null;
      
      const daysToEnd = END_DAY - x;
      const endDampeningMultiplier = x > END_DAMPENING_START 
        ? Math.exp(-DAMPENING_FACTOR * (x - END_DAMPENING_START))
        : 1;
      
      return expValue + (
        SINE_AMPLITUDE * Math.sin(SINE_FREQUENCY * (x - startDay) + SINE_PHASE)
        * endDampeningMultiplier
      ) + SINE_OFFSET;
    }
  };
}

export function CumBackingValueMAXIV2() {
  const [data, setData] = useState<DataPoint[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('https://hexdailystats.com/maxidiscountdata');
        
        // Format initial data
        let formattedData = response.data.map((item: any) => ({
          date: new Date(item.date).toISOString().split('T')[0],
          backingValue: item.backingRatio || 0,
          discount: item.discount || 0,
          day: item.day || 0
        }));

        // Calculate projections
        const regression = calculateExponentialRegression(formattedData, EXPONENTIAL_CURVE_INTENSITY);
        const linearRegression = calculateLinearRegression(formattedData, LINEAR_SLOPE_MULTIPLIER);
        const sineRegression = calculateSineRegression(formattedData, regression);

        // Add projections to data
        const lastDay = formattedData[formattedData.length - 1].day;
        const projectedData = [];

        for (let day = START_DAY; day <= END_DAY; day++) {
          const expValue = regression.calculate(day);
          const linValue = linearRegression.calculate(day);
          const sineValue = day > lastDay ? sineRegression.calculate(day) : null;

          const existingDataPoint = formattedData.find(d => d.day === day);
          
          if (existingDataPoint) {
            projectedData.push({
              ...existingDataPoint,
              trendValue: expValue,
              linearTrend: linValue,
              sineTrend: sineValue
            });
          } else {
            projectedData.push({
              date: new Date(Date.now() + (day - lastDay) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              backingValue: null,
              discount: null,
              day,
              trendValue: expValue,
              linearTrend: linValue,
              sineTrend: sineValue
            });
          }
        }

        setData(projectedData);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, error, isLoading };
} 