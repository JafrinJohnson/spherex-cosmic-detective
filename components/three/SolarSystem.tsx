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
import { EffectComposer, Bloom } from "@react-three/postprocessing";
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

// Preload every texture at module level so planets never suspend individually or flicker
Object.values(TEXTURE_PATHS).forEach((url) => {
  useTexture.preload(url);
});

export interface PlanetConfig {
  id: Exclude<
    keyof typeof TEXTURE_PATHS,
    "sun" | "earthNight" | "earthClouds" | "moon" | "saturnRing" | "milkyWay"
  >;
  name: string;
  orbitRadius: number;
  size: number;
  orbitSpeed: number;
  spinSpeed: number;
  tiltDeg: number;
  initialAngle: number;
  fallbackColor: string;
  facts: [string, string];
}

const PLANETS: PlanetConfig[] = [
  {
    id: "mercury",
    name: "Mercury",
    orbitRadius: 3.4,
    size: 0.22,
    orbitSpeed: 0.42,
    spinSpeed: 0.18,
    tiltDeg: 0.03,
    initialAngle: 0.8,
    fallbackColor: "#8c8680",
    facts: [
      "Closest planet to the Sun, completing an orbit in 88 Earth days.",
      "Surface temperatures swing from -180°C at night to 430°C at noon.",
    ],
  },
  {
    id: "venus",
    name: "Venus",
    orbitRadius: 4.8,
    size: 0.36,
    orbitSpeed: 0.31,
    spinSpeed: -0.1,
    tiltDeg: 177.4,
    initialAngle: 2.3,
    fallbackColor: "#d9b37c",
    facts: [
      "Spins backwards with an axial tilt of 177.4 degrees.",
      "Thick carbon dioxide clouds trap heat in a runaway greenhouse effect.",
    ],
  },
  {
    id: "earth",
    name: "Earth",
    orbitRadius: 6.5,
    size: 0.4,
    orbitSpeed: 0.24,
    spinSpeed: 0.55,
    tiltDeg: 23.4,
    initialAngle: 4.1,
    fallbackColor: "#2e67a0",
    facts: [
      "Tilted at 23.4 degrees, giving our world its changing seasons.",
      "SPHEREx orbits Earth in low polar orbit to map the entire infrared sky.",
    ],
  },
  {
    id: "mars",
    name: "Mars",
    orbitRadius: 8.3,
    size: 0.29,
    orbitSpeed: 0.19,
    spinSpeed: 0.52,
    tiltDeg: 25.2,
    initialAngle: 5.4,
    fallbackColor: "#c25b38",
    facts: [
      "Iron oxide dust gives the Red Planet its rust colour.",
      "Home to Olympus Mons, the largest volcano in the solar system.",
    ],
  },
  {
    id: "jupiter",
    name: "Jupiter",
    orbitRadius: 12.2,
    size: 0.92,
    orbitSpeed: 0.11,
    spinSpeed: 1.1,
    tiltDeg: 3.1,
    initialAngle: 1.2,
    fallbackColor: "#c89b6e",
    facts: [
      "Largest planet in the solar system, with a day lasting under 10 hours.",
      "Banded ammonia clouds and the Great Red Spot churn across its atmosphere.",
    ],
  },
  {
    id: "saturn",
    name: "Saturn",
    orbitRadius: 15.6,
    size: 0.76,
    orbitSpeed: 0.08,
    spinSpeed: 0.95,
    tiltDeg: 26.7,
    initialAngle: 3.5,
    fallbackColor: "#dcc08e",
    facts: [
      "Ring system spans 282,000 km across but is often only tens of metres thick.",
      "Tilted at 26.7 degrees, revealing changing ring angles over its 29-year orbit.",
    ],
  },
  {
    id: "uranus",
    name: "Uranus",
    orbitRadius: 18.8,
    size: 0.52,
    orbitSpeed: 0.055,
    spinSpeed: -0.7,
    tiltDeg: 98.0,
    initialAngle: 5.0,
    fallbackColor: "#7fc8d6",
    facts: [
      "Rotates on its side with an extreme 98-degree axial tilt.",
      "Methane in the upper atmosphere absorbs red light, giving a pale cyan hue.",
    ],
  },
  {
    id: "neptune",
    name: "Neptune",
    orbitRadius: 21.8,
    size: 0.5,
    orbitSpeed: 0.042,
    spinSpeed: 0.75,
    tiltDeg: 28.3,
    initialAngle: 0.3,
    fallbackColor: "#3b66c4",
    facts: [
      "Supersonic winds reach over 2,000 km/h in its deep azure atmosphere.",
      "Orbits the Sun once every 165 Earth years at 30 astronomical units.",
    ],
  },
];

// Camera angled 25 degrees above the orbital plane
const CAM_DIST = 26;
const CAM_ANGLE_RAD = (25 * Math.PI) / 180;
const DEFAULT_CAM_POS = new THREE.Vector3(
  0,
  Math.sin(CAM_ANGLE_RAD) * CAM_DIST,
  Math.cos(CAM_ANGLE_RAD) * CAM_DIST
);

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
  const grad = ctx.createRadialGradient(half, half, 8, half, half, half);
  grad.addColorStop(0, "rgba(255, 250, 220, 0.95)");
  grad.addColorStop(0.22, "rgba(255, 195, 95, 0.55)");
  grad.addColorStop(0.5, "rgba(255, 130, 35, 0.18)");
  grad.addColorStop(1, "rgba(255, 90, 10, 0)");

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

function EarthShaderSphere({
  size,
  dayMap,
  nightMap,
  cloudsMap,
  fallbackColor,
  isVisibleRef,
}: {
  size: number;
  dayMap?: THREE.Texture;
  nightMap?: THREE.Texture;
  cloudsMap?: THREE.Texture;
  fallbackColor: string;
  isVisibleRef: React.MutableRefObject<boolean>;
}) {
  const cloudsRef = useRef<THREE.Mesh>(null);
  const earthMatRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uDayMap: { value: dayMap ?? null },
      uNightMap: { value: nightMap ?? null },
    }),
    [dayMap, nightMap]
  );

  useFrame((_, delta) => {
    if (!isVisibleRef.current) return;
    const dt = Math.min(delta, 0.05);
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += dt * 0.14;
    }
  });

  return (
    <group>
      {/* Earth Day/Night blended sphere */}
      <mesh>
        <sphereGeometry args={[size, 48, 48]} />
        {dayMap && nightMap ? (
          <shaderMaterial
            ref={earthMatRef}
            uniforms={uniforms}
            vertexShader={`
              varying vec2 vUv;
              varying vec3 vWorldNormal;
              varying vec3 vWorldPos;
              void main() {
                vUv = uv;
                vWorldNormal = normalize(mat3(modelMatrix) * normal);
                vec4 worldPos = modelMatrix * vec4(position, 1.0);
                vWorldPos = worldPos.xyz;
                gl_Position = projectionMatrix * viewMatrix * worldPos;
              }
            `}
            fragmentShader={`
              uniform sampler2D uDayMap;
              uniform sampler2D uNightMap;
              varying vec2 vUv;
              varying vec3 vWorldNormal;
              varying vec3 vWorldPos;
              void main() {
                vec3 normal = normalize(vWorldNormal);
                vec3 sunDir = normalize(-vWorldPos);
                float ndotl = dot(normal, sunDir);
                float dayMix = smoothstep(-0.14, 0.22, ndotl);
                float diffuse = max(ndotl, 0.0);

                vec3 dayTex = texture2D(uDayMap, vUv).rgb;
                vec3 nightTex = texture2D(uNightMap, vUv).rgb;

                vec3 dayCol = dayTex * (0.04 + 0.96 * diffuse);
                vec3 nightCol = nightTex * (1.0 - smoothstep(-0.2, 0.08, ndotl)) * 1.4;
                vec3 darkSideAmbient = dayTex * 0.025 * (1.0 - dayMix);

                gl_FragColor = vec4(dayCol * dayMix + nightCol + darkSideAmbient, 1.0);
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
              }
            `}
          />
        ) : (
          <meshStandardMaterial
            color={fallbackColor}
            roughness={1}
            metalness={0}
          />
        )}
      </mesh>

      {/* Slightly faster rotating clouds layer */}
      {cloudsMap && (
        <mesh ref={cloudsRef} scale={1.008}>
          <sphereGeometry args={[size, 48, 48]} />
          <meshStandardMaterial
            map={cloudsMap}
            alphaMap={cloudsMap}
            transparent
            opacity={0.42}
            roughness={1}
            metalness={0}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Thin realistic atmosphere rim (fresnel, soft blue, opacity 0.35, scale 1.02) */}
      <mesh scale={1.02}>
        <sphereGeometry args={[size, 48, 48]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          side={THREE.FrontSide}
          blending={THREE.AdditiveBlending}
          vertexShader={`
            varying vec3 vNormal;
            varying vec3 vViewDir;
            varying vec3 vWorldNormal;
            varying vec3 vWorldPos;
            void main() {
              vNormal = normalize(normalMatrix * normal);
              vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
              vViewDir = normalize(-mvPos.xyz);
              vWorldNormal = normalize(mat3(modelMatrix) * normal);
              vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
              gl_Position = projectionMatrix * mvPos;
            }
          `}
          fragmentShader={`
            varying vec3 vNormal;
            varying vec3 vViewDir;
            varying vec3 vWorldNormal;
            varying vec3 vWorldPos;
            void main() {
              float fresnel = pow(1.0 - clamp(dot(vNormal, vViewDir), 0.0, 1.0), 3.6);
              vec3 sunDir = normalize(-vWorldPos);
              float sunSide = smoothstep(-0.35, 0.35, dot(normalize(vWorldNormal), sunDir));
              float alpha = fresnel * 0.35 * (0.25 + 0.75 * sunSide);
              gl_FragColor = vec4(0.38, 0.68, 1.0, alpha);
            }
          `}
        />
      </mesh>
    </group>
  );
}

function AsteroidBelt({
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
      // Deterministic pseudo-random distribution between Mars (8.3) and Jupiter (12.2)
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
      const sx = 0.55 + r1 * 0.9;
      const sy = 0.45 + r2 * 0.75;
      const sz = 0.55 + r3 * 0.85;
      dummy.scale.set(sx, sy, sz);
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

interface CometProps {
  semiMajor: number;
  semiMinor: number;
  focusOffset: number;
  inclination: number;
  yRotation: number;
  speed: number;
  phase: number;
  isVisibleRef: React.MutableRefObject<boolean>;
}

function Comet({
  semiMajor,
  semiMinor,
  focusOffset,
  inclination,
  yRotation,
  speed,
  phase,
  isVisibleRef,
}: CometProps) {
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
        ox: r1 * 0.36 * t,
        oy: r2 * 0.36 * t,
        oz: r3 * 0.36 * t,
      });

      const fade = Math.pow(1 - t, 1.5);
      // White-blue tail colour
      colors[i * 3] = 0.65 * fade;
      colors[i * 3 + 1] = 0.85 * fade;
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
    cometPos.set(
      Math.cos(a) * semiMajor - focusOffset,
      0,
      Math.sin(a) * semiMinor
    );
    cometPos.applyEuler(euler);

    if (headRef.current) {
      headRef.current.position.copy(cometPos);
    }

    // Tail always points directly away from the Sun at [0, 0, 0]
    awayDir.copy(cometPos).normalize();
    const tailLength = 2.8;

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
        <meshBasicMaterial color="#e8f4ff" />
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

interface CoreSceneProps {
  textures: Partial<Record<keyof typeof TEXTURE_PATHS, THREE.Texture>>;
  selectedPlanetId: string | null;
  onSelectPlanet: (id: string | null) => void;
  isMobile: boolean;
  isVisibleRef: React.MutableRefObject<boolean>;
}

function SolarSystemCore({
  textures,
  selectedPlanetId,
  onSelectPlanet,
  isMobile,
  isVisibleRef,
}: CoreSceneProps) {
  const { gl, camera } = useThree();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const controlsRef = useRef<OrbitControlsImpl>(null);
  const coronaRef = useRef<THREE.Sprite>(null);
  const sunMeshRef = useRef<THREE.Mesh>(null);
  const moonOrbitRef = useRef<THREE.Group>(null);
  const isUserInteractingRef = useRef(false);
  const isReturningToSystemRef = useRef(false);
  const prevSelectedRef = useRef<string | null>(null);

  const orbitRefs = useRef<Record<string, THREE.Group | null>>({});
  const spinRefs = useRef<Record<string, THREE.Group | null>>({});
  const anglesRef = useRef<Record<string, number>>(
    Object.fromEntries(PLANETS.map((p) => [p.id, p.initialAngle]))
  );
  const moonAngleRef = useRef(0.9);

  const coronaTexture = useMemo(() => createCoronaTexture(), []);
  const saturnRingGeo = useMemo(
    () => createSaturnRingGeometry(0.96, 1.78),
    []
  );

  // Configure colour space and anisotropy on all loaded textures
  useEffect(() => {
    const maxAniso = Math.min(8, gl.capabilities.getMaxAnisotropy());
    Object.values(textures).forEach((tex) => {
      if (!tex) return;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = maxAniso;
      tex.needsUpdate = true;
    });
  }, [textures, gl]);

  // Track when user clicks "Back to the system" so camera smoothly glides back
  useEffect(() => {
    if (prevSelectedRef.current && !selectedPlanetId) {
      isReturningToSystemRef.current = true;
    }
    if (selectedPlanetId) {
      isReturningToSystemRef.current = false;
    }
    prevSelectedRef.current = selectedPlanetId;
  }, [selectedPlanetId]);

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

  const targetWorldPos = useMemo(() => new THREE.Vector3(), []);
  const desiredCamPos = useMemo(() => new THREE.Vector3(), []);
  const radialOut = useMemo(() => new THREE.Vector3(), []);
  const originVec = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  useFrame((state, delta) => {
    if (!isVisibleRef.current) return;
    const dt = Math.min(delta, 0.05);
    const elapsed = state.clock.elapsedTime;

    // Spin the Sun and pulse its corona
    if (sunMeshRef.current) {
      sunMeshRef.current.rotation.y += dt * 0.08;
    }
    if (coronaRef.current) {
      const s = 6.2 + Math.sin(elapsed * 1.8) * 0.22;
      coronaRef.current.scale.set(s, s, 1);
      coronaRef.current.material.rotation = elapsed * 0.06;
    }

    // Advance all 8 planets along circular orbits and spin them on their tilted axes
    for (const planet of PLANETS) {
      const nextAngle =
        (anglesRef.current[planet.id] ?? planet.initialAngle) +
        dt * planet.orbitSpeed;
      anglesRef.current[planet.id] = nextAngle;

      const pGroup = orbitRefs.current[planet.id];
      if (pGroup) {
        pGroup.position.set(
          Math.cos(nextAngle) * planet.orbitRadius,
          0,
          Math.sin(nextAngle) * planet.orbitRadius
        );
      }

      const sGroup = spinRefs.current[planet.id];
      if (sGroup) {
        sGroup.rotation.y += dt * planet.spinSpeed;
      }
    }

    // Moon orbits Earth
    moonAngleRef.current += dt * 1.45;
    if (moonOrbitRef.current) {
      const ma = moonAngleRef.current;
      moonOrbitRef.current.position.set(
        Math.cos(ma) * 0.85,
        Math.sin(ma * 0.6) * 0.08,
        Math.sin(ma) * 0.85
      );
    }

    // Camera glide to selected planet or back to the system
    const controls = controlsRef.current;
    if (controls) {
      if (selectedPlanetId) {
        const planet = PLANETS.find((p) => p.id === selectedPlanetId);
        const pGroup = orbitRefs.current[selectedPlanetId];
        if (planet && pGroup) {
          pGroup.getWorldPosition(targetWorldPos);
          controls.target.lerp(targetWorldPos, 0.08);

          if (!isUserInteractingRef.current) {
            radialOut.copy(targetWorldPos).normalize();
            const dist = Math.max(planet.size * 4.5, 1.8);
            desiredCamPos
              .copy(targetWorldPos)
              .addScaledVector(radialOut, dist)
              .add(new THREE.Vector3(0, planet.size * 1.6, 0));
            camera.position.lerp(desiredCamPos, 0.06);
          }
        }
      } else {
        controls.target.lerp(originVec, 0.08);
        if (isReturningToSystemRef.current && !isUserInteractingRef.current) {
          camera.position.lerp(DEFAULT_CAM_POS, 0.06);
          if (camera.position.distanceTo(DEFAULT_CAM_POS) < 0.25) {
            isReturningToSystemRef.current = false;
          }
        }
      }
      controls.update();
    }
  });

  return (
    <group>
      {/* Background: huge inverted sphere with milky-way.jpg (dim, 0.35) */}
      <mesh scale={[-1, 1, 1]}>
        <sphereGeometry args={[95, 64, 64]} />
        <meshBasicMaterial
          map={textures.milkyWay ?? null}
          color={textures.milkyWay ? "#595959" : "#070910"}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* The ONLY strong light at the Sun + very low ambient so every planet has a dark night side */}
      <ambientLight intensity={0.04} />
      <pointLight
        position={[0, 0, 0]}
        decay={0}
        intensity={3}
        color="#fff6e5"
      />

      {/* SUN in the centre: emissive textured sphere + soft animated corona sprite */}
      <group position={[0, 0, 0]}>
        <mesh ref={sunMeshRef}>
          <sphereGeometry args={[1.65, 64, 64]} />
          <meshStandardMaterial
            map={textures.sun ?? null}
            emissiveMap={textures.sun ?? null}
            color="#ffcc55"
            emissive="#ff9d2e"
            emissiveIntensity={1.65}
            roughness={1}
            metalness={0}
          />
        </mesh>
        {coronaTexture && (
          <sprite ref={coronaRef} scale={[6.2, 6.2, 1]}>
            <spriteMaterial
              map={coronaTexture}
              color="#ffb85c"
              transparent
              opacity={0.75}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </sprite>
        )}
      </group>

      {/* Faint thin orbit lines (white, opacity 0.08) */}
      {PLANETS.map((planet) => (
        <OrbitRing key={`orbit-${planet.id}`} radius={planet.orbitRadius} />
      ))}

      {/* 8 Planets on circular orbits */}
      {PLANETS.map((planet) => {
        const tiltRad = (planet.tiltDeg * Math.PI) / 180;
        const isHovered = hoveredId === planet.id;
        const isSelected = selectedPlanetId === planet.id;
        const planetTex = textures[planet.id];

        return (
          <group
            key={planet.id}
            ref={(el) => {
              orbitRefs.current[planet.id] = el;
            }}
            position={[
              Math.cos(planet.initialAngle) * planet.orbitRadius,
              0,
              Math.sin(planet.initialAngle) * planet.orbitRadius,
            ]}
          >
            {/* Invisible hit sphere for comfortable hover & click on smaller planets */}
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
                onSelectPlanet(planet.id);
              }}
            >
              <sphereGeometry args={[Math.max(planet.size * 1.6, 0.48), 16, 16]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {/* Axial tilt group */}
            <group rotation={[0, 0, tiltRad]}>
              <group
                ref={(el) => {
                  spinRefs.current[planet.id] = el;
                }}
              >
                {planet.id === "earth" ? (
                  <EarthShaderSphere
                    size={planet.size}
                    dayMap={textures.earth}
                    nightMap={textures.earthNight}
                    cloudsMap={textures.earthClouds}
                    fallbackColor={planet.fallbackColor}
                    isVisibleRef={isVisibleRef}
                  />
                ) : (
                  <mesh>
                    <sphereGeometry args={[planet.size, 48, 48]} />
                    <meshStandardMaterial
                      map={planetTex ?? null}
                      color={planetTex ? "#ffffff" : planet.fallbackColor}
                      roughness={1}
                      metalness={0}
                    />
                  </mesh>
                )}
              </group>

              {/* Saturn Ring: RingGeometry with remapped UVs + saturn-ring.png alpha, double-sided, slight tilt */}
              {planet.id === "saturn" && (
                <mesh
                  geometry={saturnRingGeo}
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

            {/* Moon orbiting Earth */}
            {planet.id === "earth" && (
              <group ref={moonOrbitRef} position={[0.85, 0, 0]}>
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

            {/* Hover label: small clean label with planet name */}
            {(isHovered || isSelected) && (
              <Html
                position={[0, planet.size + 0.45, 0]}
                center
                distanceFactor={16}
                style={{ pointerEvents: "none" }}
              >
                <div className="px-2.5 py-0.5 rounded bg-[#07090F]/90 border border-white/20 text-xs text-slate-100 whitespace-nowrap shadow-md">
                  {planet.name}
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {/* Asteroid belt between Mars and Jupiter: 300 noise-displaced rocks (120 on mobile) */}
      <AsteroidBelt count={isMobile ? 120 : 300} isVisibleRef={isVisibleRef} />

      {/* 2 Comets on long elliptical paths with tails pointing away from the Sun */}
      <Comet
        semiMajor={16.5}
        semiMinor={6.2}
        focusOffset={11.5}
        inclination={0.28}
        yRotation={0.65}
        speed={0.18}
        phase={0.7}
        isVisibleRef={isVisibleRef}
      />
      <Comet
        semiMajor={19.0}
        semiMinor={7.4}
        focusOffset={13.0}
        inclination={-0.34}
        yRotation={2.45}
        speed={0.14}
        phase={3.8}
        isVisibleRef={isVisibleRef}
      />

      {/* OrbitControls: 360 rotate, zoom limits, no pan, damping, slow autoRotate that stops on interaction */}
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableDamping
        dampingFactor={0.05}
        minDistance={2.2}
        maxDistance={46}
        autoRotate={!selectedPlanetId && !isUserInteractingRef.current}
        autoRotateSpeed={0.28}
        onStart={() => {
          isUserInteractingRef.current = true;
          isReturningToSystemRef.current = false;
        }}
      />

      {/* Bloom ONLY on very bright things (luminanceThreshold 0.9) on desktop */}
      {!isMobile && (
        <EffectComposer multisampling={0}>
          <Bloom
            luminanceThreshold={0.9}
            mipmapBlur
            intensity={0.85}
          />
        </EffectComposer>
      )}
    </group>
  );
}

function TexturedSolarSystem(props: Omit<CoreSceneProps, "textures">) {
  const textures = useTexture(TEXTURE_PATHS);
  return <SolarSystemCore {...props} textures={textures} />;
}

function StaticSolarSystemPlaceholder() {
  return (
    <group>
      <ambientLight intensity={0.04} />
      <pointLight position={[0, 0, 0]} decay={0} intensity={3} color="#fff6e5" />
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1.65, 32, 32]} />
        <meshBasicMaterial color="#ffb347" />
      </mesh>
    </group>
  );
}

export default function SolarSystem() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisibleRef = useRef(true);
  const [selectedPlanetId, setSelectedPlanetId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  // Detect mobile viewport for asteroid count & bloom toggle
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Pause via ref flag inside useFrame when hero is scrolled out of view (never unmount Canvas)
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

  const selectedPlanet = useMemo(
    () => PLANETS.find((p) => p.id === selectedPlanetId) ?? null,
    [selectedPlanetId]
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
          position: [DEFAULT_CAM_POS.x, DEFAULT_CAM_POS.y, DEFAULT_CAM_POS.z],
          fov: 42,
          near: 0.1,
          far: 220,
        }}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.1;

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
            <SolarSystemCore
              textures={{}}
              selectedPlanetId={selectedPlanetId}
              onSelectPlanet={setSelectedPlanetId}
              isMobile={isMobile}
              isVisibleRef={isVisibleRef}
            />
          }
        >
          <Suspense fallback={<StaticSolarSystemPlaceholder />}>
            <TexturedSolarSystem
              selectedPlanetId={selectedPlanetId}
              onSelectPlanet={setSelectedPlanetId}
              isMobile={isMobile}
              isVisibleRef={isVisibleRef}
            />
          </Suspense>
        </TextureErrorBoundary>
      </Canvas>

      {contextLost && (
        <div className="
          absolute inset-0 z-30 flex items-center justify-center
          bg-[#07090F]/85 text-sm text-slate-300
        ">
          Restoring 3D view...
        </div>
      )}

      {/* Side card when a planet is clicked: name + 2 facts + "Back to the system" */}
      {selectedPlanet && (
        <div
          className="
            absolute right-6 bottom-6 md:top-1/2 md:bottom-auto md:-translate-y-1/2
            z-30 w-80 max-w-[calc(100vw-3rem)]
            rounded-xl bg-[#0A0E1A]/90 backdrop-blur-md
            border border-white/15 p-5 shadow-2xl text-slate-100
          "
        >
          <div className="flex items-baseline justify-between gap-2 mb-3">
            <h3 className="text-2xl font-medium tracking-tight text-white">
              {selectedPlanet.name}
            </h3>
            <span className="text-xs text-slate-400">
              Tilt <span className="font-mono">{selectedPlanet.tiltDeg}°</span>
            </span>
          </div>
          <ul className="space-y-2 text-sm text-slate-300 leading-relaxed mb-4">
            {selectedPlanet.facts.map((fact, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="text-[#F5A623] select-none">•</span>
                <span>{fact}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setSelectedPlanetId(null)}
            className="
              w-full py-2 px-3 rounded-lg text-sm font-medium
              bg-white/10 hover:bg-white/15 text-white
              border border-white/15 transition-colors
            "
          >
            Back to the system
          </button>
        </div>
      )}
    </div>
  );
}
