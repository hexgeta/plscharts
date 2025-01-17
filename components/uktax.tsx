import React, { useEffect, useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine, ComposedChart } from 'recharts';

// Simulated tax data (replace this with actual data loaded from a JSON file)
const taxRules = {
  "rUK 2024-25": {
    "income tax": [
      { "name": "basic", "rate": 0.2, "threshold": 37700 },
      { "name": "higher", "rate": 0.4, "threshold": 125140 },
      { "name": "additional", "rate": 0.45 }
    ],
    "statutory personal allowance": 12570,
    "allowance withdrawal threshold": 100000,
    "allowance withdrawal rate": 0.50,
    "NI": [
      { "name": "below primary threshold", "rate": 0, "threshold": 12570 },
      { "name": "primary threshold", "rate": 0.08, "threshold": 50270 },
      { "name": "upper earnings limit", "rate": 0.02 }
    ]
  }
};

const STUDENT_LOAN_RATE = 0.09;
const STUDENT_LOAN_THRESHOLD = 27295;

interface TaxData {
  grossIncome: number;
  marginalRate: number;
  effectiveRate: number;
  netIncome: number;
}

interface ChartOptions {
  chartType: 'Marginal rate' | 'Gross v net' | 'Effective rate';
  children: number;
  childcare: number;
  includeStudentLoan: boolean;
  includeMarriageAllowance: boolean;
}

const UKMarginalTaxRateChart: React.FC = () => {
  const [data, setData] = useState<TaxData[]>([]);
  const [options, setOptions] = useState<ChartOptions>({
    chartType: 'Marginal rate',
    children: 0,
    childcare: 0,
    includeStudentLoan: false,
    includeMarriageAllowance: false,
  });
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);

  const calculateTax = (grossIncome: number, rules: any) => {
    let totalTax = 0;
    let personalAllowance = rules["statutory personal allowance"];

    // Personal Allowance adjustment
    if (grossIncome > rules["allowance withdrawal threshold"]) {
      const reduction = Math.min(
        personalAllowance,
        (grossIncome - rules["allowance withdrawal threshold"]) * rules["allowance withdrawal rate"]
      );
      personalAllowance = Math.max(0, personalAllowance - reduction);
    }

    let taxableIncome = Math.max(0, grossIncome - personalAllowance);

    // Income Tax
    for (const band of rules["income tax"]) {
      const threshold = band.threshold || Infinity;
      const amountInBand = Math.min(taxableIncome, threshold);
      totalTax += amountInBand * band.rate;
      taxableIncome -= amountInBand;
      if (taxableIncome <= 0) break;
    }

    // National Insurance
    let niTaxableIncome = grossIncome;
    for (const band of rules["NI"]) {
      const threshold = band.threshold || Infinity;
      if (niTaxableIncome > threshold) {
        const amountInBand = niTaxableIncome - threshold;
        totalTax += amountInBand * band.rate;
        niTaxableIncome = threshold;
      }
    }

    const netIncome = grossIncome - totalTax;
    const effectiveRate = grossIncome > 0 ? (totalTax / grossIncome) * 100 : 0;

    return { totalTax, netIncome, effectiveRate };
  };

  useEffect(() => {
    const generateData = () => {
      const newData: TaxData[] = [];
      const rules = taxRules["rUK 2024-25"];
      const maxIncome = 200000;
      const step = 100; // Default step
      const rateCalculationStep = 100; // Use a larger step for marginal rate calculation

      for (let grossIncome = 0; grossIncome <= maxIncome; grossIncome += step) {
        const { totalTax: tax1 } = calculateTax(grossIncome, rules);
        const { totalTax: tax2 } = calculateTax(grossIncome + rateCalculationStep, rules);
        
        const marginalRate = ((tax2 - tax1) / rateCalculationStep) * 100;
        const { netIncome, effectiveRate } = calculateTax(grossIncome, rules);

        newData.push({
          grossIncome,
          marginalRate,
          effectiveRate,
          netIncome
        });
      }

      // Add specific points to ensure we capture the transitions exactly
      const specificPoints = [12570, 12571, 50270, 50271, 100000, 100001, 125140, 125141];
      for (const point of specificPoints) {
        if (!newData.some(d => d.grossIncome === point)) {
          const lowerIncome = Math.max(0, point - rateCalculationStep / 2);
          const upperIncome = point + rateCalculationStep / 2;
          const { totalTax: tax1 } = calculateTax(lowerIncome, rules);
          const { totalTax: tax2 } = calculateTax(upperIncome, rules);
          
          const marginalRate = ((tax2 - tax1) / rateCalculationStep) * 100;
          const { netIncome, effectiveRate } = calculateTax(point, rules);

          newData.push({
            grossIncome: point,
            marginalRate,
            effectiveRate,
            netIncome
          });
        }
      }

      // Sort the data by gross income
      newData.sort((a, b) => a.grossIncome - b.grossIncome);

      setData(newData);
    };

    generateData();
  }, [options]);

  const toggleSeries = (dataKey: string) => {
    setHiddenSeries(prev => 
      prev.includes(dataKey) 
        ? prev.filter(key => key !== dataKey) 
        : [...prev, dataKey]
    );
  };

  const maxRate = useMemo(() => {
    return Math.max(...data.map(item => Math.max(item.marginalRate, item.effectiveRate))) + 10;
  }, [data]);

  const maxNetIncome = useMemo(() => {
    return Math.max(...data.map(item => item.netIncome));
  }, [data]);

  const formatCurrency = (value: number) => {
    return `£${value.toLocaleString()}`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.85)', 
          border: 'solid 1px rgba(255, 255, 255, 0.2)', 
          borderRadius: '5px',
          padding: '10px',
          color: 'white'
        }}>
          <p>Gross Income: {formatCurrency(label)}</p>
          {payload.map((entry: any) => (
            !hiddenSeries.includes(entry.dataKey) && (
              <p key={entry.dataKey}>
                {entry.name}: {entry.dataKey.includes('Rate') ? formatPercentage(entry.value) : formatCurrency(entry.value)}
              </p>
            )
          ))}
        </div>
      );
    }
    return null;
  };

  const renderCursorLegend = (props: any) => {
    const { payload } = props;
    return (
      <ul className="flex flex-wrap justify-center list-none p-0">
        {payload.map((entry: any, index: number) => (
          <li 
            key={`item-${index}`} 
            className={`inline-flex items-center mr-4 cursor-pointer ${hiddenSeries.includes(entry.dataKey) ? 'opacity-50' : ''}`}
            onClick={() => toggleSeries(entry.dataKey)}
          >
            <svg className="w-3 h-3 mr-1" style={{ fill: entry.color }}>
              <rect width="100%" height="100%" />
            </svg>
            <span className="text-sm text-gray-300">{entry.value}</span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="w-full h-[450px] bg-black p-0">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 50, left: 0, bottom: 0 }}
        >
          <XAxis 
            dataKey="grossIncome" 
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${value / 1000}k`}
            tick={{ fill: '#888', fontSize: 12 }}
            ticks={Array.from({ length: 21 }, (_, i) => i * 10000)}
            domain={[0, 200000]}
          />
          <YAxis 
            yAxisId="left"
            stroke="#888" 
            domain={[0, 100]}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${value}%`}
            tick={{ fill: '#888', fontSize: 12 }}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            stroke="#33FF57"
            domain={[0, 140000]}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${value / 1000}k`}
            ticks={Array.from({ length: Math.ceil(maxNetIncome / 20000) + 1 }, (_, i) => i * 20000)}
            tick={{ fill: '#888', fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={50} yAxisId="left" stroke="#888" strokeDasharray="3 3" />
          <Legend content={renderCursorLegend} />
          <Line 
            yAxisId="left"
            type="stepAfter" 
            dataKey="marginalRate" 
            name="Marginal Rate"
            stroke="#FFFFFF" 
            dot={false} 
            strokeWidth={2}
            hide={hiddenSeries.includes('marginalRate')}
          />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="effectiveRate" 
            name="Effective Rate"
            stroke="#FF5733" 
            dot={false} 
            strokeWidth={2}
            hide={hiddenSeries.includes('effectiveRate')}
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="netIncome" 
            name="Net Income"
            stroke="#33FF57" 
            dot={false} 
            strokeWidth={2}
            hide={hiddenSeries.includes('netIncome')}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default UKMarginalTaxRateChart;
