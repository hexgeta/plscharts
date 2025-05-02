'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

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

interface Node {
  id: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  mesh: THREE.Mesh;
  label: string;
}

interface Link {
  source: Node;
  target: Node;
  line: THREE.Line;
  value: number;
}

const COLORS = {
  'Main': 0xFFFF00,
  'Other': 0x00FFFF,
};

export function WalletNetwork({ transactions, isLoading }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    nodes: Map<string, Node>;
    links: Link[];
  }>();

  useEffect(() => {
    if (!containerRef.current) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 50;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    sceneRef.current = {
      scene,
      camera,
      renderer,
      controls,
      nodes: new Map(),
      links: []
    };
    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current || !transactions.length) return;
    const { scene, nodes, links } = sceneRef.current;
    nodes.forEach(node => scene.remove(node.mesh));
    links.forEach(link => scene.remove(link.line));
    nodes.clear();
    links.length = 0;
    const uniqueWallets = new Set<string>();
    transactions.forEach(tx => {
      uniqueWallets.add(tx.label);
    });
    Array.from(uniqueWallets).forEach((label, index) => {
      const geometry = new THREE.SphereGeometry(1, 32, 32);
      const material = new THREE.MeshBasicMaterial({
        color: COLORS[label as keyof typeof COLORS] || 0xFFFFFF
      });
      const mesh = new THREE.Mesh(geometry, material);
      const angle = (index / uniqueWallets.size) * Math.PI * 2;
      const radius = 20;
      mesh.position.x = Math.cos(angle) * radius;
      mesh.position.y = Math.sin(angle) * radius;
      scene.add(mesh);
      nodes.set(label, {
        id: label,
        position: mesh.position,
        velocity: new THREE.Vector3(),
        mesh,
        label
      });
    });
    transactions.forEach(tx => {
      const sourceNode = nodes.get(tx.label);
      const targetNode = Array.from(nodes.values()).find(
        node => node.id === tx.to || node.id === tx.from
      );
      if (sourceNode && targetNode) {
        const value = parseFloat(tx.value) / 1e18;
        const geometry = new THREE.BufferGeometry().setFromPoints([
          sourceNode.position,
          targetNode.position
        ]);
        const material = new THREE.LineBasicMaterial({
          color: 0xFFFFFF,
          opacity: 0.2,
          transparent: true
        });
        const line = new THREE.Line(geometry, material);
        scene.add(line);
        links.push({
          source: sourceNode,
          target: targetNode,
          line,
          value
        });
      }
    });
  }, [transactions]);

  if (isLoading) {
    return (
      <div className="w-full h-[600px] my-8 relative">
        <div className="w-full h-full p-5 border border-white/20 rounded-[15px] bg-black/40">
          <div className="flex items-center justify-center h-full">
            <div className="text-white">Loading network visualization...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] my-8 relative">
      <div className="w-full h-full p-5 border border-white/20 rounded-[15px] bg-black/40">
        <h2 className="text-left text-white text-2xl mb-4 ml-10">
          Wallet Network Activity
        </h2>
        <div ref={containerRef} className="w-full h-[500px]" />
      </div>
    </div>
  );
}

export default WalletNetwork; 