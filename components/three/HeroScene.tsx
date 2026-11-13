"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import { Orbit } from "lucide-react";

// Procedural value noise helper for planet bands & storms
function pseudoNoise(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);

  const a = pseudoNoise(ix, iy);
  const b = pseudoNoise(ix + 1, iy);
  const c = pseudoNoise(ix, iy + 1);
  const d = pseudoNoise(ix + 1, iy + 1);

  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

function fbm(x: number, y: number): number {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < 4; i++) {
    value += amp * smoothNoise(x * freq, y * freq);
    freq *= 2.05;
    amp *= 0.5;
  }
  return value;
}

function createProceduralPlanetTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const width = 1024;
  const height = 512;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  // Palette RGBs:
  // Lavender #C3B1E1 -> (195, 177, 225)
  // Peach    #FFB5A7 -> (255, 181, 167)
  // Deep Purple #4B3A8C -> (75, 58, 140)
  const cLavender = [195, 177, 225];
  const cPeach = [255, 181, 167];
  const cPurple = [75, 58, 140];

  for (let y = 0; y < height; y++) {
    const v = y / height;
    const lat = (v - 0.5) * Math.PI;
    for (let x = 0; x < width; x++) {
      const u = x / width;
      // Seamless horizontal wrap using sin/cos of longitude
      const lon = u * Math.PI * 2;
      const nx = Math.cos(lon) * 2.2 + 3.5;
      const ny = Math.sin(lon) * 2.2 + 3.5;
      const turb = fbm(nx + ny * 0.35, v * 6.5);

      const bandWave =
        Math.sin(v * 22 + turb * 3.8) * 0.5 +
        Math.cos(v * 11 - turb * 2.4) * 0.5;
      const t = Math.max(0, Math.min(1, bandWave * 0.5 + 0.5));

      // Blend between Deep Purple -> Lavender -> Peach
      let r: number;
      let g: number;
      let b: number;

      if (t < 0.5) {
        const k = t * 2;
        r = cPurple[0] + (cLavender[0] - cPurple[0]) * k;
        g = cPurple[1] + (cLavender[1] - cPurple[1]) * k;
        b = cPurple[2] + (cLavender[2] - cPurple[2]) * k;
      } else {
        const k = (t - 0.5) * 2;
        r = cLavender[0] + (cPeach[0] - cLavender[0]) * k;
        g = cLavender[1] + (cPeach[1] - cLavender[1]) * k;
        b = cLavender[2] + (cPeach[2] - cLavender[2]) * k;
      }

      // Subtle polar darkening
      const polar = Math.cos(lat * 0.85);
      const shade = 0.72 + 0.28 * polar;

      const idx = (y * width + x) * 4;
      data[idx] = Math.min(255, Math.round(r * shade));
      data[idx + 1] = Math.min(255, Math.round(g * shade));
      data[idx + 2] = Math.min(255, Math.round(b * shade));
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

function createFresnelMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColorInner: { value: new THREE.Color("#C3B1E1") },
      uColorOuter: { value: new THREE.Color("#FFB5A7") },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPositionNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColorInner;
      uniform vec3 uColorOuter;
      varying vec3 vNormal;
      varying vec3 vPositionNormal;
      void main() {
        float fresnel = pow(1.0 - abs(dot(vNormal, vPositionNormal)), 2.6);
        vec3 col = mix(uColorInner, uColorOuter, fresnel);
        gl_FragColor = vec4(col, fresnel * 0.72);
      }
    `,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
  });
}

function createDisplacedRockGeometry(): THREE.IcosahedronGeometry {
  const geo = new THREE.IcosahedronGeometry(0.052, 1);
  const posAttr = geo.attributes.position;
  const vertexMap = new Map<string, number>();

  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vy = posAttr.getY(i);
    const vz = posAttr.getZ(i);
    const key = `${vx.toFixed(4)},${vy.toFixed(4)},${vz.toFixed(4)}`;

    let scale = vertexMap.get(key);
    if (scale === undefined) {
      const h =
        Math.sin(vx * 37.1 + vy * 19.3 + vz * 53.7) * 43758.5453;
      const rand = h - Math.floor(h);
      scale = 0.72 + rand * 0.52;
      vertexMap.set(key, scale);
    }

    posAttr.setXYZ(i, vx * scale, vy * scale * 0.86, vz * scale);
  }

  geo.computeVertexNormals();
  return geo;
}

interface AsteroidItem {
  radius: number;
  angle: number;
  speed: number;
  yOffset: number;
  scale: number;
  rotSpeed: [number, number, number];
  rotation: [number, number, number];
}

function AsteroidBelt({
  count,
  reducedMotion,
}: {
  count: number;
  reducedMotion: boolean;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const rockGeo = useMemo(() => createDisplacedRockGeometry(), []);

  const asteroids = useMemo<AsteroidItem[]>(() => {
    const list: AsteroidItem[] = [];
    for (let i = 0; i < count; i++) {
      const frac = i / count;
      const seed = (i * 97 + 31) % 1000;
      const rNorm = (seed % 100) / 100;
      list.push({
        radius: 2.35 + rNorm * 0.75,
        angle: frac * Math.PI * 2 + rNorm * 0.4,
        speed: 0.09 + (1 - rNorm) * 0.14,
        yOffset: (((i * 43) % 100) / 100 - 0.5) * 0.34,
        scale: 0.65 + (((i * 29) % 100) / 100) * 0.9,
        rotSpeed: [
          0.4 + (i % 5) * 0.25,
          0.3 + (i % 7) * 0.2,
          0.25 + (i % 3) * 0.3,
        ],
        rotation: [i * 0.7, i * 1.1, i * 0.4],
      });
    }
    return list;
  }, [count]);

  useEffect(() => {
    if (!meshRef.current) return;
    asteroids.forEach((a, i) => {
      dummy.position.set(
        Math.cos(a.angle) * a.radius,
        a.yOffset,
        Math.sin(a.angle) * a.radius
      );
      dummy.rotation.set(a.rotation[0], a.rotation[1], a.rotation[2]);
      dummy.scale.setScalar(a.scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [asteroids, dummy]);

  useFrame((_, delta) => {
    if (reducedMotion || !meshRef.current) return;
    for (let i = 0; i < asteroids.length; i++) {
      const a = asteroids[i];
      a.angle += a.speed * delta;
      a.rotation[0] += a.rotSpeed[0] * delta;
      a.rotation[1] += a.rotSpeed[1] * delta;
      a.rotation[2] += a.rotSpeed[2] * delta;

      dummy.position.set(
        Math.cos(a.angle) * a.radius,
        a.yOffset + Math.sin(a.angle * 2) * 0.05,
        Math.sin(a.angle) * a.radius
      );
      dummy.rotation.set(a.rotation[0], a.rotation[1], a.rotation[2]);
      dummy.scale.setScalar(a.scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group rotation={[0.32, 0.12, -0.24]}>
      <instancedMesh
        ref={meshRef}
        args={[rockGeo, undefined, count]}
        frustumCulled={false}
      >
        <meshStandardMaterial
          color="#B9B0D4"
          roughness={0.78}
          metalness={0.18}
          flatShading
        />
      </instancedMesh>
    </group>
  );
}

function ParticleRing({ reducedMotion }: { reducedMotion: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);

  const { positions, colors } = useMemo(() => {
    const count = 1500;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    const cPeach = new THREE.Color("#FFB5A7");
    const cPink = new THREE.Color("#FFC8DD");
    const cLavender = new THREE.Color("#C3B1E1");
    const tmpColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const u = ((i * 613) % 1500) / 1500;
      const v = ((i * 997) % 1500) / 1500;
      const angle = u * Math.PI * 2;
      // Ring band between r = 1.68 and r = 2.24 with a subtle Cassini-like gap
      let r = 1.68 + v * 0.56;
      if (r > 1.93 && r < 1.98) {
        r += 0.05;
      }

      const yJitter = (((i * 37) % 100) / 100 - 0.5) * 0.032;
      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = yJitter;
      pos[i * 3 + 2] = Math.sin(angle) * r;

      if (v < 0.65) {
        tmpColor.lerpColors(cPeach, cPink, v / 0.65);
      } else {
        tmpColor.lerpColors(cPink, cLavender, (v - 0.65) / 0.35);
      }

      col[i * 3] = tmpColor.r;
      col[i * 3 + 1] = tmpColor.g;
      col[i * 3 + 2] = tmpColor.b;
    }

    return { positions: pos, colors: col };
  }, []);

  useFrame((_, delta) => {
    if (!reducedMotion && pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.09;
    }
  });

  return (
    <group rotation={[0.42, 0.15, -0.32]}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.026}
          vertexColors
          transparent
          opacity={0.88}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

function OrbitingMoon({ reducedMotion }: { reducedMotion: boolean }) {
  const moonGroupRef = useRef<THREE.Group>(null);
  const angleRef = useRef<number>(0.8);

  useFrame((_, delta) => {
    if (!reducedMotion) {
      angleRef.current += delta * 0.34;
    }
    if (moonGroupRef.current) {
      const r = 2.75;
      const a = angleRef.current;
      moonGroupRef.current.position.set(
        Math.cos(a) * r,
        Math.sin(a * 1.2) * 0.55,
        Math.sin(a) * r
      );
    }
  });

  return (
    <group ref={moonGroupRef} position={[2.2, 0.35, 1.6]}>
      {/* Moon Core */}
      <mesh>
        <sphereGeometry args={[0.13, 32, 32]} />
        <meshStandardMaterial
          color="#A2D2FF"
          emissive="#A2D2FF"
          emissiveIntensity={0.65}
          roughness={0.3}
        />
      </mesh>
      {/* Glowing Outer Halo */}
      <mesh>
        <sphereGeometry args={[0.21, 24, 24]} />
        <meshBasicMaterial
          color="#A2D2FF"
          transparent
          opacity={0.32}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function MeteorStreaks({ reducedMotion }: { reducedMotion: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const headMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const tailMatRef = useRef<THREE.MeshBasicMaterial>(null);

  const stateRef = useRef({
    active: false,
    cooldown: 2.2,
    elapsed: 0,
    duration: 0.85,
    start: new THREE.Vector3(-5, 3, -4),
    velocity: new THREE.Vector3(9, -5.5, 1.5),
  });

  useFrame((_, delta) => {
    if (reducedMotion || !groupRef.current) {
      if (groupRef.current) groupRef.current.visible = false;
      return;
    }

    const st = stateRef.current;
    if (!st.active) {
      st.cooldown -= delta;
      if (st.cooldown <= 0) {
        st.active = true;
        st.elapsed = 0;
        st.duration = 0.75 + Math.random() * 0.35;
        // Next meteor in 3–6 seconds
        st.cooldown = 3.0 + Math.random() * 3.0;

        const side = Math.random() > 0.5 ? 1 : -1;
        st.start.set(
          -side * (3.8 + Math.random() * 2.2),
          2.2 + Math.random() * 1.8,
          -3.5 - Math.random() * 2.0
        );
        st.velocity.set(
          side * (8.5 + Math.random() * 3.0),
          -(4.2 + Math.random() * 2.2),
          0.8
        );
      }
      groupRef.current.visible = false;
      return;
    }

    st.elapsed += delta;
    const progress = st.elapsed / st.duration;
    if (progress >= 1) {
      st.active = false;
      groupRef.current.visible = false;
      return;
    }

    groupRef.current.visible = true;
    groupRef.current.position
      .copy(st.start)
      .addScaledVector(st.velocity, st.elapsed);

    // Orient along velocity vector
    const dir = st.velocity.clone().normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(1, 0, 0),
      dir
    );
    groupRef.current.quaternion.copy(quat);

    const fade = Math.sin(progress * Math.PI);
    if (headMatRef.current) headMatRef.current.opacity = fade * 0.95;
    if (tailMatRef.current) tailMatRef.current.opacity = fade * 0.48;
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* Glowing meteor head */}
      <mesh>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshBasicMaterial
          ref={headMatRef}
          color="#FFD166"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Fading streak trail behind head */}
      <mesh position={[-0.65, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.002, 0.024, 1.3, 8]} />
        <meshBasicMaterial
          ref={tailMatRef}
          color="#FFB5A7"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function PlanetarySystem({
  asteroidCount,
  reducedMotion,
  mouseOffset,
}: {
  asteroidCount: number;
  reducedMotion: boolean;
  mouseOffset: React.MutableRefObject<{ x: number; y: number }>;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const planetRef = useRef<THREE.Mesh>(null);

  const planetTexture = useMemo(() => createProceduralPlanetTexture(), []);
  const fresnelMaterial = useMemo(() => createFresnelMaterial(), []);

  useFrame((_, delta) => {
    if (!reducedMotion && planetRef.current) {
      planetRef.current.rotation.y += delta * 0.15;
    }

    if (rootRef.current) {
      const targetX = reducedMotion ? 0 : mouseOffset.current.y * 0.16;
      const targetY = reducedMotion ? 0 : mouseOffset.current.x * 0.22;
      rootRef.current.rotation.x = THREE.MathUtils.lerp(
        rootRef.current.rotation.x,
        targetX,
        0.05
      );
      rootRef.current.rotation.y = THREE.MathUtils.lerp(
        rootRef.current.rotation.y,
        targetY,
        0.05
      );
    }
  });

  return (
    <group ref={rootRef}>
      {/* Lighting: Soft ambient + warm point light (#FFD166) + cool rim light (#A2D2FF) */}
      <ambientLight intensity={0.65} color="#EDEBFF" />
      <pointLight position={[5.5, 3.5, 4.5]} intensity={22} color="#FFD166" />
      <pointLight position={[-5.5, -2.5, -4.0]} intensity={16} color="#A2D2FF" />

      {/* Background Stars from @react-three/drei */}
      <Stars
        radius={42}
        depth={35}
        count={1800}
        factor={3.2}
        saturation={0.4}
        fade
        speed={reducedMotion ? 0 : 0.6}
      />

      {/* Tilted Planet + Fresnel Atmosphere */}
      <group rotation={[0.2, 0, -0.24]}>
        <mesh ref={planetRef}>
          <sphereGeometry args={[1.32, 64, 64]} />
          <meshStandardMaterial
            map={planetTexture ?? undefined}
            color={planetTexture ? "#ffffff" : "#C3B1E1"}
            roughness={0.62}
            metalness={0.12}
          />
        </mesh>

        {/* Fresnel-style soft pastel rim glow */}
        <mesh material={fresnelMaterial}>
          <sphereGeometry args={[1.38, 64, 64]} />
        </mesh>

        {/* Outer soft additive halo */}
        <mesh>
          <sphereGeometry args={[1.48, 48, 48]} />
          <meshBasicMaterial
            color="#C3B1E1"
            transparent
            opacity={0.09}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* Tilted Particle Ring (~1500 points, peach/pink gradient) */}
      <ParticleRing reducedMotion={reducedMotion} />

      {/* Instanced Asteroid Belt (~60 desktop / 30 mobile) */}
      <AsteroidBelt count={asteroidCount} reducedMotion={reducedMotion} />

      {/* Orbiting Sky-Blue Moon (#A2D2FF) */}
      <OrbitingMoon reducedMotion={reducedMotion} />

      {/* Background Meteors every 3–6 seconds */}
      <MeteorStreaks reducedMotion={reducedMotion} />

      {/* OrbitControls: Drag to rotate 360°, zoom & pan disabled */}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        enableDamping
        dampingFactor={0.05}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.55}
      />
    </group>
  );
}

export default function HeroScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isInView, setIsInView] = useState<boolean>(true);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [asteroidCount, setAsteroidCount] = useState<number>(60);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onMotionChange = (e: MediaQueryListEvent) =>
      setReducedMotion(e.matches);
    mq.addEventListener("change", onMotionChange);

    const updateViewport = () => {
      setAsteroidCount(window.innerWidth < 768 ? 30 : 60);
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => {
      mq.removeEventListener("change", onMotionChange);
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  // Pause rendering when hero is scrolled off screen
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    mouseOffset.current = { x: nx, y: ny };
  };

  const handlePointerLeave = () => {
    mouseOffset.current = { x: 0, y: 0 };
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative w-full h-[380px] sm:h-[460px] lg:h-[540px] flex flex-col items-center justify-center select-none"
    >
      <div className="w-full h-full rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing">
        <Canvas
          dpr={[1, 1.75]}
          frameloop={isInView ? "always" : "never"}
          camera={{ position: [0, 1.15, 5.1], fov: 44 }}
        >
          <PlanetarySystem
            asteroidCount={asteroidCount}
            reducedMotion={reducedMotion}
            mouseOffset={mouseOffset}
          />
        </Canvas>
      </div>

      {/* Floating glass hint chip under the canvas */}
      <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-medium text-cosmic-muted pointer-events-none">
        <Orbit className="w-3.5 h-3.5 text-pastel-lavender" />
        <span>Drag to rotate 360°</span>
      </div>
    </div>
  );
}

