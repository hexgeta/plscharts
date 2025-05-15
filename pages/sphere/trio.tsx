import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { CumBackingValueTRIO } from '@/hooks/CumBackingValueTRIO';
import { CoinLogo } from '@/components/ui/CoinLogo';
import MusicPlayer from '@/components/MusicPlayer';
import React from 'react';

const playlist = [
  'trio.mp3'
];

// Configuration object for all adjustable parameters
interface VisualizationSettings {
  // Sphere Configuration
  radius: number;
  spiralPoints: number;
  spiralTurns: number;
  
  // Animation Settings
  progressSpeed: number;
  rotationSpeedX: number;
  rotationSpeedY: number;
  rotationSpeedZ: number;
  globalRotationSpeed: number;
  
  // Visual Settings
  baseColorHex: string;
  inactiveOpacity: number;
  inactiveColorHex: string;
  
  // Camera Settings
  cameraDistance: number;
  fieldOfView: number;

  // Rotation Settings
  rotationX: number;
  rotationY: number;
  rotationZ: number;
}

export default function YieldSphere() {
  const [hasEntered, setHasEntered] = useState(false);
  const [shouldPlayMusic, setShouldPlayMusic] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const { data: yieldData, isLoading } = CumBackingValueTRIO();
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [currentDate, setCurrentDate] = useState<string>('');
  const [currentYield, setCurrentYield] = useState<number>(0);
  const [currentDay, setCurrentDay] = useState<number>(0);
  const [availableDays, setAvailableDays] = useState<number>(0);
  
  // Add refs for animation values
  const animationFrameRef = useRef<number>();
  const currentDayRef = useRef<number>(0);
  const lastUpdateTime = useRef<number>(0);
  const UPDATE_INTERVAL = 50; // Update UI every 50ms

   // Initialize settings with optimal default values
   const [settings, setSettings] = useState<VisualizationSettings>({
    // Sphere Configuration
    radius: 3,
    spiralPoints: 1111,
    spiralTurns: 1000,
    
    // Animation Settings
    progressSpeed: 0.082,
    rotationSpeedX: -0.4,
    rotationSpeedY: 0.5,
    rotationSpeedZ: 0.8,
    globalRotationSpeed: 0.4,
    
    // Visual Settings
    baseColorHex: '#fff', // Green color for TRIO
    inactiveOpacity: 0.1,
    inactiveColorHex: '#fff',
    
    // Camera Settings
    cameraDistance: 8,
    fieldOfView: 45,

    // Rotation Settings
    rotationX: -350,
    rotationY: 100,
    rotationZ: 90,
  });

  const handleEnter = () => {
    setHasEntered(true);
    setShouldPlayMusic(true);
  };

  useEffect(() => {
    if (!canvasRef.current || isLoading || !yieldData || yieldData.length === 0 || !hasEntered) return;

    // Set available days from yield data
    setAvailableDays(yieldData.length);

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      settings.fieldOfView,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000);
    canvasRef.current.appendChild(renderer.domElement);

    // Setup OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = -0.5;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.panSpeed = 0.5;
    controls.zoomSpeed = 0.5;
    controls.minPolarAngle = -Infinity;
    controls.maxPolarAngle = Infinity;
    controls.minAzimuthAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity;
    controls.minDistance = 0;
    controls.maxDistance = Infinity;
    controls.enableRotate = true;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };
    
    // Position camera and set target
    camera.position.set(0, 0, settings.cameraDistance);
    controls.target.set(0, 0, 0);
    controls.update();
    
    controlsRef.current = controls;

    // Create points for the spiral pattern
    const points: THREE.Vector3[] = [];
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle

    for(let i = 0; i < settings.spiralPoints; i++) {
      const y = 1 - (i / (settings.spiralPoints - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      
      const theta = phi * i * settings.spiralTurns;
        
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;
        
        points.push(new THREE.Vector3(x * settings.radius, y * settings.radius, z * settings.radius));
    }

    // Create geometry from points
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    
    // Create point material
    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });

    // Create points mesh
    const pointsMesh = new THREE.Points(geometry, material);
    pointsMesh.rotation.x = settings.rotationX;
    pointsMesh.rotation.y = settings.rotationY;
    pointsMesh.rotation.z = settings.rotationZ;
    scene.add(pointsMesh);

    // Initialize colors
    const colors = new Float32Array(settings.spiralPoints * 4); // RGBA
    const colorArray = new THREE.BufferAttribute(colors, 4);
    geometry.setAttribute('color', colorArray);

    // Color setup
    const activeColor = new THREE.Color(settings.baseColorHex);
    const inactiveColor = new THREE.Color(settings.inactiveColorHex);

    // Pre-calculate all color states
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

    // Animation function
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      // Update controls
      controls.update();

      // Rotate the points mesh on all axes with global speed multiplier
      pointsMesh.rotation.x += settings.rotationSpeedX * settings.globalRotationSpeed * 0.01;
      pointsMesh.rotation.y += settings.rotationSpeedY * settings.globalRotationSpeed * 0.01;
      pointsMesh.rotation.z += settings.rotationSpeedZ * settings.globalRotationSpeed * 0.01;

      const now = performance.now();
      if (now - lastUpdateTime.current > UPDATE_INTERVAL) {
        // Calculate days to advance
        const daysPerInterval = (UPDATE_INTERVAL / (24 * 60 * 60 * 1000)) * (settings.progressSpeed * 10000000);
        
        // Update yield visualization
        currentDayRef.current += daysPerInterval;
        
        // Reset to 0 if we've exceeded available days
        if (currentDayRef.current >= availableDays) {
          currentDayRef.current = 0;
        }

        // Update UI state less frequently
        const currentDayInt = Math.floor(currentDayRef.current);
        setCurrentDay(currentDayInt);

        // Update current date and yield display
        if (yieldData[currentDayInt]) {
          const date = new Date(yieldData[currentDayInt].date);
          setCurrentDate(date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }));
          setCurrentYield(yieldData[currentDayInt].backingRatio);
        }

        // Use pre-calculated colors
        colorArray.array.set(colorStates[currentDayInt]);
        colorArray.needsUpdate = true;

        lastUpdateTime.current = now;
      }

      renderer.render(scene, camera);
    };

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', handleResize);
      if (canvasRef.current) {
        canvasRef.current.removeChild(renderer.domElement);
      }
      controls.dispose();
    };
  }, [yieldData, isLoading, settings, availableDays, hasEntered]);

  const updateSetting = (key: keyof VisualizationSettings, value: number | string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="w-full h-screen overflow-hidden cursor-grab active:cursor-grabbing" ref={canvasRef}>
      <div className="absolute bottom-4 right-4 z-10">
        <MusicPlayer playlist={playlist} autoPlay={shouldPlayMusic} />
      </div>
      
      <div className="absolute top-4 left-4 text-white z-10 bg-black/20 backdrop-blur-sm p-4 rounded-xl border-2 border-white/10">
        <div className="flex items-center gap-2">
          <CoinLogo
            symbol="TRIO"
            size="sm"
            className="rounded-full"
          />
          <h1 className="text-2xl font-bold">pTRIO</h1>
        </div>
        <p>Visualizing cumulative yield accumulation</p>
        {currentDate && (
          <div className="mt-4 space-y-2">
            <p>Date: {currentDate}</p>
            <p>1 TRIO = {currentYield.toFixed(4)} HEX</p>
            <p>Day: {currentDay} / {availableDays} of {settings.spiralPoints}</p>
            <div className="w-full bg-white/30 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-200"
                style={{ width: `${(currentDay / settings.spiralPoints) * 100}%` }}
              />
            </div>
             <div className="flex justify-between text-xs text-white/70">
              <span>Current Progress</span>
              <span>{((currentDay / settings.spiralPoints) * 100).toFixed(2)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Overlay */}
      {!hasEntered && (
        <div className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center gap-4 cursor-default" style={{ position: 'fixed' }}>
          <div className="flex flex-col items-center justify-center text-white text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">TRIO Yield Sphere</h1>
            <p className="text-center text-gray-400 mb-8 max-w-xs">
              Visualizing cumulative yield accumulation to some sweet tunes.
            </p>
            <button 
              onClick={handleEnter}
              className="bg-white text-black px-8 py-2 rounded-md font-medium hover:bg-gray-100 transition-colors"
            >
              Start
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 