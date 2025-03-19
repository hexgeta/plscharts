'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

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

export default function AnimatedChart() {
  const chartRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !chartRef.current) return;

    const svg = d3.select(chartRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .style("overflow", "visible")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3.scaleBand<string>()
      .range([0, width])
      .padding(0.1);
    
    const y = d3.scaleLinear()
      .range([height, 0]);

    const yAxis = d3.axisLeft(y);

    // Colors
    const industryColor = (industry: string) => {
      switch (industry) {
        case "Finance": return "#F34D5B";
        case "Technology": return "#FFC000";
        case "Industrial": return "#95E06C";
        case "Energy": return "#00B0F0";
        case "Diversified": return "#F34D5B";
        case "Consumer": return "#00B0F0";
        default: return "#000000";
      }
    };

    // Process data function
    const processData = (rawData: { [key: string]: DayData }) => {
      return Object.values(rawData).map((dayData) => {
        const billionaires = Object.entries(dayData)
          .filter(([key]) => !["Date", "Day", "Month", "Year"].includes(key))
          .map(([_, value]) => value as Billionaire)
          .filter((b) => b.Rank !== 0)
          .sort((a, b) => b.Net_Wealth - a.Net_Wealth)
          .slice(0, numberOfRows);

        return {
          date: dayData.Date,
          billionaires
        };
      });
    };

    // Update chart function
    const updateChart = (data: { date: string; billionaires: Billionaire[] }) => {
      // Update scales
      x.domain(data.billionaires.map(d => d.Name));
      y.domain([0, d3.max(data.billionaires, d => d.Net_Wealth) || 0]);

      // Update axes
      svg.select(".y-axis").remove();
      svg.append("g")
        .attr("class", "y-axis")
        .call(yAxis);

      // Bars
      const bars = svg.selectAll<SVGRectElement, Billionaire>(".bar")
        .data(data.billionaires, d => d.Name);

      bars.exit().remove();

      bars.enter()
        .append("rect")
        .attr("class", "bar")
        .merge(bars)
        .transition()
        .duration(animationDuration)
        .attr("x", d => x(d.Name) || 0)
        .attr("width", x.bandwidth())
        .attr("y", d => y(d.Net_Wealth))
        .attr("height", d => height - y(d.Net_Wealth))
        .attr("fill", d => industryColor(d.Industry));

      // Labels
      const labels = svg.selectAll<SVGTextElement, Billionaire>(".label")
        .data(data.billionaires, d => d.Name);

      labels.exit().remove();

      labels.enter()
        .append("text")
        .attr("class", "label")
        .merge(labels)
        .transition()
        .duration(animationDuration)
        .attr("x", d => (x(d.Name) || 0) + x.bandwidth() / 2)
        .attr("y", d => y(d.Net_Wealth) - 5)
        .attr("text-anchor", "middle")
        .text(d => `$${d.Net_Wealth}B`);

      // Date display
      svg.select(".date-display")
        .text(data.date);
    };

    // Load and initialize data
    const loadData = async () => {
      try {
        const response = await fetch('/api/billionaires');
        const data = await response.json();
        const processedData = processData(data);
        
        // Initial render
        updateChart(processedData[0]);

        // Animate through dates
        processedData.slice(1).forEach((dayData, index) => {
          setTimeout(() => {
            updateChart(dayData);
          }, (index + 1) * animationDuration);
        });
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();

    // Cleanup
    return () => {
      svg.selectAll("*").remove();
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-black text-white p-4">
      <h1 className="text-3xl font-bold mb-8">World's Richest People</h1>
      <svg 
        ref={chartRef}
        className="w-full h-full"
        style={{ minHeight: verticalDimensions }}
      />
    </div>
  );
}