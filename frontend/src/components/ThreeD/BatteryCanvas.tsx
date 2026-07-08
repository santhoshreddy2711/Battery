import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

// 3D Procedural Battery Model
const BatteryModel: React.FC<{ isExpanded: boolean }> = ({ isExpanded }) => {
  const batteryRef = useRef<THREE.Group>(null);
  const leftTerminalRef = useRef<THREE.Mesh>(null);
  const rightTerminalRef = useRef<THREE.Mesh>(null);
  
  // Rotate the battery slowly
  useFrame((state) => {
    if (batteryRef.current) {
      // Auto-rotation
      batteryRef.current.rotation.y = state.clock.getElapsedTime() * 0.4;
      // Floating animation
      batteryRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 1.5) * 0.1;
    }
  });

  return (
    <group ref={batteryRef}>
      {/* 1. Main Casing (Slate Gray Box) */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.5, 1.5, 1.3]} />
        <meshStandardMaterial 
          color="#1e293b" 
          roughness={0.4} 
          metalness={0.2} 
        />
      </mesh>

      {/* 2. Red Top Accent Cover */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[2.56, 0.18, 1.36]} />
        <meshStandardMaterial 
          color="#dc2626" 
          roughness={0.3} 
          metalness={0.1}
          emissive="#7f1d1d"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* 3. positive Terminal (+) */}
      <group position={[-0.8, 0.95, 0]}>
        {/* Terminal Cap */}
        <mesh ref={leftTerminalRef} castShadow>
          <cylinderGeometry args={[0.15, 0.15, 0.25, 16]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.1} metalness={0.9} />
        </mesh>
        {/* Positive Red Ring */}
        <mesh position={[0, -0.1, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.05, 16]} />
          <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.5} />
        </mesh>
      </group>

      {/* 4. Negative Terminal (-) */}
      <group position={[0.8, 0.95, 0]}>
        {/* Terminal Cap */}
        <mesh ref={rightTerminalRef} castShadow>
          <cylinderGeometry args={[0.15, 0.15, 0.25, 16]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.1} metalness={0.9} />
        </mesh>
        {/* Negative Blue Ring */}
        <mesh position={[0, -0.1, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.05, 16]} />
          <meshStandardMaterial color="#2563eb" emissive="#2563eb" emissiveIntensity={0.5} />
        </mesh>
      </group>

      {/* 5. Battery Plate Grates (Procedural Visual Lines on Casing) */}
      {[...Array(6)].map((_, i) => (
        <mesh key={i} position={[-1 + i * 0.4, 0, 0.66]}>
          <boxGeometry args={[0.1, 1.0, 0.02]} />
          <meshStandardMaterial color="#0f172a" roughness={0.5} />
        </mesh>
      ))}

      {/* Behind details */}
      {[...Array(6)].map((_, i) => (
        <mesh key={i} position={[-1 + i * 0.4, 0, -0.66]}>
          <boxGeometry args={[0.1, 1.0, 0.02]} />
          <meshStandardMaterial color="#0f172a" roughness={0.5} />
        </mesh>
      ))}

      {/* 6. Glowing Energy Grid Lines (representing high-tech charge) */}
      <mesh position={[0, 0, 0.01]}>
        <boxGeometry args={[2.2, 1.2, 1.32]} />
        <meshStandardMaterial 
          color="#ef4444" 
          wireframe
          transparent
          opacity={0.15}
          emissive="#ef4444"
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
};

// Particle Background and Sparks
const EnergySparks: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const particleCount = 200;

  // Use useMemo to generate positions and speeds once, preventing recreation on every render
  const [positions, speeds] = React.useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const spd = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 5;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 4;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 5;
      spd[i] = 0.5 + Math.random() * 1.5;
    }
    return [pos, spd];
  }, []);

  useFrame((state) => {
    if (pointsRef.current && pointsRef.current.geometry.attributes.position) {
      const positionAttribute = pointsRef.current.geometry.attributes.position;
      const count = positionAttribute.count;

      for (let i = 0; i < count; i++) {
        let x = positionAttribute.getX(i);
        let y = positionAttribute.getY(i);
        let z = positionAttribute.getZ(i);

        // Move upwards representing energy
        y += speeds[i] * 0.02;

        // Reset if too high
        if (y > 3) {
          y = -2;
          x = (Math.random() - 0.5) * 4;
          z = (Math.random() - 0.5) * 4;
        }

        positionAttribute.setXYZ(i, x, y, z);
      }
      positionAttribute.needsUpdate = true;
      pointsRef.current.rotation.y = state.clock.getElapsedTime() * 0.05;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#f87171"
        size={0.06}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

// Canvas Error Boundary for WebGL incompatibilities or rendering crashes
class CanvasErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.warn("WebGL Canvas rendering failed, falling back to 2D graphic:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// High-Fidelity 2D Fallback
const BatteryFallback: React.FC = () => {
  return (
    <div className="w-full h-full min-h-[350px] flex flex-col items-center justify-center bg-slate-950/45 rounded-3xl border border-slate-800/40 p-6 text-center relative overflow-hidden backdrop-blur-md">
      {/* Glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-red-600/10 blur-2xl pointer-events-none"></div>
      
      {/* Glowing Battery Icon */}
      <div className="relative mb-6">
        <div className="h-24 w-12 rounded-xl border-4 border-red-500 flex flex-col justify-end p-1 relative">
          {/* Battery positive cap */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-2 bg-red-500 rounded-t-sm"></div>
          {/* Battery charge level */}
          <div className="w-full bg-gradient-to-t from-red-600 to-rose-500 rounded-lg h-3/4 shadow-[0_0_15px_#dc2626] animate-pulse"></div>
        </div>
        {/* Bolt icon */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-100 drop-shadow-[0_2px_8px_rgba(220,38,38,0.8)]">
          <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>
      </div>
      
      <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Interactive 3D Engine Paused</span>
      <p className="text-[9px] text-slate-500 mt-1 max-w-xs leading-normal">
        WebGL acceleration is unavailable. Displaying premium 2D visual fallback.
      </p>
    </div>
  );
};

export const BatteryCanvas: React.FC<{ isExpanded?: boolean }> = ({ isExpanded = false }) => {
  const [isHovered, setIsHovered] = useState(false);

  // Check WebGL support proactively
  const supportsWebGL = React.useMemo(() => {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }, []);

  if (!supportsWebGL) {
    return <BatteryFallback />;
  }

  return (
    <CanvasErrorBoundary fallback={<BatteryFallback />}>
      <div 
        className="w-full h-full min-h-[350px] relative cursor-grab active:cursor-grabbing select-none"
        onPointerOver={() => setIsHovered(true)}
        onPointerOut={() => setIsHovered(false)}
      >
        <Canvas shadows>
          <ambientLight intensity={isHovered ? 0.9 : 0.6} />
          
          {/* Main dramatic spot light from top */}
          <spotLight 
            position={[5, 10, 5]} 
            angle={0.3} 
            penumbra={1} 
            intensity={2.5} 
            castShadow 
            shadow-bias={-0.0001}
          />
          
          {/* Glow point lights near terminals */}
          <pointLight position={[-0.8, 1.2, 0]} intensity={1.5} color="#ef4444" distance={3} />
          <pointLight position={[0.8, 1.2, 0]} intensity={1.5} color="#3b82f6" distance={3} />

          <PerspectiveCamera makeDefault position={[0, 0.5, 4.2]} fov={50} />
          
          <BatteryModel isExpanded={isExpanded} />
          <EnergySparks />

          <OrbitControls 
            enableZoom={false} 
            minPolarAngle={Math.PI / 3} 
            maxPolarAngle={Math.PI / 1.8}
            enableDamping
            dampingFactor={0.05}
          />
        </Canvas>

        {/* Decorative High-Tech Hologram Rings */}
        <div className="absolute inset-0 border border-red-500/10 rounded-full pointer-events-none scale-90 animate-pulse-slow"></div>
        <div className="absolute inset-0 border border-slate-500/5 rounded-full pointer-events-none scale-75 animate-reverse-spin"></div>
      </div>
    </CanvasErrorBoundary>
  );
};
