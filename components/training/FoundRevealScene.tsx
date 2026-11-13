"use client";

import React, { Component, Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, useTexture } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";

export type RevealObjectType =
  | "asteroid"
  | "comet"
  | "brown-dwarf"
  | "red-dwarf"
  | "variable-star";

interface BoundaryProps {
  fallback: React.ReactNode;
  children: React.ReactNode;
}
interface BoundaryState {
  hasError: boolean;
}

class TextureErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  constructor(props: BoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function hash3(x: number, y: number, z: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function simplex3D(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const w = fz * fz * (3 - 2 * fz);

  const n000 = hash3(ix, iy, iz);
  const n100 = hash3(ix + 1, iy, iz);
  const n010 = hash3(ix, iy + 1, iz);
  const n110 = hash3(ix + 1, iy + 1, iz);
  const n001 = hash3(ix, iy, iz + 1);
  const n101 = hash3(ix + 1, iy, iz + 1);
  const n011 = hash3(ix, iy + 1, iz + 1);
  const n111 = hash3(ix + 1, iy + 1, iz + 1);

  const nx00 = n000 * (1 - u) + n100 * u;
  const nx10 = n010 * (1 - u) + n110 * u;
  const nx01 = n001 * (1 - u) + n101 * u;
  const nx11 = n011 * (1 - u) + n111 * u;
  const nxy0 = nx00 * (1 - v) + nx10 * v;
  const nxy1 = nx01 * (1 - v) + nx11 * v;
  return (nxy0 * (1 - w) + nxy1 * w) * 2 - 1;
}

function createFresnelGlowMaterial(
  hexColor: string,
  intensity = 0.9,
  power = 2.4
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(hexColor) },
      uIntensity: { value: intensity },
      uPower: { value: power },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uPower;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        float rim = 1.0 - max(0.0, dot(vNormal, vViewDir));
        float glow = pow(rim, uPower) * uIntensity;
        gl_FragColor = vec4(uColor * 1.5, glow);
      }
    `,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
  });
}

// 1. ASTEROID: Irregular rock with craters via darker vertex-colored patches
function AsteroidModel({ reducedMotion }: { reducedMotion: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  const rockGeo = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1.18, 4);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const dir = new THREE.Vector3();

    const craters = [
      new THREE.Vector3(0.7, 0.4, 0.5).normalize(),
      new THREE.Vector3(-0.6, -0.3, 0.7).normalize(),
      new THREE.Vector3(0.2, -0.8, -0.5).normalize(),
      new THREE.Vector3(-0.5, 0.6, -0.6).normalize(),
      new THREE.Vector3(0.1, 0.3, -0.9).normalize(),
    ];

    const baseCol = new THREE.Color("#8D7B6D");
    const craterCol = new THREE.Color("#3D332C");
    const ridgeCol = new THREE.Color("#B4A394");
    const tmp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      dir.set(vx, vy, vz).normalize();

      const n1 = simplex3D(dir.x * 2.1 + 1.3, dir.y * 2.1 + 2.7, dir.z * 2.1 + 4.1);
      const n2 = simplex3D(dir.x * 4.8 + 5.2, dir.y * 4.8 + 1.9, dir.z * 4.8 + 3.4);
      let displacement = 1 + n1 * 0.24 + n2 * 0.08;

      let craterDepth = 0;
      for (const c of craters) {
        const dist = dir.distanceTo(c);
        if (dist < 0.44) {
          const norm = dist / 0.44;
          const bowl = (1 - norm * norm) * 0.16;
          displacement -= bowl;
          craterDepth = Math.max(craterDepth, 1 - norm);
        }
      }

      pos.setXYZ(
        i,
        vx * displacement * 1.12,
        vy * displacement * 0.86,
        vz * displacement * 0.96
      );

      if (craterDepth > 0.05) {
        tmp.lerpColors(baseCol, craterCol, Math.min(1, craterDepth * 1.25));
      } else {
        tmp.lerpColors(baseCol, ridgeCol, Math.max(0, n1 * 0.7));
      }

      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }

    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  useFrame((_, delta) => {
    if (!reducedMotion && meshRef.current) {
      meshRef.current.rotation.y += delta * 0.35;
      meshRef.current.rotation.x += delta * 0.12;
    }
  });

  return (
    <mesh ref={meshRef} geometry={rockGeo}>
      <meshStandardMaterial
        vertexColors
        roughness={0.94}
        metalness={0.06}
        flatShading
      />
    </mesh>
  );
}

// 2. COMET: Icy rock nucleus + glowing particle coma and long tail
function CometModel({ reducedMotion }: { reducedMotion: boolean }) {
  const nucleusRef = useRef<THREE.Mesh>(null);
  const tailGeomRef = useRef<THREE.BufferGeometry>(null);

  const nucleusGeo = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(0.68, 3);
    const pos = geo.attributes.position;
    const dir = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      dir.set(vx, vy, vz).normalize();
      const n = simplex3D(dir.x * 2.5 + 3.1, dir.y * 2.5 + 1.7, dir.z * 2.5 + 6.2);
      const s = 1 + n * 0.26;
      pos.setXYZ(i, vx * s * 1.15, vy * s * 0.85, vz * s);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  const comaMat = useMemo(
    () => createFresnelGlowMaterial("#80D8FF", 1.1, 2.1),
    []
  );

  const count = 420;
  const { positions, colors, seeds } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const seedArr: { t: number; rx: number; ry: number; speed: number }[] = [];

    const cHead = new THREE.Color("#FFFFFF");
    const cMid = new THREE.Color("#64B5F6");
    const cEnd = new THREE.Color("#0D1B2A");
    const tmp = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const t = i / count;
      const rx = (hash3(i, 1.1, 4.2) - 0.5) * 1.05;
      const ry = (hash3(i, 5.3, 2.8) - 0.5) * 1.05;
      const speed = 0.65 + hash3(i, 8.7, 3.3) * 0.7;
      seedArr.push({ t, rx, ry, speed });

      const fade = Math.pow(1 - t, 1.5);
      if (t < 0.35) {
        tmp.lerpColors(cHead, cMid, t / 0.35);
      } else {
        tmp.lerpColors(cMid, cEnd, (t - 0.35) / 0.65);
      }
      col[i * 3] = tmp.r * fade * 1.5;
      col[i * 3 + 1] = tmp.g * fade * 1.5;
      col[i * 3 + 2] = tmp.b * fade * 1.5;

      const dist = t * 2.9;
      const spread = Math.pow(t, 0.85);
      pos[i * 3] = dist;
      pos[i * 3 + 1] = rx * spread;
      pos[i * 3 + 2] = ry * spread;
    }

    return { positions: pos, colors: col, seeds: seedArr };
  }, []);

  useFrame(({ clock }, delta) => {
    if (!reducedMotion && nucleusRef.current) {
      nucleusRef.current.rotation.y += delta * 0.45;
      nucleusRef.current.rotation.z += delta * 0.2;
    }
    if (!reducedMotion && tailGeomRef.current) {
      const elapsed = clock.getElapsedTime();
      for (let i = 0; i < count; i++) {
        const s = seeds[i];
        const flowT = (s.t + elapsed * 0.38 * s.speed) % 1;
        const dist = flowT * 2.9;
        const spread = Math.pow(flowT, 0.85);
        positions[i * 3] = dist;
        positions[i * 3 + 1] = s.rx * spread;
        positions[i * 3 + 2] = s.ry * spread;
      }
      const attr = tailGeomRef.current.getAttribute("position");
      if (attr) attr.needsUpdate = true;
    }
  });

  return (
    <group position={[-0.55, -0.15, 0]} rotation={[0, 0, 0.22]}>
      <mesh ref={nucleusRef} geometry={nucleusGeo}>
        <meshStandardMaterial
          color="#E1F5FE"
          emissive="#4FC3F7"
          emissiveIntensity={0.45}
          roughness={0.55}
          flatShading
        />
      </mesh>

      {/* Glowing Particle Coma */}
      <mesh material={comaMat}>
        <sphereGeometry args={[0.98, 32, 32]} />
      </mesh>

      {/* Long Flowing Tail */}
      <points frustumCulled={false}>
        <bufferGeometry ref={tailGeomRef}>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.065}
          vertexColors
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

// 3. BROWN DWARF: Sphere with procedural reddish-brown cloud bands & dim magenta glow
function createBrownDwarfTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const w = 512;
  const h = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const img = ctx.createImageData(w, h);
  const d = img.data;

  for (let y = 0; y < h; y++) {
    const v = y / h;
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const lon = u * Math.PI * 2;
      const n = simplex3D(Math.cos(lon) * 2.2, v * 7.5, Math.sin(lon) * 2.2);
      const bands = Math.sin(v * 26 + n * 2.8) * 0.5 + 0.5;
      const hotBand = Math.pow(Math.max(0, Math.sin(v * 14 - n * 2.1)), 3);

      const r = 72 + bands * 85 + hotBand * 75;
      const g = 24 + bands * 32 + hotBand * 35;
      const b = 38 + bands * 42 + hotBand * 48;

      const idx = (y * w + x) * 4;
      d[idx] = Math.min(255, Math.round(r));
      d[idx + 1] = Math.min(255, Math.round(g));
      d[idx + 2] = Math.min(255, Math.round(b));
      d[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function BrownDwarfModel({ reducedMotion }: { reducedMotion: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => createBrownDwarfTexture(), []);
  const glowMat = useMemo(
    () => createFresnelGlowMaterial("#D81B60", 0.78, 2.5),
    []
  );

  useFrame((_, delta) => {
    if (!reducedMotion && meshRef.current) {
      meshRef.current.rotation.y += delta * 0.28;
    }
  });

  return (
    <group rotation={[0.15, 0, -0.2]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.25, 64, 64]} />
        <meshStandardMaterial
          map={tex ?? undefined}
          color={tex ? "#ffffff" : "#8D3B47"}
          emissive="#5D192B"
          emissiveIntensity={0.45}
          roughness={0.65}
        />
      </mesh>
      <mesh material={glowMat}>
        <sphereGeometry args={[1.38, 64, 64]} />
      </mesh>
    </group>
  );
}

// 4. RED DWARF: sun.jpg texture tinted deep red-orange with corona glow
function RedDwarfTexturedMaterial() {
  const tex = useTexture("/textures/sun.jpg");
  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
  }, [tex]);
  return <meshBasicMaterial map={tex} color="#FF5722" />;
}

function RedDwarfModel({ reducedMotion }: { reducedMotion: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const coronaMat = useMemo(
    () => createFresnelGlowMaterial("#FF3D00", 1.25, 2.0),
    []
  );

  useFrame((_, delta) => {
    if (!reducedMotion && meshRef.current) {
      meshRef.current.rotation.y += delta * 0.24;
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.22, 64, 64]} />
        <TextureErrorBoundary
          fallback={<meshBasicMaterial color="#FF5722" />}
        >
          <Suspense fallback={<meshBasicMaterial color="#FF5722" />}>
            <RedDwarfTexturedMaterial />
          </Suspense>
        </TextureErrorBoundary>
      </mesh>
      <mesh material={coronaMat}>
        <sphereGeometry args={[1.44, 64, 64]} />
      </mesh>
    </group>
  );
}

// 5. VARIABLE STAR: Glowing yellow-orange star whose size and brightness slowly pulse
function VariableStarModel({ reducedMotion }: { reducedMotion: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const coreMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const haloMat = useMemo(
    () => createFresnelGlowMaterial("#FFB300", 1.35, 2.0),
    []
  );

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    if (!reducedMotion) {
      const t = clock.getElapsedTime();
      const pulse = 1 + Math.sin(t * 2.8) * 0.14;
      groupRef.current.scale.setScalar(pulse);
      groupRef.current.rotation.y += delta * 0.22;
      if (coreMatRef.current) {
        coreMatRef.current.emissiveIntensity = 1.15 + Math.sin(t * 2.8) * 0.55;
      }
    }
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[1.15, 64, 64]} />
        <meshStandardMaterial
          ref={coreMatRef}
          color="#FFE082"
          emissive="#FF8F00"
          emissiveIntensity={1.25}
          roughness={0.3}
        />
      </mesh>
      <mesh material={haloMat}>
        <sphereGeometry args={[1.42, 64, 64]} />
      </mesh>
    </group>
  );
}

export default function FoundRevealScene({
  objectType,
  reducedMotion,
}: {
  objectType: RevealObjectType;
  reducedMotion: boolean;
}) {
  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0.25, 3.6], fov: 44 }}>
      <ambientLight intensity={0.65} color="#EDEBFF" />
      <directionalLight position={[4, 3, 4]} intensity={2.2} color="#FFF3E0" />
      <pointLight position={[-4, -2, -3]} intensity={8} color="#A2D2FF" />

      <Stars
        radius={80}
        depth={30}
        count={900}
        factor={2.5}
        fade
        speed={reducedMotion ? 0 : 0.4}
      />

      {objectType === "asteroid" && (
        <AsteroidModel reducedMotion={reducedMotion} />
      )}
      {objectType === "comet" && <CometModel reducedMotion={reducedMotion} />}
      {objectType === "brown-dwarf" && (
        <BrownDwarfModel reducedMotion={reducedMotion} />
      )}
      {objectType === "red-dwarf" && (
        <RedDwarfModel reducedMotion={reducedMotion} />
      )}
      {objectType === "variable-star" && (
        <VariableStarModel reducedMotion={reducedMotion} />
      )}

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        autoRotate={!reducedMotion}
        autoRotateSpeed={1.2}
      />

      <EffectComposer>
        <Bloom luminanceThreshold={0.55} intensity={1.15} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}

