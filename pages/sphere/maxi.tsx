import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { CumBackingValueMAXI } from '@/hooks/CumBackingValueMAXI';
import Image from 'next/image';
import { TOKEN_LOGOS } from '@/constants/crypto';
import MusicPlayer from '@/components/MusicPlayer';
import React from 'react';

const playlist = [
  'maxi.mp3'
];

interface VisualizationSettings {
  radius: number;
  spiralPoints: number;
  spiralTurns: number;
  progressSpeed: number;
  rotationSpeedX: number;
  rotationSpeedY: number;
  rotationSpeedZ: number;
  globalRotationSpeed: number;
  baseColorHex: string;
  inactiveOpacity: number;
  inactiveColorHex: string;
  cameraDistance: number;
  fieldOfView: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
}

export default function SimpleSphere() {
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const { data: yieldData, isLoading } = CumBackingValueMAXI();
  const [currentDate, setCurrentDate] = useState<string>('');
  const [currentYield, setCurrentYield] = useState<number>(0);
  const [currentDay, setCurrentDay] = useState<number>(0);
  const [availableDays, setAvailableDays] = useState<number>(0);
  const animationFrameRef = useRef<number>();
  const currentDayRef = useRef<number>(0);
  const lastUpdateTime = useRef<number>(0);
  const UPDATE_INTERVAL = 50;

  const [settings] = useState<VisualizationSettings>({
    radius: 3,
    spiralPoints: 5555,
    spiralTurns: 1000,
    progressSpeed: 0.2,
    rotationSpeedX: -0.4,
    rotationSpeedY: 0.5,
    rotationSpeedZ: 0.8,
    globalRotationSpeed: 0.4,
    baseColorHex: '#3991ED',
    inactiveOpacity: 0.1,
    inactiveColorHex: '#fff',
    cameraDistance: 8,
    fieldOfView: 45,
    rotationX: -350,
    rotationY: 100,
    rotationZ: 90
  });

  useEffect(() => {
    if (!mountRef.current || isLoading || !yieldData || yieldData.length === 0) return;

    setAvailableDays(yieldData.length);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      settings.fieldOfView,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = settings.cameraDistance;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = -0.5;
    controls.enableZoom = false;
    controls.minDistance = settings.cameraDistance;
    controls.maxDistance = settings.cameraDistance;
    controlsRef.current = controls;

    const points: THREE.Vector3[] = [];
    const phi = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < settings.spiralPoints; i++) {
      const y = 1 - (i / (settings.spiralPoints - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = phi * i * settings.spiralTurns;
        
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;
        
      points.push(new THREE.Vector3(
        x * settings.radius,
        y * settings.radius,
        z * settings.radius
      ));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });

    const pointsMesh = new THREE.Points(geometry, material);
    pointsMesh.rotation.x = settings.rotationX;
    pointsMesh.rotation.y = settings.rotationY;
    pointsMesh.rotation.z = settings.rotationZ;
    scene.add(pointsMesh);

    const colors = new Float32Array(settings.spiralPoints * 4);
    const colorArray = new THREE.BufferAttribute(colors, 4);
    geometry.setAttribute('color', colorArray);

    const activeColor = new THREE.Color(settings.baseColorHex);
    const inactiveColor = new THREE.Color(settings.inactiveColorHex);

    const colorStates = new Array(availableDays + 1);
    for (let day = 0; day <= availableDays; day++) {
      const dayColors = new Float32Array(settings.spiralPoints * 4);
      for (let i = 0; i < settings.spiralPoints; i++) {
        const idx = i * 4;
        if (i <= day && i < availableDays) {
          dayColors[idx] = activeColor.r;
          dayColors[idx + 1] = activeColor.g;
          dayColors[idx + 2] = activeColor.b;
          dayColors[idx + 3] = 1.0;
        } else {
          dayColors[idx] = inactiveColor.r;
          dayColors[idx + 1] = inactiveColor.g;
          dayColors[idx + 2] = inactiveColor.b;
          dayColors[idx + 3] = settings.inactiveOpacity;
        }
      }
      colorStates[day] = dayColors;
    }

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      controls.update();

      pointsMesh.rotation.x += settings.rotationSpeedX * settings.globalRotationSpeed * 0.01;
      pointsMesh.rotation.y += settings.rotationSpeedY * settings.globalRotationSpeed * 0.01;
      pointsMesh.rotation.z += settings.rotationSpeedZ * settings.globalRotationSpeed * 0.01;

      const now = performance.now();
      if (now - lastUpdateTime.current > UPDATE_INTERVAL) {
        const daysPerInterval = (UPDATE_INTERVAL / (24 * 60 * 60 * 1000)) * (settings.progressSpeed * 10000000);
        
        currentDayRef.current += daysPerInterval;
        if (currentDayRef.current >= availableDays) {
          currentDayRef.current = 0;
        }

        const currentDayInt = Math.floor(currentDayRef.current);
        setCurrentDay(currentDayInt);

        if (yieldData[currentDayInt]) {
          const date = new Date(yieldData[currentDayInt].date);
          setCurrentDate(date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }));
          setCurrentYield(yieldData[currentDayInt].backingRatio);
        }

        colorArray.array.set(colorStates[currentDayInt]);
        colorArray.needsUpdate = true;

        lastUpdateTime.current = now;
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [settings, yieldData, isLoading, availableDays]);

  return (
    <div className="w-full h-full relative">
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
} 
