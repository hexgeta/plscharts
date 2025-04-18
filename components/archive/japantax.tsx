import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine, ComposedChart } from 'recharts';

const JPY_TO_USD_RATE = 0.0067;

const taxRules = {
  "Japan 2023": {
    "income tax": [
      { "rate": 0.05, "threshold": 1950000 },
      { "rate": 0.10, "threshold": 3300000 },
      { "rate": 0.20, "threshold": 6950000 },
      { "rate": 0.23, "threshold": 9000000 },
      { "rate": 0.33, "threshold": 18000000 },
      { "rate": 0.40, "threshold": 40000000 },
      { "rate": 0.45, "threshold": Infinity }
    ],
    "basic deduction": 480000,
    "employment income deduction": [
      { "threshold": 1800000, "deduction": 550000, "rate": 0 },
      { "threshold": 3600000, "rate": 0.4, "minus": 170000 },
      { "threshold": 6600000, "rate": 0.3, "plus": 190000 },
      { "threshold": 8500000, "rate": 0.2, "plus": 850000 },
      { "threshold": Infinity, "rate": 0.1, "plus": 1700000 }
    ],
    "social insurance": {
      "health insurance rate": 0.05,
      "pension insurance rate": 0.0915,
      "employment insurance rate": 0.003,
      "nursing care insurance rate": 0.0085, // Only applies to those 40 and over
    },
    "local inhabitant tax rate": 0.10
  }
};

interface TaxData {
  grossIncome: number;
  marginalRate: number;
  effectiveRate: number;
  netIncome: number;
  incomeTax: number;
  localInhabitantTax: number;
  socialInsurance: number;
}

const JapaneseTaxRateChart: React.FC = () => {
  const [data, setData] = useState<TaxData[]>([]);

  const calculateTax = (grossIncomeJPY: number, rules: any) => {
    // Employment Income Deduction
    let employmentDeduction = 0;
    for (const bracket of rules["employment income deduction"]) {
      if (grossIncomeJPY <= bracket.threshold) {
        if (bracket.rate === 0) {
          employmentDeduction = bracket.deduction;
        } else {
          employmentDeduction = grossIncomeJPY * bracket.rate + (bracket.plus || 0) - (bracket.minus || 0);
        }
        break;
      }
    }
    employmentDeduction = Math.min(employmentDeduction, 2200000); // Cap at 2,200,000 yen

    // Calculate taxable income
    let taxableIncome = Math.max(0, grossIncomeJPY - employmentDeduction - rules["basic deduction"]);

    // Income Tax
    let incomeTax = 0;
    for (const bracket of rules["income tax"]) {
      if (taxableIncome > bracket.threshold) {
        incomeTax += (Math.min(taxableIncome, bracket.threshold) - (bracket.threshold || 0)) * bracket.rate;
      } else {
        incomeTax += taxableIncome * bracket.rate;
        break;
      }
    }

    // Local Inhabitant Tax
    const localInhabitantTax = taxableIncome * rules["local inhabitant tax rate"];

    // Social Insurance (with cap)
    const socialInsurance = Math.min(grossIncomeJPY * rules["social insurance"]["health insurance rate"], rules["social insurance"]["pension insurance rate"]);

    const totalTax = incomeTax + localInhabitantTax + socialInsurance;
    const netIncomeJPY = grossIncomeJPY - totalTax;
    const effectiveRate = (totalTax / grossIncomeJPY) * 100;

    return {
      totalTax,
      netIncomeUSD: netIncomeJPY * JPY_TO_USD_RATE,
      effectiveRate,
      grossIncomeUSD: grossIncomeJPY * JPY_TO_USD_RATE,
      incomeTax,
      localInhabitantTax,
      socialInsurance
    };
  };

  const calculateMarginalRate = (grossIncomeJPY: number, rules: any) => {
    const step = 1000;
    const tax1 = calculateTax(grossIncomeJPY, rules).totalTax;
    const tax2 = calculateTax(grossIncomeJPY + step, rules).totalTax;
    return ((tax2 - tax1) / step) * 100;
  };

  useEffect(() => {
    const generateData = () => {
      const newData: TaxData[] = [];
      const rules = taxRules["Japan 2023"];
      const maxIncomeUSD = 200000;
      const stepUSD = 1000;

      for (let grossIncomeUSD = 0; grossIncomeUSD <= maxIncomeUSD; grossIncomeUSD += stepUSD) {
        const grossIncomeJPY = grossIncomeUSD / JPY_TO_USD_RATE;
        const { netIncomeUSD, effectiveRate } = calculateTax(grossIncomeJPY, rules);
        const marginalRate = calculateMarginalRate(grossIncomeJPY, rules);

        newData.push({
          grossIncome: grossIncomeUSD,
          marginalRate,
          effectiveRate,
          netIncome: netIncomeUSD,
          incomeTax: calculateTax(grossIncomeJPY, rules).incomeTax,
          localInhabitantTax: calculateTax(grossIncomeJPY, rules).localInhabitantTax,
          socialInsurance: calculateTax(grossIncomeJPY, rules).socialInsurance
        });
      }

      setData(newData);
    };

    generateData();
  }, []);

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
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
            <p key={entry.dataKey}>
              {entry.name}: {entry.dataKey.includes('Rate') ? formatPercentage(entry.value) : formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
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
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            tick={{ fill: '#888', fontSize: 12 }}
            ticks={[0, 50000, 100000, 150000, 200000]}
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
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            tick={{ fill: '#888', fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <ReferenceLine y={50} yAxisId="left" stroke="#888" strokeDasharray="3 3" />
          <Line 
            yAxisId="left"
            type="stepAfter" 
            dataKey="marginalRate" 
            name="Marginal Rate"
            stroke="#FFFFFF" 
            dot={false} 
            strokeWidth={2}
          />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="effectiveRate" 
            name="Effective Rate"
            stroke="#FF5733" 
            dot={false} 
            strokeWidth={2}
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="netIncome" 
            name="Net Income"
            stroke="#33FF57" 
            dot={false} 
            strokeWidth={2}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default JapaneseTaxRateChart;
