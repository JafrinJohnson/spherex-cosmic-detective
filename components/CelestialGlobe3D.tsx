"use client";

import React, { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, Html } from "@react-three/drei";
import * as THREE from "three";
import type { Target } from "@/types";

interface CelestialGlobeProps {
  targets: Target[];
  selectedId?: string;
  onSelectTarget?: (target: Target) => void;
}

function raDecToCartesian(raDeg: number, decDeg: number, radius: number): [number, number, number] {
  const ra = (raDeg * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;
  const x = radius * Math.cos(dec) * Math.cos(ra);
  const y = radius * Math.sin(dec);
  const z = radius * Math.cos(dec) * Math.sin(ra);
  return [x, y, z];
}

function CelestialScene({
  targets,
  selectedId,
  onSelectTarget,
}: CelestialGlobeProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.08;
    }
  });

  const starPositions = useMemo(() => {
    const count = 420;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = ((i * 73) % 1000) / 1000;
      const v = ((i * 197) % 1000) / 1000;
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 2.9 + ((i % 7) * 0.12);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);

  return (
    <group ref={groupRef}>
      {/* Ambient & Point Lighting */}
      <ambientLight intensity={0.75} />
      <pointLight position={[6, 6, 6]} intensity={1.4} color="#FFB5A7" />
      <pointLight position={[-6, -4, -5]} intensity={1.0} color="#A2D2FF" />

      {/* Background Star Cloud */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[starPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.028}
          color="#EDEBFF"
          transparent
          opacity={0.65}
          sizeAttenuation
        />
      </points>

      {/* Translucent Celestial Sphere */}
      <Sphere args={[1.85, 40, 40]}>
        <meshStandardMaterial
          color="#1A1040"
          transparent
          opacity={0.42}
          roughness={0.35}
          metalness={0.2}
        />
      </Sphere>

      {/* Equatorial Coordinate Wireframe */}
      <Sphere args={[1.86, 24, 16]}>
        <meshBasicMaterial
          color="#C3B1E1"
          wireframe
          transparent
          opacity={0.14}
        />
      </Sphere>

      {/* Ecliptic / Galactic Survey Ring */}
      <mesh rotation={[Math.PI / 2.6, 0.3, 0]}>
        <torusGeometry args={[2.12, 0.008, 16, 100]} />
        <meshBasicMaterial color="#FF8A65" transparent opacity={0.55} />
      </mesh>

      {/* Target Markers on the Celestial Sphere */}
      {targets.map((target) => {
        const pos = raDecToCartesian(target.ra, target.dec, 1.89);
        const isSelected = selectedId === target.id;
        const primaryColor = target.colors?.[0] || "#FFB5A7";

        return (
          <group key={target.id} position={pos}>
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                onSelectTarget?.(target);
              }}
            >
              <sphereGeometry args={[isSelected ? 0.09 : 0.065, 20, 20]} />
              <meshBasicMaterial color={primaryColor} />
            </mesh>

            <Html distanceFactor={8} position={[0.1, 0.08, 0]}>
              <button
                type="button"
                onClick={() => onSelectTarget?.(target)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-all border backdrop-blur-md ${
                  isSelected
                    ? "bg-[#FF8A65]/30 border-[#FFD166] text-[#EDEBFF] shadow-sm scale-105"
                    : "bg-[#0B0B1E]/75 border-white/20 text-[#CFCBEA] hover:text-white"
                }`}
              >
                {target.name}
              </button>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

export default function CelestialGlobe3D(props: CelestialGlobeProps) {
  return (
    <div className="w-full h-[360px] sm:h-[420px] relative rounded-2xl overflow-hidden bg-[#0B0B1E]/50 border border-white/10">
      <Canvas camera={{ position: [0, 0.6, 4.4], fov: 45 }}>
        <CelestialScene {...props} />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          rotateSpeed={0.55}
        />
      </Canvas>
      <div className="pointer-events-none absolute bottom-3 left-4 right-4 flex items-center justify-between text-[11px] text-cosmic-muted font-mono">
        <span>3D CELESTIAL J2000 PROJECTION</span>
        <span>DRAG TO ROTATE SPHERE</span>
      </div>
    </div>
  );
}

