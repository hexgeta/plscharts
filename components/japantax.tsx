import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const JapaneseTaxRateChart = () => {
  const data = {
    labels: ['¥0', '¥1.95M', '¥3.3M', '¥6.95M', '¥9M', '¥18M', '¥40M'],
    datasets: [
      {
        label: 'Tax Rate %',
        data: [5, 10, 20, 23, 33, 40, 45],
        borderColor: '#BC002D',
        backgroundColor: 'rgba(188, 0, 45, 0.5)',
        tension: 0.1,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'white',
        },
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        ticks: {
          color: 'white',
          callback: function(value: any) {
            return value + '%';
          },
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      x: {
        ticks: {
          color: 'white',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-black/20 rounded-lg">
      <Line options={options} data={data} />
    </div>
  );
};

export default JapaneseTaxRateChart; 