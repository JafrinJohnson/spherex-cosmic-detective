"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Html, Line } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Orbit, Compass } from "lucide-react";
import type { Target } from "@/types";
import { raDecToXYZ, formatRA, formatDec } from "@/lib/coords";

const SPHERE_RADIUS = 1.78;

export interface SkyGlobeProps {
  targets: Target[];
  selectedTargetId?: string | null;
  crosshairCoords?: { ra: number; dec: number } | null;
  focusRequest?: { ra: number; dec: number; seq: number } | null;
  onSelectTarget: (target: Target) => void;
}

function buildMeridianPoints(raDeg: number, radius: number, segments = 72) {
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const decDeg = -90 + (i / segments) * 180;
    pts.push(raDecToXYZ(raDeg, decDeg, radius));
  }
  return pts;
}

function buildParallelPoints(decDeg: number, radius: number, segments = 96) {
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const raDeg = (i / segments) * 360;
    pts.push(raDecToXYZ(raDeg, decDeg, radius));
  }
  return pts;
}

function CelestialWireframe() {
  // RA lines every 2h (30°): 0h, 2h, 4h, ..., 22h
  const meridians = useMemo(() => {
    const list: { ra: number; points: [number, number, number][] }[] = [];
    for (let h = 0; h < 24; h += 2) {
      const raDeg = h * 15;
      list.push({
        ra: raDeg,
        points: buildMeridianPoints(raDeg, SPHERE_RADIUS),
      });
    }
    return list;
  }, []);

  // Dec lines every 30°: -60°, -30°, +30°, +60° (0° equator rendered brighter separately)
  const parallels = useMemo(() => {
    const decs = [-60, -30, 30, 60];
    return decs.map((dec) => ({
      dec,
      points: buildParallelPoints(dec, SPHERE_RADIUS),
    }));
  }, []);

  const equatorPoints = useMemo(
    () => buildParallelPoints(0, SPHERE_RADIUS + 0.003, 128),
    []
  );

  return (
    <group>
      {/* Translucent Glassy Inner Sphere */}
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS - 0.015, 48, 48]} />
        <meshPhysicalMaterial
          color="#140E36"
          transparent
          opacity={0.38}
          roughness={0.25}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Soft Outer Atmosphere Rim */}
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS + 0.06, 48, 48]} />
        <meshBasicMaterial
          color="#C3B1E1"
          transparent
          opacity={0.07}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* RA Meridians (every 2h = 30°) in soft lavender */}
      {meridians.map((m) => (
        <Line
          key={`ra-${m.ra}`}
          points={m.points}
          color="#C3B1E1"
          lineWidth={1}
          transparent
          opacity={m.ra === 0 ? 0.55 : 0.26}
        />
      ))}

      {/* Dec Parallels (every 30°) in soft lavender */}
      {parallels.map((p) => (
        <Line
          key={`dec-${p.dec}`}
          points={p.points}
          color="#C3B1E1"
          lineWidth={1}
          transparent
          opacity={0.28}
        />
      ))}

      {/* Brighter Celestial Equator Line (Dec = 0°) */}
      <Line
        points={equatorPoints}
        color="#EDEBFF"
        lineWidth={2.2}
        transparent
        opacity={0.78}
      />
      <Line
        points={equatorPoints}
        color="#C3B1E1"
        lineWidth={4.5}
        transparent
        opacity={0.25}
      />
    </group>
  );
}

function TargetMarker({
  target,
  isSelected,
  reducedMotion,
  onSelect,
}: {
  target: Target;
  isSelected: boolean;
  reducedMotion: boolean;
  onSelect: (t: Target) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const pulseRef = useRef<THREE.Mesh>(null);
  const pos = useMemo(
    () => raDecToXYZ(target.ra, target.dec, SPHERE_RADIUS + 0.025),
    [target.ra, target.dec]
  );
  const primaryColor = target.colors?.[0] || "#FFB5A7";

  useFrame(({ clock }) => {
    if (!pulseRef.current) return;
    if (reducedMotion) {
      pulseRef.current.scale.setScalar(isSelected ? 1.45 : 1.15);
      return;
    }
    const t = clock.getElapsedTime();
    const base = isSelected ? 1.45 : hovered ? 1.3 : 1.0;
    const wave = 1 + Math.sin(t * 3.4 + target.ra) * 0.25;
    pulseRef.current.scale.setScalar(base * wave);
  });

  return (
    <group position={pos}>
      {/* Glowing Core Sphere */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect(target);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[isSelected ? 0.075 : 0.058, 24, 24]} />
        <meshBasicMaterial color={primaryColor} />
      </mesh>

      {/* Pulsing Outer Halo */}
      <mesh ref={pulseRef}>
        <sphereGeometry args={[0.095, 24, 24]} />
        <meshBasicMaterial
          color={primaryColor}
          transparent
          opacity={isSelected ? 0.48 : 0.3}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Hover or Selected Label via drei <Html> */}
      {(hovered || isSelected) && (
        <Html
          distanceFactor={6}
          position={[0, 0.14, 0]}
          center
          zIndexRange={[20, 0]}
        >
          <div className="pointer-events-none px-3 py-1.5 rounded-2xl bg-[#0B0B1E]/90 backdrop-blur-xl border border-white/25 shadow-glass-glow text-left whitespace-nowrap">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: primaryColor }}
              />
              <span className="font-heading text-xs font-bold text-cosmic-text">
                {target.name}
              </span>
            </div>
            <div className="text-[10px] text-pastel-peach font-medium">
              {target.nickname}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

function CrosshairMarker({
  ra,
  dec,
  reducedMotion,
}: {
  ra: number;
  dec: number;
  reducedMotion: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const pos = useMemo(
    () => raDecToXYZ(ra, dec, SPHERE_RADIUS + 0.035),
    [ra, dec]
  );

  // Orient the crosshair tangent to the sphere surface at (ra, dec)
  const quaternion = useMemo(() => {
    const normal = new THREE.Vector3(...pos).normalize();
    return new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      normal
    );
  }, [pos]);

  useFrame((_, delta) => {
    if (!reducedMotion && ringRef.current) {
      ringRef.current.rotation.z += delta * 0.9;
    }
  });

  return (
    <group ref={groupRef} position={pos} quaternion={quaternion}>
      {/* Outer Reticle Ring */}
      <mesh ref={ringRef}>
        <ringGeometry args={[0.105, 0.125, 32]} />
        <meshBasicMaterial
          color="#FFD166"
          side={THREE.DoubleSide}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Inner Target Dot */}
      <mesh>
        <circleGeometry args={[0.024, 16]} />
        <meshBasicMaterial color="#FF8A65" side={THREE.DoubleSide} />
      </mesh>

      {/* Crosshair Ticks */}
      <Line
        points={[
          [-0.16, 0, 0],
          [-0.06, 0, 0],
        ]}
        color="#FFD166"
        lineWidth={2}
      />
      <Line
        points={[
          [0.06, 0, 0],
          [0.16, 0, 0],
        ]}
        color="#FFD166"
        lineWidth={2}
      />
      <Line
        points={[
          [0, -0.16, 0],
          [0, -0.06, 0],
        ]}
        color="#FFD166"
        lineWidth={2}
      />
      <Line
        points={[
          [0, 0.06, 0],
          [0, 0.16, 0],
        ]}
        color="#FFD166"
        lineWidth={2}
      />
    </group>
  );
}

function GlobeCameraRig({
  focusRequest,
  reducedMotion,
  isInteracting,
  controlsRef,
}: {
  focusRequest?: { ra: number; dec: number; seq: number } | null;
  reducedMotion: boolean;
  isInteracting: boolean;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();
  const targetDirRef = useRef<THREE.Vector3 | null>(null);

  useEffect(() => {
    if (!focusRequest) return;
    const [x, y, z] = raDecToXYZ(focusRequest.ra, focusRequest.dec, 1);
    const dir = new THREE.Vector3(x, y, z).normalize();

    if (reducedMotion) {
      const dist = camera.position.length() || 3.8;
      camera.position.copy(dir.multiplyScalar(dist));
      controlsRef.current?.update();
      targetDirRef.current = null;
    } else {
      targetDirRef.current = dir;
    }
  }, [focusRequest, reducedMotion, camera, controlsRef]);

  useFrame((_, delta) => {
    if (isInteracting) {
      targetDirRef.current = null;
      return;
    }
    const targetDir = targetDirRef.current;
    if (!targetDir) return;

    const currentDist = camera.position.length() || 3.8;
    const currentDir = camera.position.clone().normalize();
    const step = 1 - Math.exp(-5.0 * delta);
    currentDir.lerp(targetDir, step).normalize();

    camera.position.copy(currentDir.multiplyScalar(currentDist));
    controlsRef.current?.update();

    if (currentDir.angleTo(targetDir) < 0.015) {
      targetDirRef.current = null;
    }
  });

  return null;
}

export default function SkyGlobe({
  targets,
  selectedTargetId,
  crosshairCoords,
  focusRequest,
  onSelectTarget,
}: SkyGlobeProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <div className="glass p-4 sm:p-6 flex flex-col gap-4">
      {/* Top Telemetry Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-pastel-lavender" />
          <span className="font-heading text-sm font-semibold text-cosmic-text">
            3D Celestial Sphere (J2000)
          </span>
        </div>

        {crosshairCoords ? (
          <span className="text-xs font-mono text-pastel-sky bg-white/[0.06] px-3 py-1 rounded-full border border-white/10">
            {formatRA(crosshairCoords.ra)} · {formatDec(crosshairCoords.dec)}
          </span>
        ) : (
          <span className="text-xs font-mono text-cosmic-muted">
            RA 2h Grid · Dec 30° Grid
          </span>
        )}
      </div>

      {/* 3D Canvas Viewport */}
      <div className="relative w-full h-[360px] sm:h-[440px] lg:h-[500px] rounded-2xl overflow-hidden bg-[#0B0B1E]/65 border border-white/10 cursor-grab active:cursor-grabbing">
        <Canvas
          dpr={[1, 1.75]}
          camera={{ position: [0, 0.55, 3.85], fov: 44 }}
        >
          <ambientLight intensity={0.8} />
          <pointLight position={[6, 5, 6]} intensity={10} color="#FFD166" />
          <pointLight position={[-6, -4, -5]} intensity={8} color="#A2D2FF" />

          {/* Faint Background Stars */}
          <Stars
            radius={48}
            depth={30}
            count={1600}
            factor={2.8}
            saturation={0.35}
            fade
            speed={reducedMotion ? 0 : 0.4}
          />

          {/* Celestial Sphere Wireframe Grid */}
          <CelestialWireframe />

          {/* 5 Target Markers */}
          {targets.map((target) => (
            <TargetMarker
              key={target.id}
              target={target}
              isSelected={selectedTargetId === target.id}
              reducedMotion={reducedMotion}
              onSelect={onSelectTarget}
            />
          ))}

          {/* Active Crosshair Marker for Typed RA/Dec */}
          {crosshairCoords && (
            <CrosshairMarker
              ra={crosshairCoords.ra}
              dec={crosshairCoords.dec}
              reducedMotion={reducedMotion}
            />
          )}

          {/* Smooth Camera Rotation Rig */}
          <GlobeCameraRig
            focusRequest={focusRequest}
            reducedMotion={reducedMotion}
            isInteracting={isInteracting}
            controlsRef={controlsRef}
          />

          {/* OrbitControls: 360° rotate, no pan, zoom 2.2..5, slow autoRotate */}
          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            enableZoom={true}
            minDistance={2.2}
            maxDistance={5}
            enableDamping
            dampingFactor={0.06}
            autoRotate={!reducedMotion && !isInteracting}
            autoRotateSpeed={0.38}
            onStart={() => setIsInteracting(true)}
            onEnd={() => setIsInteracting(false)}
          />
        </Canvas>

        {/* Bottom Legend Overlay */}
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-[#0B0B1E]/75 backdrop-blur-md border border-white/10 text-[11px] text-cosmic-muted">
          <span className="inline-flex items-center gap-1.5">
            <Orbit className="w-3.5 h-3.5 text-pastel-lavender" />
            <span>Drag to rotate 360° · Scroll to zoom</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#FFD166]" />
            <span>Crosshair = Active Search</span>
          </span>
        </div>
      </div>
    </div>
  );
}

