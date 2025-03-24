'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Constants
const numberOfRows = 10;
const horizontalDimensions = 1100;
const verticalDimensions = 930;
const margin = { top: 270, right: 100, bottom: 100, left: 100 };
const width = horizontalDimensions - margin.left - margin.right;
const height = verticalDimensions - margin.top - margin.bottom;
const animationDuration = 300;

// Types
interface Billionaire {
  Name: string;
  First_Name: string;
  Surname: string;
  Net_Wealth: number;
  Industry: string;
  Rank: number;
}

interface DayData {
  Date: string;
  [key: string]: any;
}

// Dynamically import the chart component with no SSR
const AnimatedChart = dynamic(() => import('../components/AnimatedChart'), {
  ssr: false,
});

export default function AnimatedChartPage() {
  return (
    <div className="w-full h-full min-h-screen bg-black">
      <Suspense fallback={<div className="text-white">Loading...</div>}>
        <AnimatedChart />
      </Suspense>
    </div>
  );
}