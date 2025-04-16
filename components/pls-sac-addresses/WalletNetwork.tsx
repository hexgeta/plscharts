import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ForceGraph3D } from 'react-force-graph';

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  blockNumber: string;
  isError?: string;
  reference: string;
  label: string;
}

interface Props {
  transactions: Transaction[];
  isLoading: boolean;
}

const WALLET_COLORS = {
  'Main Sac': '#FFFF00',
  'Daughter 1': '#00FFFF',
  'Daughter 2': '#FF00FF',
  'Daughter 3': '#00FF00',
  'Daughter 4': '#FF8C00',
  'Daughter 5': '#4B0082',
  'Daughter 6': '#FF1493',
  'Daughter 7': '#20B2AA',
  'Daughter 8': '#BA55D3',
  'Daughter 9': '#F0E68C',
  'Daughter 10': '#98FB98',
  'Daughter 11': '#FFA07A',
  'Daughter 12': '#9370DB',
  'Daughter 13': '#3CB371',
  'Daughter 14': '#FFB6C1',
  'Daughter 15': '#BDB76B',
  'Daughter 16': '#20B2AA',
  'Daughter 17': '#FF69B4',
  'Daughter 18': '#7B68EE',
  'Daughter 19': '#00CED1',
  'Daughter 20': '#DEB887',
  'Daughter 21': '#00FFFF',
  'Daughter 22': '#9932CC',
  'Daughter 23': '#FF7F50',
  'Daughter 24': '#8FBC8F',
  'Daughter 25': '#E6E6FA',
  'Daughter 26': '#B8860B',
  'Daughter 27': '#98FB98',
  'Daughter 28': '#CD853F',
  'Daughter 29': '#FFB6C1',
  'Daughter 30': '#7B68EE'
};

export function WalletNetwork({ transactions, isLoading }: Props) {
  const processTransactions = (transactions: Transaction[]) => {
    const nodes = new Map();
    const links = new Map();

    // First pass: Create nodes
    transactions.forEach(tx => {
      if (!nodes.has(tx.label)) {
        nodes.set(tx.label, {
          id: tx.label,
          name: tx.label,
          val: 1, // Size of node
          color: WALLET_COLORS[tx.label as keyof typeof WALLET_COLORS],
          totalValue: 0
        });
      }
    });

    // Second pass: Create links and update node values
    transactions.forEach(tx => {
      const value = Number(tx.value) / 1e18;
      const fromNode = tx.label;
      const toLabel = Object.entries(WALLET_COLORS).find(
        ([_, addr]) => addr.toLowerCase() === tx.to.toLowerCase()
      )?.[0];

      if (fromNode && toLabel) {
        const linkId = `${fromNode}-${toLabel}`;
        const reverseLinkId = `${toLabel}-${fromNode}`;

        if (!links.has(linkId) && !links.has(reverseLinkId)) {
          links.set(linkId, {
            source: fromNode,
            target: toLabel,
            value,
          });
        } else {
          const existingLink = links.get(linkId) || links.get(reverseLinkId);
          if (existingLink) {
            existingLink.value += value;
          }
        }

        // Update node values
        const node = nodes.get(fromNode);
        if (node) {
          node.totalValue += value;
          node.val = Math.log(node.totalValue + 1) + 1; // Logarithmic scaling
        }
      }
    });

    return {
      nodes: Array.from(nodes.values()),
      links: Array.from(links.values())
    };
  };

  const graphData = processTransactions(transactions);

  return (
    <div className="w-full h-[600px] my-8 relative">
      <div className="w-full h-full p-5 border border-white/20 rounded-[15px] bg-black/40">
        <h2 className="text-left text-white text-2xl mb-4 ml-10">
          Wallet Network Activity
        </h2>
        <ForceGraph3D
          graphData={graphData}
          nodeLabel="name"
          nodeColor="color"
          nodeVal="val"
          linkWidth={1}
          linkColor={() => '#ffffff'}
          backgroundColor="#00000000"
          linkOpacity={0.2}
          nodeOpacity={0.9}
          nodeResolution={8}
          linkDirectionalParticles={2}
          linkDirectionalParticleWidth={0.5}
          linkDirectionalParticleSpeed={0.005}
          controlType="orbit"
        />
      </div>
    </div>
  );
}

export default WalletNetwork; 