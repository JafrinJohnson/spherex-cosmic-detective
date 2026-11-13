"use client";

import React, {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Html, useTexture } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Orbit } from "lucide-react";

// ============================================================================
// 1. ErrorBoundary for Texture Loading Safety
// ============================================================================
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
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function SafeTexturedObject({
  fallback,
  children,
}: {
  fallback: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <TextureErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>{children}</Suspense>
    </TextureErrorBoundary>
  );
}

// ============================================================================
// 2. 3D Simplex-Style Noise for Asteroid & Comet Nucleus Vertex Displacement
// ============================================================================
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

function fbm3D(x: number, y: number, z: number): number {
  let total = 0;
  let amp = 0.5;
  let freq = 1.6;
  for (let i = 0; i < 3; i++) {
    total += amp * simplex3D(x * freq, y * freq, z * freq);
    freq *= 2.1;
    amp *= 0.5;
  }
  return total;
}

function createSimplexRockGeometry(
  baseRadius: number,
  detail: number,
  seedOffset: number
): THREE.IcosahedronGeometry {
  const geo = new THREE.IcosahedronGeometry(baseRadius, detail);
  const posAttr = geo.attributes.position;
  const dir = new THREE.Vector3();

  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vy = posAttr.getY(i);
    const vz = posAttr.getZ(i);
    dir.set(vx, vy, vz).normalize();

    const n = fbm3D(
      dir.x * 2.2 + seedOffset,
      dir.y * 2.2 + seedOffset,
      dir.z * 2.2 + seedOffset
    );
    const scale = 1 + n * 0.34;
    posAttr.setXYZ(i, vx * scale, vy * scale * 0.88, vz * scale);
  }

  geo.computeVertexNormals();
  return geo;
}

// ============================================================================
// 3. Custom Shaders (Fresnel Atmosphere & Animated Solar Corona)
// ============================================================================
function createAtmosphereShader(
  hexColor: string,
  intensity = 0.85,
  power = 2.8
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
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
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
        gl_FragColor = vec4(uColor * 1.4, glow);
      }
    `,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
  });
}

function createSolarCoronaShader(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColorInner: { value: new THREE.Color("#FFE082") },
      uColorOuter: { value: new THREE.Color("#FF7043") },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec3 vLocalPos;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPosition.xyz);
        vLocalPos = position;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColorInner;
      uniform vec3 uColorOuter;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec3 vLocalPos;

      float waveNoise(vec3 p, float t) {
        return sin(p.x * 7.0 + t * 2.1) * cos(p.y * 7.0 - t * 1.7) * sin(p.z * 7.0 + t * 1.3);
      }

      void main() {
        float rim = 1.0 - abs(dot(vNormal, vViewDir));
        float flicker = 0.88 + 0.16 * waveNoise(normalize(vLocalPos), uTime);
        float corona = pow(clamp(rim, 0.0, 1.0), 2.1) * flicker;
        vec3 col = mix(uColorOuter, uColorInner, corona);
        gl_FragColor = vec4(col * 1.65, corona * 0.85);
      }
    `,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
  });
}

// ============================================================================
// 4. Planet Definitions & Hover Label
// ============================================================================
export type BodyId = "sun" | "earth" | "mars" | "jupiter";

interface BodyInfo {
  id: BodyId;
  name: string;
  fact: string;
  position: THREE.Vector3;
  radius: number;
  cameraOffset: THREE.Vector3;
}

const SOLAR_BODIES: Record<BodyId, BodyInfo> = {
  sun: {
    id: "sun",
    name: "Sun",
    fact: "Our star",
    position: new THREE.Vector3(-4.2, 1.25, -4.4),
    radius: 0.92,
    cameraOffset: new THREE.Vector3(1.6, 0.4, 2.8),
  },
  earth: {
    id: "earth",
    name: "Earth",
    fact: "Our home",
    position: new THREE.Vector3(0.95, -0.1, 0.9),
    radius: 1.18,
    cameraOffset: new THREE.Vector3(0.4, 0.45, 3.15),
  },
  mars: {
    id: "mars",
    name: "Mars",
    fact: "The red planet",
    position: new THREE.Vector3(-1.55, -0.72, -1.25),
    radius: 0.52,
    cameraOffset: new THREE.Vector3(0.35, 0.3, 1.85),
  },
  jupiter: {
    id: "jupiter",
    name: "Jupiter",
    fact: "Biggest planet",
    position: new THREE.Vector3(3.6, 1.28, -5.2),
    radius: 1.55,
    cameraOffset: new THREE.Vector3(-0.9, 0.5, 4.1),
  },
};

function PlanetHoverLabel({
  name,
  fact,
  yOffset,
}: {
  name: string;
  fact: string;
  yOffset: number;
}) {
  return (
    <Html
      position={[0, yOffset, 0]}
      center
      distanceFactor={8}
      zIndexRange={[20, 0]}
    >
      <div className="pointer-events-none px-3.5 py-2 rounded-2xl bg-[#0B0B1E]/90 backdrop-blur-xl border border-white/25 shadow-glass-glow text-left whitespace-nowrap">
        <div className="font-heading text-xs font-bold text-cosmic-text">
          {name}
        </div>
        <div className="text-[11px] text-pastel-peach font-medium">{fact}</div>
      </div>
    </Html>
  );
}

// ============================================================================
// 5. Textured & Fallback Bodies (Sun, Earth + Clouds + Moon, Mars, Jupiter)
// ============================================================================
function SunTexturedMesh() {
  const tex = useTexture("/textures/sun.jpg");
  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
  }, [tex]);
  return <meshBasicMaterial map={tex} color="#FFF8E7" />;
}

function SunBody({
  reducedMotion,
  hovered,
  onHover,
  onSelect,
}: {
  reducedMotion: boolean;
  hovered: boolean;
  onHover: (id: BodyId | null) => void;
  onSelect: (id: BodyId) => void;
}) {
  const info = SOLAR_BODIES.sun;
  const sphereRef = useRef<THREE.Mesh>(null);
  const coronaMat = useMemo(() => createSolarCoronaShader(), []);

  useFrame(({ clock }, delta) => {
    if (!reducedMotion) {
      if (sphereRef.current) {
        sphereRef.current.rotation.y += delta * 0.08;
      }
      coronaMat.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  return (
    <group position={info.position}>
      {/* Warm Solar Point Light */}
      <pointLight
        intensity={45}
        distance={40}
        decay={0.55}
        color="#FFE8B0"
      />

      {/* Core Photosphere */}
      <mesh
        ref={sphereRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect("sun");
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover("sun");
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[info.radius, 48, 48]} />
        <SafeTexturedObject
          fallback={<meshBasicMaterial color="#FFB74D" />}
        >
          <SunTexturedMesh />
        </SafeTexturedObject>
      </mesh>

      {/* Animated Flickering Corona Sphere */}
      <mesh material={coronaMat}>
        <sphereGeometry args={[info.radius * 1.28, 48, 48]} />
      </mesh>

      {/* Outer Soft Solar Halo */}
      <mesh>
        <sphereGeometry args={[info.radius * 1.55, 32, 32]} />
        <meshBasicMaterial
          color="#FFA726"
          transparent
          opacity={0.18}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {hovered && (
        <PlanetHoverLabel
          name={info.name}
          fact={info.fact}
          yOffset={info.radius + 0.45}
        />
      )}
    </group>
  );
}

function EarthSurfaceMaterial() {
  const tex = useTexture("/textures/earth.jpg");
  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
  }, [tex]);
  return (
    <meshStandardMaterial
      map={tex}
      roughness={0.65}
      metalness={0.08}
    />
  );
}

function EarthCloudsMaterial() {
  const cloudsTex = useTexture("/textures/earth-clouds.jpg");
  useMemo(() => {
    cloudsTex.colorSpace = THREE.SRGBColorSpace;
    cloudsTex.needsUpdate = true;
  }, [cloudsTex]);
  return (
    <meshStandardMaterial
      map={cloudsTex}
      alphaMap={cloudsTex}
      transparent
      opacity={0.4}
      depthWrite={false}
      roughness={0.9}
    />
  );
}

function MoonSurfaceMaterial() {
  const moonTex = useTexture("/textures/moon.jpg");
  useMemo(() => {
    moonTex.colorSpace = THREE.SRGBColorSpace;
    moonTex.needsUpdate = true;
  }, [moonTex]);
  return (
    <meshStandardMaterial
      map={moonTex}
      roughness={0.9}
      metalness={0.04}
    />
  );
}

function EarthAndMoonBody({
  reducedMotion,
  hovered,
  onHover,
  onSelect,
}: {
  reducedMotion: boolean;
  hovered: boolean;
  onHover: (id: BodyId | null) => void;
  onSelect: (id: BodyId) => void;
}) {
  const info = SOLAR_BODIES.earth;
  const earthRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const moonOrbitRef = useRef<THREE.Group>(null);
  const moonMeshRef = useRef<THREE.Mesh>(null);
  const moonAngleRef = useRef<number>(0.75);

  const atmosphereMat = useMemo(
    () => createAtmosphereShader("#4FC3F7", 0.95, 2.7),
    []
  );
  const axialTiltRad = useMemo(() => THREE.MathUtils.degToRad(23.4), []);

  useFrame((_, delta) => {
    if (!reducedMotion) {
      if (earthRef.current) {
        earthRef.current.rotation.y += delta * 0.16;
      }
      if (cloudsRef.current) {
        cloudsRef.current.rotation.y += delta * 0.22;
      }
      moonAngleRef.current += delta * 0.34;
    }

    if (moonOrbitRef.current) {
      const r = 1.98;
      const a = moonAngleRef.current;
      moonOrbitRef.current.position.set(
        Math.cos(a) * r,
        Math.sin(a * 1.1) * 0.32,
        Math.sin(a) * r
      );
    }
    if (moonMeshRef.current && !reducedMotion) {
      moonMeshRef.current.rotation.y += delta * 0.12;
    }
  });

  return (
    <group position={info.position}>
      {/* Earth Group with 23.4° Axial Tilt */}
      <group rotation={[0, 0, -axialTiltRad]}>
        {/* Earth Surface Sphere */}
        <mesh
          ref={earthRef}
          onClick={(e) => {
            e.stopPropagation();
            onSelect("earth");
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHover("earth");
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            onHover(null);
            document.body.style.cursor = "auto";
          }}
        >
          <sphereGeometry args={[info.radius, 64, 64]} />
          <SafeTexturedObject
            fallback={
              <meshStandardMaterial
                color="#2B6CB0"
                roughness={0.65}
                metalness={0.1}
              />
            }
          >
            <EarthSurfaceMaterial />
          </SafeTexturedObject>
        </mesh>

        {/* Slightly Larger Cloud Layer Rotating Faster */}
        <mesh ref={cloudsRef}>
          <sphereGeometry args={[info.radius * 1.016, 64, 64]} />
          <SafeTexturedObject
            fallback={
              <meshStandardMaterial
                color="#ffffff"
                transparent
                opacity={0.15}
                depthWrite={false}
              />
            }
          >
            <EarthCloudsMaterial />
          </SafeTexturedObject>
        </mesh>

        {/* Blue Fresnel Atmosphere Glow (Additive, BackSide) */}
        <mesh material={atmosphereMat}>
          <sphereGeometry args={[info.radius * 1.1, 64, 64]} />
        </mesh>
      </group>

      {/* Orbiting Moon */}
      <group ref={moonOrbitRef} position={[1.98, 0.2, 0]}>
        <mesh ref={moonMeshRef}>
          <sphereGeometry args={[0.22, 32, 32]} />
          <SafeTexturedObject
            fallback={
              <meshStandardMaterial color="#CBD5E1" roughness={0.9} />
            }
          >
            <MoonSurfaceMaterial />
          </SafeTexturedObject>
        </mesh>
      </group>

      {hovered && (
        <PlanetHoverLabel
          name={info.name}
          fact={info.fact}
          yOffset={info.radius + 0.42}
        />
      )}
    </group>
  );
}

function MarsSurfaceMaterial() {
  const marsTex = useTexture("/textures/mars.jpg");
  useMemo(() => {
    marsTex.colorSpace = THREE.SRGBColorSpace;
    marsTex.needsUpdate = true;
  }, [marsTex]);
  return (
    <meshStandardMaterial
      map={marsTex}
      roughness={0.82}
      metalness={0.05}
    />
  );
}

function MarsBody({
  reducedMotion,
  hovered,
  onHover,
  onSelect,
}: {
  reducedMotion: boolean;
  hovered: boolean;
  onHover: (id: BodyId | null) => void;
  onSelect: (id: BodyId) => void;
}) {
  const info = SOLAR_BODIES.mars;
  const marsRef = useRef<THREE.Mesh>(null);
  const marsAtmo = useMemo(
    () => createAtmosphereShader("#FF8A50", 0.65, 3.0),
    []
  );

  useFrame((_, delta) => {
    if (!reducedMotion && marsRef.current) {
      marsRef.current.rotation.y += delta * 0.14;
    }
  });

  return (
    <group position={info.position}>
      <mesh
        ref={marsRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect("mars");
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover("mars");
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[info.radius, 48, 48]} />
        <SafeTexturedObject
          fallback={
            <meshStandardMaterial color="#D96B43" roughness={0.85} />
          }
        >
          <MarsSurfaceMaterial />
        </SafeTexturedObject>
      </mesh>

      {/* Faint Orange Atmosphere Rim */}
      <mesh material={marsAtmo}>
        <sphereGeometry args={[info.radius * 1.09, 48, 48]} />
      </mesh>

      {hovered && (
        <PlanetHoverLabel
          name={info.name}
          fact={info.fact}
          yOffset={info.radius + 0.36}
        />
      )}
    </group>
  );
}

function JupiterSurfaceMaterial() {
  const jupTex = useTexture("/textures/jupiter.jpg");
  useMemo(() => {
    jupTex.colorSpace = THREE.SRGBColorSpace;
    jupTex.needsUpdate = true;
  }, [jupTex]);
  return (
    <meshStandardMaterial
      map={jupTex}
      roughness={0.7}
      metalness={0.05}
    />
  );
}

function JupiterBody({
  reducedMotion,
  hovered,
  onHover,
  onSelect,
}: {
  reducedMotion: boolean;
  hovered: boolean;
  onHover: (id: BodyId | null) => void;
  onSelect: (id: BodyId) => void;
}) {
  const info = SOLAR_BODIES.jupiter;
  const jupRef = useRef<THREE.Mesh>(null);
  const jupAtmo = useMemo(
    () => createAtmosphereShader("#F6AD55", 0.45, 3.2),
    []
  );

  useFrame((_, delta) => {
    if (!reducedMotion && jupRef.current) {
      jupRef.current.rotation.y += delta * 0.22;
    }
  });

  return (
    <group position={info.position}>
      <mesh
        ref={jupRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect("jupiter");
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover("jupiter");
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          onHover(null);
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[info.radius, 48, 48]} />
        <SafeTexturedObject
          fallback={
            <meshStandardMaterial color="#C89D7C" roughness={0.75} />
          }
        >
          <JupiterSurfaceMaterial />
        </SafeTexturedObject>
      </mesh>

      <mesh material={jupAtmo}>
        <sphereGeometry args={[info.radius * 1.06, 48, 48]} />
      </mesh>

      {hovered && (
        <PlanetHoverLabel
          name={info.name}
          fact={info.fact}
          yOffset={info.radius + 0.48}
        />
      )}
    </group>
  );
}

// ============================================================================
// 6. Asteroid Belt (40 Desktop / 20 Mobile) Drifting Between Mars and Jupiter
// ============================================================================
interface AsteroidState {
  angle: number;
  radius: number;
  speed: number;
  yOffset: number;
  scale: [number, number, number];
  rotation: [number, number, number];
  rotSpeed: [number, number, number];
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
  const rockGeo = useMemo(
    () => createSimplexRockGeometry(0.068, 1, 4.2),
    []
  );

  // Belt center positioned so the arc sweeps through the mid-background between Mars and Jupiter
  const beltCenter = useMemo(() => new THREE.Vector3(-1.2, 0.1, -3.2), []);

  const items = useMemo<AsteroidState[]>(() => {
    const arr: AsteroidState[] = [];
    for (let i = 0; i < count; i++) {
      const u = i / count;
      const h1 = hash3(i, 1.3, 7.1);
      const h2 = hash3(i, 4.7, 2.9);
      const h3 = hash3(i, 8.2, 5.4);
      const baseScale = 0.55 + h1 * 1.15;

      arr.push({
        angle: u * Math.PI * 2 + h2 * 0.35,
        radius: 2.6 + h1 * 1.65,
        speed: 0.045 + (1 - h1) * 0.065,
        yOffset: (h2 - 0.5) * 0.85,
        scale: [
          baseScale * (0.85 + h2 * 0.35),
          baseScale * (0.75 + h3 * 0.35),
          baseScale * (0.85 + h1 * 0.3),
        ],
        rotation: [h1 * Math.PI, h2 * Math.PI, h3 * Math.PI],
        rotSpeed: [
          0.25 + h1 * 0.5,
          0.2 + h2 * 0.45,
          0.18 + h3 * 0.4,
        ],
      });
    }
    return arr;
  }, [count]);

  useEffect(() => {
    if (!meshRef.current) return;
    items.forEach((a, i) => {
      dummy.position.set(
        beltCenter.x + Math.cos(a.angle) * a.radius,
        beltCenter.y + a.yOffset,
        beltCenter.z + Math.sin(a.angle) * a.radius
      );
      dummy.rotation.set(a.rotation[0], a.rotation[1], a.rotation[2]);
      dummy.scale.set(a.scale[0], a.scale[1], a.scale[2]);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [items, dummy, beltCenter]);

  useFrame((_, delta) => {
    if (reducedMotion || !meshRef.current) return;
    for (let i = 0; i < items.length; i++) {
      const a = items[i];
      a.angle += a.speed * delta;
      a.rotation[0] += a.rotSpeed[0] * delta;
      a.rotation[1] += a.rotSpeed[1] * delta;
      a.rotation[2] += a.rotSpeed[2] * delta;

      dummy.position.set(
        beltCenter.x + Math.cos(a.angle) * a.radius,
        beltCenter.y + a.yOffset + Math.sin(a.angle * 2) * 0.06,
        beltCenter.z + Math.sin(a.angle) * a.radius
      );
      dummy.rotation.set(a.rotation[0], a.rotation[1], a.rotation[2]);
      dummy.scale.set(a.scale[0], a.scale[1], a.scale[2]);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group rotation={[0.18, 0.08, -0.16]}>
      <instancedMesh
        ref={meshRef}
        args={[rockGeo, undefined, count]}
        frustumCulled={false}
      >
        <meshStandardMaterial
          color="#8C7F75"
          roughness={0.95}
          metalness={0.05}
          flatShading
        />
      </instancedMesh>
    </group>
  );
}

// ============================================================================
// 7. Comet with Icy Nucleus + 400-Particle Anti-Solar Tail
// ============================================================================
function CometWithTail({
  tailPointsCount,
  reducedMotion,
}: {
  tailPointsCount: number;
  reducedMotion: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const nucleusRef = useRef<THREE.Mesh>(null);
  const pointsGeomRef = useRef<THREE.BufferGeometry>(null);

  const nucleusGeo = useMemo(
    () => createSimplexRockGeometry(0.085, 1, 19.7),
    []
  );

  // Precompute per-particle normalized distance along the tail [0..1] and lateral spread
  const { positions, colors, particleSeeds } = useMemo(() => {
    const pos = new Float32Array(tailPointsCount * 3);
    const col = new Float32Array(tailPointsCount * 3);
    const seeds: { t: number; spreadX: number; spreadY: number; speed: number }[] =
      [];

    const cCore = new THREE.Color("#F0FAFF");
    const cMid = new THREE.Color("#7CC8FF");
    const cTip = new THREE.Color("#0B1938");
    const tmp = new THREE.Color();

    for (let i = 0; i < tailPointsCount; i++) {
      const t = i / tailPointsCount; // 0 = at nucleus, 1 = tail tip
      const s1 = hash3(i, 2.1, 9.3) - 0.5;
      const s2 = hash3(i, 6.4, 3.7) - 0.5;
      const s3 = hash3(i, 4.2, 8.1);

      seeds.push({
        t,
        spreadX: s1 * 0.42,
        spreadY: s2 * 0.42,
        speed: 0.65 + s3 * 0.7,
      });

      // Fade from bright white-blue near the nucleus to dark/transparent at the tip
      const fade = Math.pow(1 - t, 1.65);
      if (t < 0.35) {
        tmp.lerpColors(cCore, cMid, t / 0.35);
      } else {
        tmp.lerpColors(cMid, cTip, (t - 0.35) / 0.65);
      }
      col[i * 3] = tmp.r * fade * 1.45;
      col[i * 3 + 1] = tmp.g * fade * 1.45;
      col[i * 3 + 2] = tmp.b * fade * 1.45;
    }

    return { positions: pos, colors: col, particleSeeds: seeds };
  }, [tailPointsCount]);

  const sunPos = SOLAR_BODIES.sun.position;
  const cometPos = useMemo(() => new THREE.Vector3(), []);
  const awayDir = useMemo(() => new THREE.Vector3(), []);
  const orthoA = useMemo(() => new THREE.Vector3(), []);
  const orthoB = useMemo(() => new THREE.Vector3(), []);
  const upVec = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  const updateCometState = (elapsed: number) => {
    // Slow wide elliptical path across the background
    const orbitPhase = reducedMotion ? 0.55 : elapsed * 0.14;
    cometPos.set(
      Math.cos(orbitPhase) * 3.8 - 0.5,
      1.35 + Math.sin(orbitPhase * 1.5) * 0.65,
      -2.3 + Math.sin(orbitPhase) * 1.6
    );

    if (groupRef.current) {
      groupRef.current.position.copy(cometPos);
    }

    // Tail direction ALWAYS points strictly AWAY from the Sun
    awayDir.subVectors(cometPos, sunPos).normalize();
    orthoA.crossVectors(awayDir, upVec).normalize();
    if (orthoA.lengthSq() < 0.01) {
      orthoA.set(1, 0, 0);
    }
    orthoB.crossVectors(awayDir, orthoA).normalize();

    const tailLength = 2.15;
    for (let i = 0; i < tailPointsCount; i++) {
      const seed = particleSeeds[i];
      const flowT = reducedMotion
        ? seed.t
        : (seed.t + elapsed * 0.28 * seed.speed) % 1;
      const dist = flowT * tailLength;
      const coneWidth = Math.pow(flowT, 0.85);

      const px =
        awayDir.x * dist +
        (orthoA.x * seed.spreadX + orthoB.x * seed.spreadY) * coneWidth;
      const py =
        awayDir.y * dist +
        (orthoA.y * seed.spreadX + orthoB.y * seed.spreadY) * coneWidth;
      const pz =
        awayDir.z * dist +
        (orthoA.z * seed.spreadX + orthoB.z * seed.spreadY) * coneWidth;

      positions[i * 3] = px;
      positions[i * 3 + 1] = py;
      positions[i * 3 + 2] = pz;
    }

    if (pointsGeomRef.current) {
      const attr = pointsGeomRef.current.getAttribute("position");
      if (attr) attr.needsUpdate = true;
    }
  };

  useEffect(() => {
    updateCometState(0.55);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tailPointsCount, reducedMotion]);

  useFrame(({ clock }, delta) => {
    if (!reducedMotion && nucleusRef.current) {
      nucleusRef.current.rotation.x += delta * 0.4;
      nucleusRef.current.rotation.y += delta * 0.55;
    }
    updateCometState(clock.getElapsedTime());
  });

  return (
    <group ref={groupRef}>
      {/* Irregular Icy Nucleus */}
      <mesh ref={nucleusRef} geometry={nucleusGeo}>
        <meshStandardMaterial
          color="#E2F4FF"
          emissive="#8CE0FF"
          emissiveIntensity={0.6}
          roughness={0.5}
          flatShading
        />
      </mesh>

      {/* Soft Coma Halo */}
      <mesh>
        <sphereGeometry args={[0.17, 20, 20]} />
        <meshBasicMaterial
          color="#B3E5FC"
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Anti-Solar Particle Tail */}
      <points frustumCulled={false}>
        <bufferGeometry ref={pointsGeomRef}>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.048}
          vertexColors
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

// ============================================================================
// 8. Camera Fly-To Rig & Scene Assembly
// ============================================================================
const DEFAULT_CAMERA_POS = new THREE.Vector3(0, 1.05, 5.25);
const DEFAULT_CAMERA_TARGET = new THREE.Vector3(0, 0, 0);

function SolarCameraRig({
  focusedBody,
  isInteracting,
  reducedMotion,
  controlsRef,
}: {
  focusedBody: BodyId | null;
  isInteracting: boolean;
  reducedMotion: boolean;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();
  const isReturningRef = useRef(false);
  const prevFocusedRef = useRef<BodyId | null>(null);

  useEffect(() => {
    if (prevFocusedRef.current !== null && focusedBody === null) {
      isReturningRef.current = true;
    }
    if (focusedBody !== null) {
      isReturningRef.current = false;
    }
    prevFocusedRef.current = focusedBody;
  }, [focusedBody]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls || isInteracting) return;

    const lerpFactor = reducedMotion ? 1 : 1 - Math.exp(-3.8 * delta);

    if (focusedBody) {
      const info = SOLAR_BODIES[focusedBody];
      const desiredTarget = info.position;
      const desiredCamPos = info.position.clone().add(info.cameraOffset);

      camera.position.lerp(desiredCamPos, lerpFactor);
      controls.target.lerp(desiredTarget, lerpFactor);
      controls.update();
    } else if (isReturningRef.current) {
      camera.position.lerp(DEFAULT_CAMERA_POS, lerpFactor);
      controls.target.lerp(DEFAULT_CAMERA_TARGET, lerpFactor);
      controls.update();

      if (
        camera.position.distanceTo(DEFAULT_CAMERA_POS) < 0.04 &&
        controls.target.distanceTo(DEFAULT_CAMERA_TARGET) < 0.04
      ) {
        isReturningRef.current = false;
      }
    }
  });

  return null;
}

function SolarSystemScene({
  isMobile,
  reducedMotion,
  mouseOffset,
  focusedBody,
  setFocusedBody,
}: {
  isMobile: boolean;
  reducedMotion: boolean;
  mouseOffset: React.MutableRefObject<{ x: number; y: number }>;
  focusedBody: BodyId | null;
  setFocusedBody: React.Dispatch<React.SetStateAction<BodyId | null>>;
}) {
  const rootRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [hoveredBody, setHoveredBody] = useState<BodyId | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);

  const handleSelectBody = (id: BodyId) => {
    setFocusedBody((prev) => (prev === id ? null : id));
  };

  useFrame(() => {
    if (!rootRef.current) return;
    const targetX = reducedMotion ? 0 : mouseOffset.current.y * 0.12;
    const targetY = reducedMotion ? 0 : mouseOffset.current.x * 0.16;
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
  });

  return (
    <group
      ref={rootRef}
      onPointerMissed={() => {
        if (focusedBody) setFocusedBody(null);
      }}
    >
      {/* Ambient fill + cool deep-space rim light */}
      <ambientLight intensity={0.42} color="#D8D4F2" />
      <directionalLight position={[-6, 3, -5]} intensity={1.35} color="#FFF3D1" />
      <pointLight position={[5, -3, 4]} intensity={6} color="#90CAF9" />

      {/* 8. Background Stars: radius 300, depth 60, count 4000, fade */}
      <Stars
        radius={300}
        depth={60}
        count={4000}
        factor={4}
        saturation={0.25}
        fade
        speed={reducedMotion ? 0 : 0.45}
      />

      {/* 1. SUN (left/back) + Corona + Warm PointLight */}
      <SunBody
        reducedMotion={reducedMotion}
        hovered={hoveredBody === "sun"}
        onHover={setHoveredBody}
        onSelect={handleSelectBody}
      />

      {/* 2. EARTH (front-right, largest, 23.4° tilt, clouds, Fresnel atmosphere) + 3. MOON */}
      <EarthAndMoonBody
        reducedMotion={reducedMotion}
        hovered={hoveredBody === "earth"}
        onHover={setHoveredBody}
        onSelect={handleSelectBody}
      />

      {/* 4. MARS (mid-distance + faint orange atmosphere rim) */}
      <MarsBody
        reducedMotion={reducedMotion}
        hovered={hoveredBody === "mars"}
        onHover={setHoveredBody}
        onSelect={handleSelectBody}
      />

      {/* 5. JUPITER (far back, large, hidden on mobile < 768px) */}
      {!isMobile && (
        <JupiterBody
          reducedMotion={reducedMotion}
          hovered={hoveredBody === "jupiter"}
          onHover={setHoveredBody}
          onSelect={handleSelectBody}
        />
      )}

      {/* 6. ASTEROIDS (~40 desktop / 20 mobile) between Mars and Jupiter */}
      <AsteroidBelt
        count={isMobile ? 20 : 40}
        reducedMotion={reducedMotion}
      />

      {/* 7. COMET with Icy Nucleus & Anti-Solar Tail (400 desktop / 180 mobile) */}
      <CometWithTail
        tailPointsCount={isMobile ? 180 : 400}
        reducedMotion={reducedMotion}
      />

      {/* Camera Lerp Fly-To Rig */}
      <SolarCameraRig
        focusedBody={focusedBody}
        isInteracting={isInteracting}
        reducedMotion={reducedMotion}
        controlsRef={controlsRef}
      />

      {/* OrbitControls: 360° rotate, no pan, no zoom, damping, slow autoRotate */}
      <OrbitControls
        ref={controlsRef}
        enableZoom={false}
        enablePan={false}
        enableDamping
        dampingFactor={0.05}
        autoRotate={!reducedMotion && !isInteracting && !focusedBody}
        autoRotateSpeed={0.38}
        onStart={() => setIsInteracting(true)}
        onEnd={() => setIsInteracting(false)}
      />

      {/* 9. Post-processing: Bloom (threshold 0.6, intensity 1.2) + Vignette (Desktop only) */}
      {!isMobile && (
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.6}
            intensity={1.2}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.18} darkness={0.55} />
        </EffectComposer>
      )}
    </group>
  );
}

// ============================================================================
// 9. Exported HeroScene Component
// ============================================================================
export default function HeroScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isInView, setIsInView] = useState<boolean>(true);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [focusedBody, setFocusedBody] = useState<BodyId | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onMotionChange = (e: MediaQueryListEvent) =>
      setReducedMotion(e.matches);
    mq.addEventListener("change", onMotionChange);

    const updateViewport = () => {
      setIsMobile(window.innerWidth < 768);
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFocusedBody(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      mq.removeEventListener("change", onMotionChange);
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("keydown", onKeyDown);
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
      <div className="w-full h-full rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing relative">
        <Canvas
          dpr={[1, 1.75]}
          frameloop={isInView ? "always" : "never"}
          camera={{ position: [0, 1.05, 5.25], fov: 44 }}
        >
          <SolarSystemScene
            isMobile={isMobile}
            reducedMotion={reducedMotion}
            mouseOffset={mouseOffset}
            focusedBody={focusedBody}
            setFocusedBody={setFocusedBody}
          />
        </Canvas>

        {/* Active Planet Focus Pill */}
        {focusedBody && (
          <button
            type="button"
            onClick={() => setFocusedBody(null)}
            className="min-h-[36px] absolute top-3 right-3 px-3.5 py-1.5 rounded-full glass text-xs font-medium text-cosmic-text hover:bg-white/[0.15] transition-colors"
          >
            Viewing {SOLAR_BODIES[focusedBody].name} · Click or Esc to reset
          </button>
        )}
      </div>

      {/* Floating glass hint chip under the canvas */}
      <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-medium text-cosmic-muted pointer-events-none">
        <Orbit className="w-3.5 h-3.5 text-pastel-lavender" />
        <span>Drag to rotate 360° · Click any planet to inspect</span>
      </div>
    </div>
  );
}
