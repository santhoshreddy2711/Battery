import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const PulsingNode: React.FC<{ position: [number, number, number]; color: string; label: string }> = ({ position, color }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Pulse scale
      const scale = 1 + Math.sin(state.clock.getElapsedTime() * 4) * 0.15;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group position={position}>
      {/* Outer Glow Ring */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} />
      </mesh>
      
      {/* Inner Solid Node */}
      <mesh>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
};

const ConnectingArc: React.FC<{ start: [number, number, number]; end: [number, number, number]; color: string }> = ({ start, end, color }) => {
  const lineRef = useRef<THREE.Line>(null);

  // Generate a curve that arcs outwards slightly
  const startVec = new THREE.Vector3(...start);
  const endVec = new THREE.Vector3(...end);
  const midVec = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
  // Add height to curve representing geographical altitude
  midVec.normalize().multiplyScalar(1.9);

  const curve = new THREE.QuadraticBezierCurve3(startVec, midVec, endVec);
  const points = curve.getPoints(30);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  useFrame((state) => {
    if (lineRef.current) {
      // Simulate signal flow animation via opacity/color shifting
      const material = lineRef.current.material as THREE.LineBasicMaterial;
      material.opacity = 0.4 + Math.sin(state.clock.getElapsedTime() * 5) * 0.2;
    }
  });

  return (
    <line ref={lineRef} geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={0.6} linewidth={1.5} />
    </line>
  );
};

const GlobeModel: React.FC = () => {
  const globeRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (globeRef.current) {
      // Slow rotation
      globeRef.current.rotation.y = state.clock.getElapsedTime() * 0.15;
      globeRef.current.rotation.x = 0.1; // slight tilt
    }
  });

  // Coordinates projected on a sphere of radius 1.6
  // HQ New Delhi
  const hqPos: [number, number, number] = [0, 0.8, 1.4];
  // Noida Outlet
  const noidaPos: [number, number, number] = [0.65, 0.6, 1.3];
  // Gurugram Outlet
  const gurugramPos: [number, number, number] = [-0.65, 0.6, 1.3];

  return (
    <group ref={globeRef}>
      {/* 1. Main Wireframe Earth Sphere */}
      <mesh>
        <sphereGeometry args={[1.6, 24, 24]} />
        <meshStandardMaterial 
          color="#ef4444" 
          wireframe 
          transparent 
          opacity={0.12} 
          emissive="#ef4444"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* 2. Inner Solid core sphere */}
      <mesh>
        <sphereGeometry args={[1.58, 24, 24]} />
        <meshStandardMaterial 
          color="#0f172a" 
          transparent 
          opacity={0.35}
          roughness={0.9}
        />
      </mesh>

      {/* 3. Branch Node points */}
      <PulsingNode position={hqPos} color="#dc2626" label="Delhi HQ" />
      <PulsingNode position={noidaPos} color="#ef4444" label="Noida Outlet" />
      <PulsingNode position={gurugramPos} color="#ef4444" label="Gurugram Outlet" />

      {/* 4. Active branch transfers curve arcs */}
      <ConnectingArc start={hqPos} end={noidaPos} color="#ef4444" />
      <ConnectingArc start={hqPos} end={gurugramPos} color="#ef4444" />
    </group>
  );
};

// Particles representing active global sales transactions
const SalesDataStream: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);
  
  const particleCount = 120;
  const positions = new Float32Array(particleCount * 3);
  const angles = new Float32Array(particleCount);
  const radii = new Float32Array(particleCount);
  const speeds = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    angles[i] = Math.random() * Math.PI * 2;
    radii[i] = 1.62 + Math.random() * 0.2; // just off the globe surface
    speeds[i] = 0.2 + Math.random() * 0.6;
    
    positions[i * 3] = Math.cos(angles[i]) * radii[i];
    positions[i * 3 + 1] = (Math.random() - 0.5) * 2;
    positions[i * 3 + 2] = Math.sin(angles[i]) * radii[i];
  }

  useFrame((state) => {
    if (pointsRef.current) {
      const positionAttribute = pointsRef.current.geometry.attributes.position;
      const count = positionAttribute.count;

      for (let i = 0; i < count; i++) {
        // Increment angle
        angles[i] += speeds[i] * 0.005;
        
        let x = Math.cos(angles[i]) * radii[i];
        let z = Math.sin(angles[i]) * radii[i];
        let y = positionAttribute.getY(i);

        positionAttribute.setXYZ(i, x, y, z);
      }
      positionAttribute.needsUpdate = true;
      pointsRef.current.rotation.y = -state.clock.getElapsedTime() * 0.04;
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
        color="#dc2626"
        size={0.045}
        transparent
        opacity={0.7}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

export const GlobeCanvas: React.FC = () => {
  return (
    <div className="w-full h-full min-h-[300px] relative cursor-grab active:cursor-grabbing select-none bg-slate-900/5 dark:bg-slate-900/10 rounded-3xl border border-slate-200/40 dark:border-slate-800/40 shadow-inner">
      <Canvas shadows>
        <ambientLight intensity={0.7} />
        <pointLight position={[5, 5, 5]} intensity={1.5} color="#dc2626" />
        <pointLight position={[-5, -5, -5]} intensity={0.5} color="#cbd5e1" />
        
        <GlobeModel />
        <SalesDataStream />

        <OrbitControls 
          enableZoom={false} 
          autoRotate={false}
          enableDamping
          dampingFactor={0.05}
        />
      </Canvas>
    </div>
  );
};
