"use client";

import React, {
  Component,
  ReactNode,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls, useTexture } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  DepthOfField,
  Vignette,
  Noise,
} from "@react-three/postprocessing";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

const TEXTURE_PATHS = {
  sun: "/textures/sun.jpg",
  mercury: "/textures/mercury.jpg",
  venus: "/textures/venus.jpg",
  earth: "/textures/earth.jpg",
  earthNight: "/textures/earth-night.jpg",
  earthClouds: "/textures/earth-clouds.jpg",
  moon: "/textures/moon.jpg",
  mars: "/textures/mars.jpg",
  jupiter: "/textures/jupiter.jpg",
  saturn: "/textures/saturn.jpg",
  saturnRing: "/textures/saturn-ring.png",
  uranus: "/textures/uranus.jpg",
  neptune: "/textures/neptune.jpg",
  milkyWay: "/textures/milky-way.jpg",
} as const;

// Preload every texture at module level so nothing suspends individually or flickers
Object.values(TEXTURE_PATHS).forEach((url) => {
  useTexture.preload(url);
});

export type HeroViewMode = "cinematic" | "orrery";

export interface BodyFactInfo {
  id: string;
  name: string;
  subtitle: string;
  tiltDeg: number;
  facts: [string, string];
}

interface FlyByBodyConfig extends BodyFactInfo {
  textureKey: keyof typeof TEXTURE_PATHS;
  cinematicSize: number;
  spinSpeed: number;
  fallbackColor: string;
  mobileIncluded?: boolean;
}

const FLYBY_BODIES: FlyByBodyConfig[] = [
  {
    id: "saturn",
    name: "Saturn",
    subtitle: "Ringed Gas Giant",
    textureKey: "saturn",
    cinematicSize: 0.364,
    spinSpeed: 0.85,
    tiltDeg: 26.7,
    fallbackColor: "#dcc08e",
    mobileIncluded: true,
    facts: [
      "Its icy ring system spans 282,000 km across yet averages only tens of metres thick.",
      "Tilted at 26.7 degrees, Saturn takes 29.4 Earth years to complete one trip around the Sun.",
    ],
  },
  {
    id: "jupiter",
    name: "Jupiter",
    subtitle: "Largest Planet",
    textureKey: "jupiter",
    cinematicSize: 0.416,
    spinSpeed: 1.0,
    tiltDeg: 3.1,
    fallbackColor: "#c89b6e",
    mobileIncluded: true,
    facts: [
      "Massive enough to hold more than 1,300 Earths inside its swirling gas envelope.",
      "Spins once every 9.9 hours, driving jet streams and the centuries-old Great Red Spot.",
    ],
  },
  {
    id: "mars",
    name: "Mars",
    subtitle: "The Red Planet",
    textureKey: "mars",
    cinematicSize: 0.228,
    spinSpeed: 0.55,
    tiltDeg: 25.2,
    fallbackColor: "#c25b38",
    mobileIncluded: true,
    facts: [
      "Iron oxide dust blankets the surface, giving Mars its signature rust-orange glow.",
      "Home to Olympus Mons and Valles Marineris, the largest canyon system in the solar system.",
    ],
  },
  {
    id: "venus",
    name: "Venus",
    subtitle: "Cloud-Wrapped World",
    textureKey: "venus",
    cinematicSize: 0.26,
    spinSpeed: -0.18,
    tiltDeg: 177.4,
    fallbackColor: "#d9b37c",
    mobileIncluded: true,
    facts: [
      "Rotates backwards with a 177.4-degree tilt so the Sun rises in the west and sets in the east.",
      "Dense carbon dioxide clouds trap heat, raising surface temperatures above 465°C.",
    ],
  },
  {
    id: "neptune",
    name: "Neptune",
    subtitle: "Outer Ice Giant",
    textureKey: "neptune",
    cinematicSize: 0.286,
    spinSpeed: 0.72,
    tiltDeg: 28.3,
    fallbackColor: "#3b66c4",
    mobileIncluded: false,
    facts: [
      "Supersonic methane winds exceed 2,000 km/h across its deep azure atmosphere.",
      "Orbits 30 times farther from the Sun than Earth, taking 165 years per revolution.",
    ],
  },
  {
    id: "uranus",
    name: "Uranus",
    subtitle: "Tilted Ice Giant",
    textureKey: "uranus",
    cinematicSize: 0.293,
    spinSpeed: -0.68,
    tiltDeg: 98.0,
    fallbackColor: "#7fc8d6",
    mobileIncluded: false,
    facts: [
      "Rolls on its side with an axial tilt of 98 degrees, likely from an ancient giant impact.",
      "Upper-atmosphere methane absorbs red light and reflects serene cyan-blue wavelengths.",
    ],
  },
  {
    id: "mercury",
    name: "Mercury",
    subtitle: "Innermost Planet",
    textureKey: "mercury",
    cinematicSize: 0.182,
    spinSpeed: 0.24,
    tiltDeg: 0.03,
    fallbackColor: "#8c8680",
    mobileIncluded: false,
    facts: [
      "Races around the Sun every 88 days as the smallest and innermost planet.",
      "Without a thick atmosphere, surface temperatures swing over 600°C between day and night.",
    ],
  },
  {
    id: "moon",
    name: "The Moon",
    subtitle: "Earth's Natural Satellite",
    textureKey: "moon",
    cinematicSize: 0.163,
    spinSpeed: 0.3,
    tiltDeg: 6.7,
    fallbackColor: "#b5b2ac",
    mobileIncluded: false,
    facts: [
      "Ancient volcanic basalt plains called maria preserve billions of years of impact history.",
      "Orbits at an average distance of 384,400 km, stabilizing Earth's axial tilt and tides.",
    ],
  },
];

const EARTH_FACT_INFO: BodyFactInfo = {
  id: "earth",
  name: "Earth",
  subtitle: "Home World · SPHEREx Vantage Point",
  tiltDeg: 23.4,
  facts: [
    "Tilted at 23.4 degrees, where oceans, clouds, and city lights mark our living world.",
    "From low polar orbit above Earth, SPHEREx maps the entire sky in 102 infrared colours.",
  ],
};

interface OrreryPlanetConfig extends BodyFactInfo {
  textureKey: keyof typeof TEXTURE_PATHS;
  orbitRadius: number;
  size: number;
  orbitSpeed: number;
  spinSpeed: number;
  initialAngle: number;
  fallbackColor: string;
}

const ORRERY_PLANETS: OrreryPlanetConfig[] = [
  {
    ...FLYBY_BODIES.find((b) => b.id === "mercury")!,
    orbitRadius: 3.4,
    size: 0.22,
    orbitSpeed: 0.42,
    spinSpeed: 0.18,
    initialAngle: 0.8,
  },
  {
    ...FLYBY_BODIES.find((b) => b.id === "venus")!,
    orbitRadius: 4.8,
    size: 0.36,
    orbitSpeed: 0.31,
    spinSpeed: -0.1,
    initialAngle: 2.3,
  },
  {
    ...EARTH_FACT_INFO,
    textureKey: "earth",
    orbitRadius: 6.5,
    size: 0.4,
    orbitSpeed: 0.24,
    spinSpeed: 0.55,
    initialAngle: 4.1,
    fallbackColor: "#2e67a0",
  },
  {
    ...FLYBY_BODIES.find((b) => b.id === "mars")!,
    orbitRadius: 8.3,
    size: 0.29,
    orbitSpeed: 0.19,
    spinSpeed: 0.52,
    initialAngle: 5.4,
  },
  {
    ...FLYBY_BODIES.find((b) => b.id === "jupiter")!,
    orbitRadius: 12.2,
    size: 0.92,
    orbitSpeed: 0.11,
    spinSpeed: 1.1,
    initialAngle: 1.2,
  },
  {
    ...FLYBY_BODIES.find((b) => b.id === "saturn")!,
    orbitRadius: 15.6,
    size: 0.76,
    orbitSpeed: 0.08,
    spinSpeed: 0.95,
    initialAngle: 3.5,
  },
  {
    ...FLYBY_BODIES.find((b) => b.id === "uranus")!,
    orbitRadius: 18.8,
    size: 0.52,
    orbitSpeed: 0.055,
    spinSpeed: -0.7,
    initialAngle: 5.0,
  },
  {
    ...FLYBY_BODIES.find((b) => b.id === "neptune")!,
    orbitRadius: 21.8,
    size: 0.5,
    orbitSpeed: 0.042,
    spinSpeed: 0.75,
    initialAngle: 0.3,
  },
];

const ALL_FACT_BODIES: BodyFactInfo[] = [EARTH_FACT_INFO, ...FLYBY_BODIES];

// Cinematic camera & Orrery camera defaults
const CINEMATIC_CAM_POS = new THREE.Vector3(0, 0.2, 11.4);
const CINEMATIC_TARGET = new THREE.Vector3(0.45, -0.25, 0);

const ORRERY_DIST = 26;
const ORRERY_ANGLE_RAD = (25 * Math.PI) / 180;
const ORRERY_CAM_POS = new THREE.Vector3(
  0,
  Math.sin(ORRERY_ANGLE_RAD) * ORRERY_DIST,
  Math.cos(ORRERY_ANGLE_RAD) * ORRERY_DIST
);

// Sun position in Cinematic Hero (behind and above Earth, top-left of Earth)
const CINEMATIC_SUN_POS = new THREE.Vector3(-4.5, 3.05, -7.8);

class TextureErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: ReactNode; children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function createCoronaTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 4, half, half, half);
  grad.addColorStop(0, "rgba(255, 253, 240, 1)");
  grad.addColorStop(0.18, "rgba(255, 215, 130, 0.82)");
  grad.addColorStop(0.45, "rgba(255, 145, 50, 0.28)");
  grad.addColorStop(1, "rgba(255, 90, 10, 0)");

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createGodRaysTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const half = size / 2;
  ctx.clearRect(0, 0, size, size);

  // Soft radial base glow
  const baseGrad = ctx.createRadialGradient(half, half, 2, half, half, half);
  baseGrad.addColorStop(0, "rgba(255, 250, 230, 0.9)");
  baseGrad.addColorStop(0.25, "rgba(255, 195, 105, 0.35)");
  baseGrad.addColorStop(0.7, "rgba(255, 140, 55, 0.06)");
  baseGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, size, size);

  // Volumetric god-ray shafts
  ctx.save();
  ctx.translate(half, half);
  const rayCount = 28;
  for (let i = 0; i < rayCount; i++) {
    const angle = (i / rayCount) * Math.PI * 2 + Math.sin(i * 3.7) * 0.06;
    const widthRad = 0.018 + (i % 3) * 0.014;
    const len = half * (0.72 + ((i * 7) % 5) * 0.065);

    ctx.save();
    ctx.rotate(angle);
    const rayGrad = ctx.createLinearGradient(0, 0, len, 0);
    rayGrad.addColorStop(0, "rgba(255, 248, 225, 0.55)");
    rayGrad.addColorStop(0.35, "rgba(255, 200, 120, 0.22)");
    rayGrad.addColorStop(0.75, "rgba(255, 155, 75, 0.05)");
    rayGrad.addColorStop(1, "rgba(255, 130, 50, 0)");

    ctx.fillStyle = rayGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, len, -widthRad, widthRad);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createLensGhostTexture(
  innerColor: string,
  outerColor: string,
  ringOnly = false
): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 2, half, half, half);
  if (ringOnly) {
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.62, "rgba(255,255,255,0.03)");
    grad.addColorStop(0.82, innerColor);
    grad.addColorStop(0.94, outerColor);
    grad.addColorStop(1, "rgba(0,0,0,0)");
  } else {
    grad.addColorStop(0, innerColor);
    grad.addColorStop(0.55, outerColor);
    grad.addColorStop(1, "rgba(0,0,0,0)");
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSaturnRingGeometry(innerRadius: number, outerRadius: number) {
  const geo = new THREE.RingGeometry(innerRadius, outerRadius, 128, 1);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const v3 = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v3.fromBufferAttribute(pos, i);
    const r = v3.length();
    const u = (r - innerRadius) / (outerRadius - innerRadius);
    uv.setXY(i, u, 0.5);
  }
  uv.needsUpdate = true;
  return geo;
}

function SunWithLensFlare({
  sunMap,
  isVisibleRef,
}: {
  sunMap?: THREE.Texture;
  isVisibleRef: React.MutableRefObject<boolean>;
}) {
  const sunMeshRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Sprite>(null);
  const rays1Ref = useRef<THREE.Sprite>(null);
  const rays2Ref = useRef<THREE.Sprite>(null);
  const ghostRefs = useRef<(THREE.Sprite | null)[]>([]);

  const coronaTex = useMemo(() => createCoronaTexture(), []);
  const godRaysTex = useMemo(() => createGodRaysTexture(), []);
  const ghostWarmTex = useMemo(
    () =>
      createLensGhostTexture(
        "rgba(255, 210, 140, 0.52)",
        "rgba(255, 140, 70, 0.12)",
        false
      ),
    []
  );
  const ghostCyanTex = useMemo(
    () =>
      createLensGhostTexture(
        "rgba(150, 215, 255, 0.45)",
        "rgba(110, 170, 255, 0.10)",
        false
      ),
    []
  );
  const ghostRingTex = useMemo(
    () =>
      createLensGhostTexture(
        "rgba(255, 225, 170, 0.42)",
        "rgba(165, 210, 255, 0.18)",
        true
      ),
    []
  );

  const ghostConfigs = useMemo(
    () => [
      { t: 0.28, scale: 1.4, tex: ghostCyanTex, opacity: 0.36 },
      { t: 0.52, scale: 2.3, tex: ghostRingTex, opacity: 0.32 },
      { t: 0.78, scale: 0.95, tex: ghostWarmTex, opacity: 0.38 },
      { t: 1.12, scale: 1.85, tex: ghostCyanTex, opacity: 0.25 },
      { t: 1.42, scale: 3.1, tex: ghostRingTex, opacity: 0.22 },
    ],
    [ghostCyanTex, ghostRingTex, ghostWarmTex]
  );

  const centerAxisTarget = useMemo(() => new THREE.Vector3(1.8, -1.1, 2.0), []);
  const tempPos = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    if (!isVisibleRef.current) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    if (sunMeshRef.current) {
      sunMeshRef.current.rotation.y += dt * 0.06;
    }
    if (coronaRef.current) {
      const s = 6.8 + Math.sin(t * 1.9) * 0.28;
      coronaRef.current.scale.set(s, s, 1);
    }
    if (rays1Ref.current) {
      const s1 = 11.5 + Math.sin(t * 1.2) * 0.45;
      rays1Ref.current.scale.set(s1, s1, 1);
      rays1Ref.current.material.rotation = t * 0.045;
    }
    if (rays2Ref.current) {
      const s2 = 14.2 + Math.cos(t * 0.95) * 0.55;
      rays2Ref.current.scale.set(s2, s2, 1);
      rays2Ref.current.material.rotation = -t * 0.032;
    }

    // Position lens flare ghosts along the line from the Sun through the viewport centre
    ghostConfigs.forEach((cfg, idx) => {
      const sp = ghostRefs.current[idx];
      if (!sp) return;
      tempPos.lerpVectors(CINEMATIC_SUN_POS, centerAxisTarget, cfg.t);
      sp.position.copy(tempPos);
    });
  });

  return (
    <group>
      {/* Sun Core + Corona + God-Ray Sprites */}
      <group position={CINEMATIC_SUN_POS}>
        <mesh ref={sunMeshRef}>
          <sphereGeometry args={[1.15, 48, 48]} />
          <meshStandardMaterial
            map={sunMap ?? null}
            emissiveMap={sunMap ?? null}
            color="#fff6df"
            emissive="#ffae38"
            emissiveIntensity={2.8}
            roughness={1}
            metalness={0}
          />
        </mesh>

        {coronaTex && (
          <sprite ref={coronaRef} scale={[6.8, 6.8, 1]}>
            <spriteMaterial
              map={coronaTex}
              color="#ffd28a"
              transparent
              opacity={0.92}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </sprite>
        )}

        {/* Anamorphic horizontal lens flare streak */}
        {coronaTex && (
          <sprite scale={[12.5, 0.65, 1]}>
            <spriteMaterial
              map={coronaTex}
              color="#b8dcff"
              transparent
              opacity={0.55}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </sprite>
        )}

        {/* God-ray rotating starburst layers */}
        {godRaysTex && (
          <>
            <sprite ref={rays1Ref} scale={[11.5, 11.5, 1]}>
              <spriteMaterial
                map={godRaysTex}
                color="#ffca7a"
                transparent
                opacity={0.62}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </sprite>
            <sprite ref={rays2Ref} scale={[14.2, 14.2, 1]}>
              <spriteMaterial
                map={godRaysTex}
                color="#ffe6b5"
                transparent
                opacity={0.42}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </sprite>
          </>
        )}
      </group>

      {/* Lens Flare Ghosts along Sun-to-Camera axis */}
      {ghostConfigs.map((cfg, idx) =>
        cfg.tex ? (
          <sprite
            key={idx}
            ref={(el) => {
              ghostRefs.current[idx] = el;
            }}
            scale={[cfg.scale, cfg.scale, 1]}
          >
            <spriteMaterial
              map={cfg.tex}
              transparent
              opacity={cfg.opacity}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </sprite>
        ) : null
      )}
    </group>
  );
}

function HeroEarth({
  radius,
  position,
  dayMap,
  nightMap,
  cloudsMap,
  sunDirection,
  isVisibleRef,
  onSelect,
  onHoverChange,
}: {
  radius: number;
  position: [number, number, number];
  dayMap?: THREE.Texture;
  nightMap?: THREE.Texture;
  cloudsMap?: THREE.Texture;
  sunDirection: THREE.Vector3;
  isVisibleRef: React.MutableRefObject<boolean>;
  onSelect: () => void;
  onHoverChange: (hovered: boolean) => void;
}) {
  const spinGroupRef = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const earthMatRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uDayMap: { value: dayMap ?? null },
      uNightMap: { value: nightMap ?? null },
      uSunDir: { value: sunDirection.clone().normalize() },
    }),
    [dayMap, nightMap, sunDirection]
  );

  useEffect(() => {
    if (earthMatRef.current) {
      earthMatRef.current.uniforms.uDayMap.value = dayMap ?? null;
      earthMatRef.current.uniforms.uNightMap.value = nightMap ?? null;
      earthMatRef.current.needsUpdate = true;
    }
  }, [dayMap, nightMap]);

  const atmoUniforms = useMemo(
    () => ({
      uSunDir: { value: sunDirection.clone().normalize() },
    }),
    [sunDirection]
  );

  useFrame((_, delta) => {
    if (!isVisibleRef.current) return;
    const dt = Math.min(delta, 0.05);
    if (spinGroupRef.current) {
      spinGroupRef.current.rotation.y += dt * 0.075;
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += dt * 0.105;
    }
  });

  const tiltRad = (23.4 * Math.PI) / 180;

  return (
    <group position={position} rotation={[0.08, -0.35, tiltRad]}>
      <group ref={spinGroupRef}>
        <mesh
          onPointerOver={(e) => {
            e.stopPropagation();
            onHoverChange(true);
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            onHoverChange(false);
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          <sphereGeometry args={[radius, 96, 96]} />
          {dayMap && nightMap ? (
            <shaderMaterial
              ref={earthMatRef}
              uniforms={uniforms}
              vertexShader={`
                varying vec2 vUv;
                varying vec3 vWorldNormal;
                varying vec3 vViewDir;
                void main() {
                  vUv = uv;
                  vWorldNormal = normalize(mat3(modelMatrix) * normal);
                  vec4 worldPos = modelMatrix * vec4(position, 1.0);
                  vViewDir = normalize(cameraPosition - worldPos.xyz);
                  gl_Position = projectionMatrix * viewMatrix * worldPos;
                }
              `}
              fragmentShader={`
                uniform sampler2D uDayMap;
                uniform sampler2D uNightMap;
                uniform vec3 uSunDir;
                varying vec2 vUv;
                varying vec3 vWorldNormal;
                varying vec3 vViewDir;
                void main() {
                  vec3 normal = normalize(vWorldNormal);
                  vec3 sunDir = normalize(uSunDir);
                  float ndotl = dot(normal, sunDir);
                  float dayMix = smoothstep(-0.16, 0.24, ndotl);
                  float diffuse = max(ndotl, 0.0);

                  vec3 dayTex = texture2D(uDayMap, vUv).rgb;
                  vec3 nightTex = texture2D(uNightMap, vUv).rgb;

                  // Subtle solar specular glinting across oceans near the crescent limb
                  vec3 halfVec = normalize(sunDir + normalize(vViewDir));
                  float spec = pow(max(dot(normal, halfVec), 0.0), 28.0) * smoothstep(0.0, 0.35, ndotl);
                  float oceanMask = clamp((dayTex.b - dayTex.r * 0.75) * 2.2, 0.0, 1.0);

                  vec3 dayCol = dayTex * (0.14 + 1.55 * pow(diffuse, 0.82)) + vec3(1.0, 0.94, 0.82) * spec * oceanMask * 0.45;
                  vec3 twilightTint = vec3(0.95, 0.48, 0.22) * exp(-pow(ndotl * 6.5, 2.0)) * 0.16;
                  vec3 nightCol = nightTex * (1.0 - smoothstep(-0.18, 0.12, ndotl)) * 1.65;
                  vec3 nightSurface = dayTex * 0.045 * (1.0 - dayMix);

                  gl_FragColor = vec4(dayCol * dayMix + twilightTint + nightCol + nightSurface, 1.0);
                  #include <tonemapping_fragment>
                  #include <colorspace_fragment>
                }
              `}
            />
          ) : (
            <meshStandardMaterial
              color="#2e67a0"
              roughness={0.9}
              metalness={0}
            />
          )}
        </mesh>
      </group>

      {/* Clouds Layer */}
      {cloudsMap && (
        <mesh ref={cloudsRef} scale={1.007}>
          <sphereGeometry args={[radius, 72, 72]} />
          <meshStandardMaterial
            map={cloudsMap}
            alphaMap={cloudsMap}
            transparent
            opacity={0.48}
            roughness={1}
            metalness={0}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Strong thin Fresnel atmosphere glow on the lit edge */}
      <mesh scale={1.022}>
        <sphereGeometry args={[radius, 72, 72]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          side={THREE.FrontSide}
          blending={THREE.AdditiveBlending}
          uniforms={atmoUniforms}
          vertexShader={`
            varying vec3 vNormal;
            varying vec3 vViewDir;
            varying vec3 vWorldNormal;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
              vViewDir = normalize(-mvPos.xyz);
              vWorldNormal = normalize(mat3(modelMatrix) * normal);
              gl_Position = projectionMatrix * mvPos;
            }
          `}
          fragmentShader={`
            uniform vec3 uSunDir;
            varying vec3 vNormal;
            varying vec3 vViewDir;
            varying vec3 vWorldNormal;
            void main() {
              float rim = 1.0 - clamp(dot(vNormal, vViewDir), 0.0, 1.0);
              float fresnel = pow(rim, 3.8);
              float sunAlignment = smoothstep(-0.35, 0.55, dot(normalize(vWorldNormal), normalize(uSunDir)));
              float alpha = fresnel * (0.18 + 0.92 * sunAlignment);
              vec3 rimCol = mix(vec3(0.22, 0.52, 0.95), vec3(0.52, 0.84, 1.0), sunAlignment);
              gl_FragColor = vec4(rimCol, alpha);
            }
          `}
        />
      </mesh>
    </group>
  );
}

function ForegroundDriftingAsteroids({
  count,
  isVisibleRef,
}: {
  count: number;
  isVisibleRef: React.MutableRefObject<boolean>;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const rockGeo = useMemo(() => {
    const geo = new THREE.DodecahedronGeometry(0.065, 1);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const n =
        1 +
        0.25 * Math.sin(v.x * 18.0 + v.y * 12.0) +
        0.2 * Math.cos(v.z * 21.0 - v.x * 8.0);
      v.multiplyScalar(n);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  const items = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const s1 = Math.sin(i * 19.31 + 4.7) * 43758.5453;
      const r1 = s1 - Math.floor(s1);
      const s2 = Math.cos(i * 47.11 + 9.2) * 29143.1123;
      const r2 = s2 - Math.floor(s2);
      const s3 = Math.sin(i * 73.59 + 1.8) * 17329.8821;
      const r3 = s3 - Math.floor(s3);
      return {
        phase: (i / count) * Math.PI * 2 + r1 * 0.4,
        speed: 0.045 + r2 * 0.035,
        yOffset: (r3 - 0.5) * 2.8,
        zOffset: 2.5 + r1 * 4.5,
        scale: 0.55 + r2 * 0.85,
        rotSpeed: 0.4 + r3 * 0.9,
      };
    });
  }, [count]);

  useFrame((state) => {
    if (!isVisibleRef.current || !meshRef.current) return;
    const t = state.clock.elapsedTime;
    items.forEach((item, idx) => {
      const a = item.phase + t * item.speed;
      const x = Math.sin(a) * 7.5;
      const y = item.yOffset + Math.cos(a * 0.8) * 0.8;
      const z = item.zOffset + Math.sin(a * 1.2) * 1.8;
      dummy.position.set(x, y, z);
      dummy.rotation.set(t * item.rotSpeed, t * item.rotSpeed * 0.7, idx);
      dummy.scale.set(item.scale, item.scale * 0.8, item.scale * 1.1);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(idx, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[rockGeo, undefined, count]}
      frustumCulled={false}
    >
      <meshStandardMaterial color="#9c9288" roughness={0.95} metalness={0.05} />
    </instancedMesh>
  );
}

function EllipticalComet({
  center,
  semiMajor,
  semiMinor,
  inclination,
  yRotation,
  speed,
  phase,
  sunPos,
  isVisibleRef,
}: {
  center: [number, number, number];
  semiMajor: number;
  semiMinor: number;
  inclination: number;
  yRotation: number;
  speed: number;
  phase: number;
  sunPos: THREE.Vector3;
  isVisibleRef: React.MutableRefObject<boolean>;
}) {
  const headRef = useRef<THREE.Mesh>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const angleRef = useRef(phase);

  const particleCount = 64;

  const { tailGeometry, spreads } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sp: { t: number; ox: number; oy: number; oz: number }[] = [];

    for (let i = 0; i < particleCount; i++) {
      const t = i / (particleCount - 1);
      const s1 = Math.sin(i * 17.13 + phase) * 43758.5453;
      const r1 = s1 - Math.floor(s1) - 0.5;
      const s2 = Math.cos(i * 31.71 + phase) * 23421.6312;
      const r2 = s2 - Math.floor(s2) - 0.5;
      const s3 = Math.sin(i * 53.91 + phase) * 15932.8712;
      const r3 = s3 - Math.floor(s3) - 0.5;

      sp.push({
        t,
        ox: r1 * 0.32 * t,
        oy: r2 * 0.32 * t,
        oz: r3 * 0.32 * t,
      });

      const fade = Math.pow(1 - t, 1.45);
      colors[i * 3] = 0.68 * fade;
      colors[i * 3 + 1] = 0.88 * fade;
      colors[i * 3 + 2] = 1.0 * fade;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return { tailGeometry: geo, spreads: sp };
  }, [phase]);

  const euler = useMemo(
    () => new THREE.Euler(inclination, yRotation, 0),
    [inclination, yRotation]
  );
  const cometPos = useMemo(() => new THREE.Vector3(), []);
  const awayDir = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    if (!isVisibleRef.current) return;
    const dt = Math.min(delta, 0.05);
    angleRef.current += dt * speed;

    const a = angleRef.current;
    cometPos.set(Math.cos(a) * semiMajor, 0, Math.sin(a) * semiMinor);
    cometPos.applyEuler(euler);
    cometPos.x += center[0];
    cometPos.y += center[1];
    cometPos.z += center[2];

    if (headRef.current) {
      headRef.current.position.copy(cometPos);
    }

    // Tail always points directly away from the Sun
    awayDir.subVectors(cometPos, sunPos).normalize();
    const tailLength = 2.6;

    if (pointsRef.current) {
      const posAttr = pointsRef.current.geometry.attributes
        .position as THREE.BufferAttribute;
      for (let i = 0; i < particleCount; i++) {
        const { t, ox, oy, oz } = spreads[i];
        const dist = t * tailLength;
        posAttr.setXYZ(
          i,
          cometPos.x + awayDir.x * dist + ox,
          cometPos.y + awayDir.y * dist + oy,
          cometPos.z + awayDir.z * dist + oz
        );
      }
      posAttr.needsUpdate = true;
    }
  });

  return (
    <group>
      <mesh ref={headRef}>
        <sphereGeometry args={[0.075, 16, 16]} />
        <meshBasicMaterial color="#eff8ff" />
      </mesh>
      <points ref={pointsRef} geometry={tailGeometry} frustumCulled={false}>
        <pointsMaterial
          size={0.13}
          vertexColors
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

function OrbitRing({ radius }: { radius: number }) {
  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      pts.push([Math.cos(a) * radius, 0, Math.sin(a) * radius]);
    }
    return pts;
  }, [radius]);

  return (
    <Line
      points={points}
      color="#ffffff"
      transparent
      opacity={0.08}
      lineWidth={1}
    />
  );
}

function OrreryAsteroidBelt({
  count,
  isVisibleRef,
}: {
  count: number;
  isVisibleRef: React.MutableRefObject<boolean>;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  const rockGeometry = useMemo(() => {
    const geo = new THREE.DodecahedronGeometry(0.055, 1);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const n =
        1 +
        0.24 * Math.sin(v.x * 19.0 + v.y * 11.0) +
        0.18 * Math.cos(v.z * 23.0 - v.x * 7.0);
      v.multiplyScalar(n);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  const matrices = useMemo(() => {
    const dummy = new THREE.Object3D();
    const list: THREE.Matrix4[] = [];
    for (let i = 0; i < count; i++) {
      const s1 = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
      const r1 = s1 - Math.floor(s1);
      const s2 = Math.sin(i * 93.9898 + 19.133) * 24634.6345;
      const r2 = s2 - Math.floor(s2);
      const s3 = Math.sin(i * 45.123 + 63.789) * 19532.1234;
      const r3 = s3 - Math.floor(s3);

      const angle = (i / count) * Math.PI * 2 + r1 * 0.5;
      const radius = 9.5 + r2 * 1.45;
      const y = (r3 - 0.5) * 0.42;

      dummy.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      dummy.rotation.set(r1 * Math.PI, r2 * Math.PI, r3 * Math.PI);
      dummy.scale.set(0.55 + r1 * 0.9, 0.45 + r2 * 0.75, 0.55 + r3 * 0.85);
      dummy.updateMatrix();
      list.push(dummy.matrix.clone());
    }
    return list;
  }, [count]);

  useEffect(() => {
    const inst = meshRef.current;
    if (!inst) return;
    matrices.forEach((mat, idx) => {
      inst.setMatrixAt(idx, mat);
    });
    inst.instanceMatrix.needsUpdate = true;
  }, [matrices]);

  useFrame((_, delta) => {
    if (!isVisibleRef.current || !groupRef.current) return;
    groupRef.current.rotation.y += Math.min(delta, 0.05) * 0.035;
  });

  return (
    <group ref={groupRef}>
      <instancedMesh
        ref={meshRef}
        args={[rockGeometry, undefined, count]}
        frustumCulled={false}
      >
        <meshStandardMaterial color="#8c837a" roughness={1} metalness={0} />
      </instancedMesh>
    </group>
  );
}

interface UnifiedSceneProps {
  textures: Partial<Record<keyof typeof TEXTURE_PATHS, THREE.Texture>>;
  highResEarthDay: THREE.Texture | null;
  viewMode: HeroViewMode;
  selectedBodyId: string | null;
  onSelectBody: (id: string | null) => void;
  isMobile: boolean;
  isVisibleRef: React.MutableRefObject<boolean>;
}

function UnifiedCosmicScene({
  textures,
  highResEarthDay,
  viewMode,
  selectedBodyId,
  onSelectBody,
  isMobile,
  isVisibleRef,
}: UnifiedSceneProps) {
  const { camera } = useThree();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const controlsRef = useRef<OrbitControlsImpl>(null);
  const flyByGroupRefs = useRef<Record<string, THREE.Group | null>>({});
  const flyBySpinRefs = useRef<Record<string, THREE.Group | null>>({});

  // Orrery refs
  const orreryOrbitRefs = useRef<Record<string, THREE.Group | null>>({});
  const orrerySpinRefs = useRef<Record<string, THREE.Group | null>>({});
  const orreryAnglesRef = useRef<Record<string, number>>(
    Object.fromEntries(ORRERY_PLANETS.map((p) => [p.id, p.initialAngle]))
  );
  const orreryMoonRef = useRef<THREE.Group>(null);
  const orreryMoonAngleRef = useRef(0.9);
  const orrerySunRef = useRef<THREE.Mesh>(null);
  const orreryCoronaRef = useRef<THREE.Sprite>(null);

  const coronaTexture = useMemo(() => createCoronaTexture(), []);
  const saturnRingGeo = useMemo(
    () => createSaturnRingGeometry(0.48, 0.92),
    []
  );
  const orrerySaturnRingGeo = useMemo(
    () => createSaturnRingGeometry(0.96, 1.78),
    []
  );

  // Configure SRGB and anisotropy=8 on all textures
  useEffect(() => {
    Object.values(textures).forEach((tex) => {
      if (!tex) return;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
    });
    if (highResEarthDay) {
      highResEarthDay.colorSpace = THREE.SRGBColorSpace;
      highResEarthDay.anisotropy = 8;
      highResEarthDay.minFilter = THREE.LinearMipmapLinearFilter;
      highResEarthDay.magFilter = THREE.LinearFilter;
      highResEarthDay.needsUpdate = true;
    }
  }, [textures, highResEarthDay]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.style.cursor = hoveredId ? "pointer" : "auto";
    }
    return () => {
      if (typeof document !== "undefined") {
        document.body.style.cursor = "auto";
      }
    };
  }, [hoveredId]);

  const activeFlyByBodies = useMemo(
    () =>
      isMobile
        ? FLYBY_BODIES.filter((b) => b.mobileIncluded)
        : FLYBY_BODIES,
    [isMobile]
  );

  // Staggered so one planet passes close to the camera every ~6 seconds
  // Initial offset places Saturn approaching closest camera fly-by immediately
  const flyByOmega = useMemo(
    () => (Math.PI * 2) / (activeFlyByBodies.length * 6.0),
    [activeFlyByBodies.length]
  );
  const flyByTimeRef = useRef(0);

  // Smooth transition state when switching between "cinematic" and "orrery"
  const prevModeRef = useRef<HeroViewMode>(viewMode);
  const modeTransitionRef = useRef(false);

  useEffect(() => {
    if (prevModeRef.current !== viewMode) {
      modeTransitionRef.current = true;
      prevModeRef.current = viewMode;
    }
  }, [viewMode]);

  const earthSunDir = useMemo(
    () => new THREE.Vector3(-0.62, 0.46, 0.63).normalize(),
    []
  );
  const orreryOrigin = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const pointerParallax = useMemo(() => new THREE.Vector2(0, 0), []);
  const desiredCamPos = useMemo(() => new THREE.Vector3(), []);
  const targetWorldPos = useMemo(() => new THREE.Vector3(), []);
  const radialOut = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    if (!isVisibleRef.current) return;
    const dt = Math.min(delta, 0.05);
    const elapsed = state.clock.elapsedTime;
    const controls = controlsRef.current;

    if (viewMode === "cinematic") {
      flyByTimeRef.current += dt;
      const tFly = flyByTimeRef.current;
      const count = activeFlyByBodies.length;

      // Update each fly-by planet along the tilted elliptical path around Earth
      // Passes VERY CLOSE to the camera at theta = 0 (z = +8.85, distance ~2.55 from camera)
      // and goes BEHIND Earth around theta = PI (z = -11.4, occluded by Hero Earth)
      const centerX = isMobile ? 0.9 : 2.1;
      const centerY = isMobile ? -1.15 : -0.85;
      const centerZ = -1.35;
      const radiusX = isMobile ? 3.8 : 5.25;
      const radiusZ = 10.2;

      for (let i = 0; i < count; i++) {
        const body = activeFlyByBodies[i];
        const spacing = (Math.PI * 2) / count;
        const theta = -0.18 + tFly * flyByOmega - i * spacing;

        const x = centerX + Math.sin(theta) * radiusX - Math.cos(theta) * 0.8;
        const y = centerY - Math.sin(theta) * 1.45 + Math.cos(theta) * 0.68;
        const z = centerZ + Math.cos(theta) * radiusZ;

        const grp = flyByGroupRefs.current[body.id];
        if (grp) {
          grp.position.set(x, y, z);
        }

        const spinGrp = flyBySpinRefs.current[body.id];
        if (spinGrp) {
          spinGrp.rotation.y += dt * body.spinSpeed;
        }
      }

      // Gentle mouse parallax on camera target & position
      pointerParallax.x = THREE.MathUtils.lerp(
        pointerParallax.x,
        state.pointer.x * 0.55,
        0.05
      );
      pointerParallax.y = THREE.MathUtils.lerp(
        pointerParallax.y,
        state.pointer.y * 0.35,
        0.05
      );

      if (controls) {
        desiredCamPos.set(
          CINEMATIC_TARGET.x + pointerParallax.x * 0.5,
          CINEMATIC_TARGET.y + pointerParallax.y * 0.4,
          CINEMATIC_TARGET.z
        );
        controls.target.lerp(desiredCamPos, 0.08);

        if (modeTransitionRef.current) {
          camera.position.lerp(CINEMATIC_CAM_POS, 0.08);
          if (camera.position.distanceTo(CINEMATIC_CAM_POS) < 0.25) {
            modeTransitionRef.current = false;
          }
        }
        controls.update();
      }
    } else {
      // ORRERY (Full Solar System) mode updates
      if (orrerySunRef.current) {
        orrerySunRef.current.rotation.y += dt * 0.08;
      }
      if (orreryCoronaRef.current) {
        const s = 6.2 + Math.sin(elapsed * 1.8) * 0.22;
        orreryCoronaRef.current.scale.set(s, s, 1);
        orreryCoronaRef.current.material.rotation = elapsed * 0.06;
      }

      for (const planet of ORRERY_PLANETS) {
        const nextAngle =
          (orreryAnglesRef.current[planet.id] ?? planet.initialAngle) +
          dt * planet.orbitSpeed;
        orreryAnglesRef.current[planet.id] = nextAngle;

        const pGroup = orreryOrbitRefs.current[planet.id];
        if (pGroup) {
          pGroup.position.set(
            Math.cos(nextAngle) * planet.orbitRadius,
            0,
            Math.sin(nextAngle) * planet.orbitRadius
          );
        }

        const sGroup = orrerySpinRefs.current[planet.id];
        if (sGroup) {
          sGroup.rotation.y += dt * planet.spinSpeed;
        }
      }

      orreryMoonAngleRef.current += dt * 1.45;
      if (orreryMoonRef.current) {
        const ma = orreryMoonAngleRef.current;
        orreryMoonRef.current.position.set(
          Math.cos(ma) * 0.85,
          Math.sin(ma * 0.6) * 0.08,
          Math.sin(ma) * 0.85
        );
      }

      if (controls) {
        if (selectedBodyId && selectedBodyId !== "moon") {
          const planet = ORRERY_PLANETS.find((p) => p.id === selectedBodyId);
          const pGroup = orreryOrbitRefs.current[selectedBodyId];
          if (planet && pGroup) {
            pGroup.getWorldPosition(targetWorldPos);
            controls.target.lerp(targetWorldPos, 0.08);
            radialOut.copy(targetWorldPos).normalize();
            const dist = Math.max(planet.size * 4.5, 2.0);
            desiredCamPos
              .copy(targetWorldPos)
              .addScaledVector(radialOut, dist)
              .add(new THREE.Vector3(0, planet.size * 1.6, 0));
            camera.position.lerp(desiredCamPos, 0.06);
          }
        } else {
          controls.target.lerp(orreryOrigin, 0.08);
          if (modeTransitionRef.current) {
            camera.position.lerp(ORRERY_CAM_POS, 0.07);
            if (camera.position.distanceTo(ORRERY_CAM_POS) < 0.35) {
              modeTransitionRef.current = false;
            }
          }
        }
        controls.update();
      }
    }
  });

  const earthDayTexture = highResEarthDay ?? textures.earth;
  // Limit drag rotation to ±25 degrees (0.436 rad) in cinematic view
  const maxTiltRad = (25 * Math.PI) / 180;

  return (
    <group>
      {/* Shared Milky Way Skybox Sphere */}
      <mesh scale={[-1, 1, 1]}>
        <sphereGeometry args={[95, 64, 64]} />
        <meshBasicMaterial
          map={textures.milkyWay ?? null}
          color={textures.milkyWay ? "#666666" : "#070910"}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Ambient 0.08 as required */}
      <ambientLight intensity={0.08} />

      {/* ========================================================= */}
      {/* SCENE 1: CINEMATIC HERO (Default)                         */}
      {/* ========================================================= */}
      <group visible={viewMode === "cinematic"}>
        {/* Strong Sun pointLight from top-left Sun side so lit sides are bright & detailed and opposite sides are real dark night */}
        {viewMode === "cinematic" && (
          <pointLight
            position={[-10.5, 7.2, 11.0]}
            decay={0}
            intensity={5.5}
            color="#fff8eb"
          />
        )}

        {/* Sun behind & above Earth (top-left) with animated corona, god-rays & lens flare */}
        <SunWithLensFlare
          sunMap={textures.sun}
          isVisibleRef={isVisibleRef}
        />

        {/* Hero Earth: 35% smaller and moved further right/down so it never goes behind headline text */}
        <HeroEarth
          radius={isMobile ? 1.4 : 2.11}
          position={isMobile ? [1.25, -2.85, 0] : [4.35, -2.35, 0]}
          dayMap={earthDayTexture}
          nightMap={textures.earthNight}
          cloudsMap={textures.earthClouds}
          sunDirection={earthSunDir}
          isVisibleRef={isVisibleRef}
          onSelect={() => onSelectBody("earth")}
          onHoverChange={(h) =>
            setHoveredId((prev) => (h ? "earth" : prev === "earth" ? null : prev))
          }
        />

        {/* Tilted Elliptical Fly-By Orbit around Earth */}
        {activeFlyByBodies.map((body) => {
          const tiltRad = (body.tiltDeg * Math.PI) / 180;
          const bodyTex = textures[body.textureKey];
          const isHovered = hoveredId === body.id;
          const isSelected = selectedBodyId === body.id;

          return (
            <group
              key={body.id}
              ref={(el) => {
                flyByGroupRefs.current[body.id] = el;
              }}
            >
              {/* Invisible hit sphere for easy clicking while flying by */}
              <mesh
                onPointerOver={(e) => {
                  e.stopPropagation();
                  setHoveredId(body.id);
                }}
                onPointerOut={(e) => {
                  e.stopPropagation();
                  setHoveredId((prev) => (prev === body.id ? null : prev));
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectBody(body.id);
                }}
              >
                <sphereGeometry
                  args={[Math.max(body.cinematicSize * 1.45, 0.42), 16, 16]}
                />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>

              <group rotation={[0.14, 0, tiltRad]}>
                <group
                  ref={(el) => {
                    flyBySpinRefs.current[body.id] = el;
                  }}
                >
                  <mesh>
                    <sphereGeometry args={[body.cinematicSize, 64, 64]} />
                    <meshStandardMaterial
                      map={bodyTex ?? null}
                      color={bodyTex ? "#ffffff" : body.fallbackColor}
                      roughness={0.92}
                      metalness={0}
                    />
                  </mesh>
                </group>

                {/* Saturn's Ring */}
                {body.id === "saturn" && (
                  <mesh
                    geometry={saturnRingGeo}
                    rotation={[Math.PI / 2 + 0.08, 0, 0]}
                  >
                    <meshStandardMaterial
                      map={textures.saturnRing ?? null}
                      color={textures.saturnRing ? "#ffffff" : "#d8c090"}
                      transparent
                      alphaTest={0.01}
                      opacity={0.95}
                      roughness={0.9}
                      metalness={0}
                      side={THREE.DoubleSide}
                    />
                  </mesh>
                )}
              </group>

              {(isHovered || isSelected) && (
                <Html
                  position={[0, body.cinematicSize + 0.38, 0]}
                  center
                  distanceFactor={10}
                  style={{ pointerEvents: "none" }}
                >
                  <div className="px-3 py-1 rounded-full bg-[#07090F]/90 border border-white/25 text-[14px] font-medium text-cosmic-text whitespace-nowrap shadow-lg">
                    {body.name}
                  </div>
                </Html>
              )}
            </group>
          );
        })}

        {/* Foreground drifting asteroids + 1 elliptical comet */}
        <ForegroundDriftingAsteroids
          count={isMobile ? 6 : 12}
          isVisibleRef={isVisibleRef}
        />
        <EllipticalComet
          center={[0.5, 0.8, 1.2]}
          semiMajor={9.5}
          semiMinor={4.2}
          inclination={0.26}
          yRotation={0.42}
          speed={0.22}
          phase={1.1}
          sunPos={CINEMATIC_SUN_POS}
          isVisibleRef={isVisibleRef}
        />
      </group>

      {/* ========================================================= */}
      {/* SCENE 2: FULL SOLAR SYSTEM ORRERY (Same Canvas!)          */}
      {/* ========================================================= */}
      <group visible={viewMode === "orrery"}>
        {viewMode === "orrery" && (
          <pointLight
            position={[0, 0, 0]}
            decay={0}
            intensity={3.4}
            color="#fff6e5"
          />
        )}

        {/* Sun at [0,0,0] */}
        <group position={[0, 0, 0]}>
          <mesh ref={orrerySunRef}>
            <sphereGeometry args={[1.65, 64, 64]} />
            <meshStandardMaterial
              map={textures.sun ?? null}
              emissiveMap={textures.sun ?? null}
              color="#ffcc55"
              emissive="#ff9d2e"
              emissiveIntensity={1.8}
              roughness={1}
              metalness={0}
            />
          </mesh>
          {coronaTexture && (
            <sprite ref={orreryCoronaRef} scale={[6.2, 6.2, 1]}>
              <spriteMaterial
                map={coronaTexture}
                color="#ffb85c"
                transparent
                opacity={0.78}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </sprite>
          )}
        </group>

        {ORRERY_PLANETS.map((planet) => (
          <OrbitRing key={`orbit-${planet.id}`} radius={planet.orbitRadius} />
        ))}

        {ORRERY_PLANETS.map((planet) => {
          const tiltRad = (planet.tiltDeg * Math.PI) / 180;
          const planetTex =
            planet.id === "earth"
              ? earthDayTexture
              : textures[planet.textureKey];
          const isHovered = hoveredId === planet.id;
          const isSelected = selectedBodyId === planet.id;

          return (
            <group
              key={`orrery-${planet.id}`}
              ref={(el) => {
                orreryOrbitRefs.current[planet.id] = el;
              }}
              position={[
                Math.cos(planet.initialAngle) * planet.orbitRadius,
                0,
                Math.sin(planet.initialAngle) * planet.orbitRadius,
              ]}
            >
              <mesh
                onPointerOver={(e) => {
                  e.stopPropagation();
                  setHoveredId(planet.id);
                }}
                onPointerOut={(e) => {
                  e.stopPropagation();
                  setHoveredId((prev) => (prev === planet.id ? null : prev));
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectBody(planet.id);
                }}
              >
                <sphereGeometry
                  args={[Math.max(planet.size * 1.6, 0.48), 16, 16]}
                />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>

              <group rotation={[0, 0, tiltRad]}>
                <group
                  ref={(el) => {
                    orrerySpinRefs.current[planet.id] = el;
                  }}
                >
                  <mesh>
                    <sphereGeometry args={[planet.size, 48, 48]} />
                    <meshStandardMaterial
                      map={planetTex ?? null}
                      color={planetTex ? "#ffffff" : planet.fallbackColor}
                      roughness={1}
                      metalness={0}
                    />
                  </mesh>
                </group>

                {planet.id === "saturn" && (
                  <mesh
                    geometry={orrerySaturnRingGeo}
                    rotation={[Math.PI / 2 + 0.06, 0, 0]}
                  >
                    <meshStandardMaterial
                      map={textures.saturnRing ?? null}
                      color={textures.saturnRing ? "#ffffff" : "#d8c090"}
                      transparent
                      alphaTest={0.01}
                      opacity={0.92}
                      roughness={1}
                      metalness={0}
                      side={THREE.DoubleSide}
                    />
                  </mesh>
                )}
              </group>

              {planet.id === "earth" && (
                <group ref={orreryMoonRef} position={[0.85, 0, 0]}>
                  <mesh>
                    <sphereGeometry args={[0.11, 24, 24]} />
                    <meshStandardMaterial
                      map={textures.moon ?? null}
                      color={textures.moon ? "#ffffff" : "#b5b2ac"}
                      roughness={1}
                      metalness={0}
                    />
                  </mesh>
                </group>
              )}

              {(isHovered || isSelected) && (
                <Html
                  position={[0, planet.size + 0.45, 0]}
                  center
                  distanceFactor={16}
                  style={{ pointerEvents: "none" }}
                >
                  <div className="px-3 py-1 rounded-full bg-[#07090F]/90 border border-white/25 text-[14px] font-medium text-cosmic-text whitespace-nowrap shadow-md">
                    {planet.name}
                  </div>
                </Html>
              )}
            </group>
          );
        })}

        <OrreryAsteroidBelt
          count={isMobile ? 120 : 300}
          isVisibleRef={isVisibleRef}
        />

        <EllipticalComet
          center={[0, 0, 0]}
          semiMajor={16.5}
          semiMinor={6.2}
          inclination={0.28}
          yRotation={0.65}
          speed={0.18}
          phase={0.7}
          sunPos={orreryOrigin}
          isVisibleRef={isVisibleRef}
        />
        <EllipticalComet
          center={[0, 0, 0]}
          semiMajor={19.0}
          semiMinor={7.4}
          inclination={-0.34}
          yRotation={2.45}
          speed={0.14}
          phase={3.8}
          sunPos={orreryOrigin}
          isVisibleRef={isVisibleRef}
        />
      </group>

      {/* Shared OrbitControls: limited ±25° in cinematic mode, full 360° in orrery mode */}
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableZoom={viewMode === "orrery"}
        enableDamping
        dampingFactor={0.05}
        minDistance={viewMode === "orrery" ? 2.2 : 9.5}
        maxDistance={viewMode === "orrery" ? 46 : 13.5}
        minAzimuthAngle={viewMode === "cinematic" ? -maxTiltRad : -Infinity}
        maxAzimuthAngle={viewMode === "cinematic" ? maxTiltRad : Infinity}
        minPolarAngle={
          viewMode === "cinematic" ? Math.PI / 2 - maxTiltRad : 0.15
        }
        maxPolarAngle={
          viewMode === "cinematic" ? Math.PI / 2 + maxTiltRad : Math.PI - 0.15
        }
        autoRotate={viewMode === "orrery" && !selectedBodyId}
        autoRotateSpeed={0.28}
      />

      {/* Postprocessing: Desktop gets subtle DepthOfField + Bloom (0.85) + Vignette + Noise (0.03); Mobile gets Bloom only */}
      {isMobile ? (
        <EffectComposer multisampling={0}>
          <Bloom luminanceThreshold={0.85} mipmapBlur intensity={0.95} />
        </EffectComposer>
      ) : (
        <EffectComposer multisampling={0}>
          <DepthOfField
            focusDistance={0.048}
            focalLength={0.025}
            bokehScale={0.55}
          />
          <Bloom luminanceThreshold={0.85} mipmapBlur intensity={1.15} />
          <Vignette eskil={false} offset={0.18} darkness={0.58} />
          <Noise opacity={0.03} />
        </EffectComposer>
      )}
    </group>
  );
}

function TexturedUnifiedScene(props: Omit<UnifiedSceneProps, "textures">) {
  const textures = useTexture(TEXTURE_PATHS);
  return <UnifiedCosmicScene {...props} textures={textures} />;
}

function StaticHeroPlaceholder() {
  return (
    <group>
      <ambientLight intensity={0.08} />
      <pointLight position={[-10.5, 7.2, 11.0]} decay={0} intensity={5.5} />
      <mesh position={[4.35, -2.35, 0]}>
        <sphereGeometry args={[2.11, 32, 32]} />
        <meshStandardMaterial color="#1f4e7a" roughness={0.9} />
      </mesh>
    </group>
  );
}

export interface CinematicHeroProps {
  viewMode?: HeroViewMode;
  onViewModeChange?: (mode: HeroViewMode) => void;
}

export default function CinematicHero({
  viewMode: controlledViewMode,
  onViewModeChange,
}: CinematicHeroProps = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisibleRef = useRef(true);
  const [internalViewMode, setInternalViewMode] =
    useState<HeroViewMode>("cinematic");
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [highResEarthDay, setHighResEarthDay] =
    useState<THREE.Texture | null>(null);

  const viewMode = controlledViewMode ?? internalViewMode;
  const handleSetViewMode = (next: HeroViewMode) => {
    setSelectedBodyId(null);
    if (onViewModeChange) {
      onViewModeChange(next);
    } else {
      setInternalViewMode(next);
    }
  };

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Automatically upgrade Earth texture to 8K/4K if present in public/textures/earth-8k.jpg or earth-4k.jpg
  useEffect(() => {
    let active = true;
    const candidates = ["/textures/earth-8k.jpg", "/textures/earth-4k.jpg"];

    async function probeHighResEarth() {
      for (const candidateUrl of candidates) {
        try {
          const res = await fetch(candidateUrl, { method: "HEAD" });
          if (res.ok && active) {
            const loader = new THREE.TextureLoader();
            loader.load(candidateUrl, (tex) => {
              if (!active) return;
              tex.colorSpace = THREE.SRGBColorSpace;
              tex.anisotropy = 8;
              tex.needsUpdate = true;
              setHighResEarthDay(tex);
            });
            break;
          }
        } catch {
          // Ignore and keep 2K preloaded earth.jpg
        }
      }
    }

    probeHighResEarth();
    return () => {
      active = false;
    };
  }, []);

  // Pause animation via ref inside useFrame when scrolled out of view (never unmount Canvas)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.01 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const selectedBody = useMemo(
    () => ALL_FACT_BODIES.find((b) => b.id === selectedBodyId) ?? null,
    [selectedBodyId]
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none overflow-hidden bg-[#05070c]"
    >
      {/* ONE Canvas that is never remounted */}
      <Canvas
        frameloop="always"
        dpr={[1, 2]}
        camera={{
          position: [
            CINEMATIC_CAM_POS.x,
            CINEMATIC_CAM_POS.y,
            CINEMATIC_CAM_POS.z,
          ],
          fov: 40,
          near: 0.1,
          far: 240,
        }}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.3,
        }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.3;

          const canvas = gl.domElement;
          const handleContextLost = (event: Event) => {
            event.preventDefault();
            setContextLost(true);
          };
          const handleContextRestored = () => {
            setContextLost(false);
          };

          canvas.addEventListener("webglcontextlost", handleContextLost, false);
          canvas.addEventListener(
            "webglcontextrestored",
            handleContextRestored,
            false
          );
        }}
      >
        <TextureErrorBoundary
          fallback={
            <UnifiedCosmicScene
              textures={{}}
              highResEarthDay={highResEarthDay}
              viewMode={viewMode}
              selectedBodyId={selectedBodyId}
              onSelectBody={setSelectedBodyId}
              isMobile={isMobile}
              isVisibleRef={isVisibleRef}
            />
          }
        >
          <Suspense fallback={<StaticHeroPlaceholder />}>
            <TexturedUnifiedScene
              highResEarthDay={highResEarthDay}
              viewMode={viewMode}
              selectedBodyId={selectedBodyId}
              onSelectBody={setSelectedBodyId}
              isMobile={isMobile}
              isVisibleRef={isVisibleRef}
            />
          </Suspense>
        </TextureErrorBoundary>
      </Canvas>

      {contextLost && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#07090F]/85 text-base text-cosmic-text">
          Restoring 3D view...
        </div>
      )}

      {/* "Back" button when viewing the Full Solar System orrery */}
      {viewMode === "orrery" && (
        <div className="absolute top-6 left-6 z-30 flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSetViewMode("cinematic")}
            className="glass px-5 py-2.5 rounded-full text-[17px] font-medium text-cosmic-text hover:bg-white/15 border border-white/20 transition-all shadow-lg"
          >
            Back
          </button>
          <span className="glass px-4 py-2 rounded-full text-[15px] text-cosmic-muted hidden sm:inline-block">
            Drag 360° to orbit · Scroll to zoom · Click any planet
          </span>
        </div>
      )}

      {/* Glass Fact Card when a planet is clicked (380px wide, title in Cinzel 28px, text 16px) */}
      {selectedBody && (
        <div
          className="
            glass absolute right-6 bottom-6 md:top-1/2 md:bottom-auto md:-translate-y-1/2
            z-30 w-[380px] max-w-[calc(100vw-2.5rem)]
            rounded-2xl bg-[#0A0E1A]/90 backdrop-blur-xl
            border border-white/20 p-6 shadow-2xl text-cosmic-text
          "
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <h3 className="font-heading text-[28px] leading-tight tracking-[0.02em] text-cosmic-text">
                {selectedBody.name}
              </h3>
              <p className="text-[14px] text-pastel-sky mt-0.5">
                {selectedBody.subtitle}
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-white/[0.07] border border-white/15 text-[14px] text-cosmic-muted shrink-0">
              Tilt <span className="font-mono">{selectedBody.tiltDeg}°</span>
            </span>
          </div>

          <ul className="space-y-2.5 text-[16px] leading-[1.6] text-cosmic-text/90 my-4">
            {selectedBody.facts.map((fact, idx) => (
              <li key={idx} className="flex gap-2.5">
                <span className="text-[#F5A623] select-none">•</span>
                <span>{fact}</span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => setSelectedBodyId(null)}
            className="
              w-full py-2.5 px-4 rounded-xl text-[17px] font-medium
              bg-white/10 hover:bg-white/18 text-cosmic-text
              border border-white/20 transition-colors
            "
          >
            {viewMode === "orrery" ? "Back to the system" : "Close card"}
          </button>
        </div>
      )}
    </div>
  );
}
