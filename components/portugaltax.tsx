import React, { useEffect, useState, useMemo } from 'react';
import { ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';

// Portuguese tax rules for 2023 (replace with actual data)
const taxRules = {
  "Portugal 2023": {
    "income tax": [
      { "name": "1st", "rate": 0.145, "threshold": 7479 },
      { "name": "2nd", "rate": 0.21, "threshold": 11284 },
      { "name": "3rd", "rate": 0.265, "threshold": 15992 },
      { "name": "4th", "rate": 0.285, "threshold": 20700 },
      { "name": "5th", "rate": 0.35, "threshold": 26355 },
      { "name": "6th", "rate": 0.37, "threshold": 38632 },
      { "name": "7th", "rate": 0.435, "threshold": 50483 },
      { "name": "8th", "rate": 0.45 }
    ],
    "social security": {
      "employee": 0.11,
      "employer": 0.2375
    },
    "minimum wage": 760 * 14, // Monthly minimum wage * 14 months
    "standard deduction": 4104
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

const PortugalTaxRateChart: React.FC = () => {
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
    let taxableIncome = Math.max(0, grossIncome - rules["standard deduction"]);

    // Income Tax
    for (const band of rules["income tax"]) {
      const threshold = band.threshold || Infinity;
      const amountInBand = Math.min(taxableIncome, threshold);
      totalTax += amountInBand * band.rate;
      taxableIncome -= amountInBand;
      if (taxableIncome <= 0) break;
    }

    // Social Security
    const socialSecurity = grossIncome * rules["social security"].employee;
    totalTax += socialSecurity;

    const netIncome = grossIncome - totalTax;
    const effectiveRate = grossIncome > 0 ? (totalTax / grossIncome) * 100 : 0;

    return { totalTax, netIncome, effectiveRate };
  };

  useEffect(() => {
    const generateData = () => {
      const newData: TaxData[] = [];
      const rules = taxRules["Portugal 2023"];
      const maxIncome = 200000;
      const step = 100;
      const rateCalculationStep = 100;

      for (let grossIncome = 0; grossIncome <= maxIncome; grossIncome += step) {
        const { totalTax, netIncome, effectiveRate } = calculateTax(grossIncome, rules);
        
        // Calculate marginal rate
        const marginalRate = grossIncome > 0
          ? ((calculateTax(grossIncome + rateCalculationStep, rules).totalTax - totalTax) / rateCalculationStep) * 100
          : 0;

        newData.push({
          grossIncome,
          marginalRate,
          effectiveRate,
          netIncome
        });
      }

      // Add specific points for Portuguese tax brackets
      const specificPoints = [7479, 11284, 15992, 20700, 26355, 38632, 50483, 78834];
      // ... (keep existing logic for adding specific points)

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
            tick={{ fill: '#888', fontSize: 12 }}
            ticks={[0, 20000, 40000, 60000, 80000, 100000, 120000, 140000]}
          />
          <Tooltip content={<CustomTooltip />} />
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
          <ReferenceLine y={50} yAxisId="left" stroke="#888" strokeDasharray="3 3" />
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

export default PortugalTaxRateChart;
