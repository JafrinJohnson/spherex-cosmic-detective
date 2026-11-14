"use client";

import React, {
  Suspense,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Billboard, Text, Line, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { VOYAGE_OBJECTS, type CelestialObjectData } from "@/data/objects";
import type { FlightHUDState, TouchInputState } from "./types";

const TEXTURE_PATHS = {
  sun: "/textures/sun.jpg",
  mercury: "/textures/mercury.jpg",
  venus: "/textures/venus.jpg",
  earth: "/textures/earth.jpg",
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

// Module-level preloading so textures never suspend individually
if (typeof window !== "undefined") {
  Object.values(TEXTURE_PATHS).forEach((url) => {
    try {
      useTexture.preload(url);
    } catch {
      // Ignore
    }
  });
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
  const grad = ctx.createRadialGradient(half, half, 6, half, half, half);
  grad.addColorStop(0, "rgba(255, 252, 230, 0.98)");
  grad.addColorStop(0.2, "rgba(255, 200, 90, 0.6)");
  grad.addColorStop(0.5, "rgba(255, 120, 30, 0.2)");
  grad.addColorStop(1, "rgba(255, 80, 10, 0)");

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSaturnRingGeometry(inner: number, outer: number) {
  const geo = new THREE.RingGeometry(inner, outer, 96, 1);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const v3 = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v3.fromBufferAttribute(pos, i);
    const r = v3.length();
    const u = (r - inner) / (outer - inner);
    uv.setXY(i, u, 0.5);
  }
  uv.needsUpdate = true;
  return geo;
}

// Orbit circle in XZ plane
function OrbitLine({ radius }: { radius: number }) {
  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    const segments = 120;
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
      opacity={0.12}
      transparent
      lineWidth={1}
    />
  );
}

// Asteroid Belt (300 instanced rocks between radius 64 and 74)
function AsteroidBelt() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const count = 300;

  const rockGeo = useMemo(() => {
    const geo = new THREE.DodecahedronGeometry(0.35, 1);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const n =
        1 +
        0.25 * Math.sin(v.x * 12 + v.y * 7) +
        0.2 * Math.cos(v.z * 15 - v.x * 5);
      v.multiplyScalar(n);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  const matrices = useMemo(() => {
    const mats: THREE.Matrix4[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.1;
      const radius = 64 + Math.random() * 10;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = (Math.random() - 0.5) * 4.2;

      const scale = 0.4 + Math.random() * 0.9;
      const rot = new THREE.Euler(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      const mat = new THREE.Matrix4();
      mat.makeRotationFromEuler(rot);
      mat.scale(new THREE.Vector3(scale, scale, scale));
      mat.setPosition(x, y, z);
      mats.push(mat);
    }
    return mats;
  }, [count]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    matrices.forEach((mat, idx) => {
      mesh.setMatrixAt(idx, mat);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [matrices]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.008;
    }
  });

  return (
    <group ref={groupRef}>
      <instancedMesh
        ref={meshRef}
        args={[rockGeo, undefined, count]}
        frustumCulled={false}
      >
        <meshStandardMaterial
          color="#9E9892"
          roughness={0.9}
          metalness={0.1}
        />
      </instancedMesh>
    </group>
  );
}

// Spaceship procedural 3D model
function SpaceshipModel({
  isBoosting,
  isScanning,
  speed,
}: {
  isBoosting: boolean;
  isScanning: boolean;
  speed: number;
}) {
  const leftExhaustRef = useRef<THREE.Mesh>(null);
  const rightExhaustRef = useRef<THREE.Mesh>(null);
  const scannerGlowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const pulse = Math.sin(t * 18) * 0.15 + (isBoosting ? 1.6 : 0.85);
    const speedRatio = Math.min(speed / 35, 1.2);

    if (leftExhaustRef.current && rightExhaustRef.current) {
      const scaleZ = 1 + pulse * speedRatio * 1.5;
      leftExhaustRef.current.scale.set(1, 1, scaleZ);
      rightExhaustRef.current.scale.set(1, 1, scaleZ);
    }

    if (scannerGlowRef.current) {
      const scanPulse = isScanning ? 1 + Math.sin(t * 12) * 0.4 : 0.2;
      scannerGlowRef.current.scale.set(scanPulse, scanPulse, scanPulse);
    }
  });

  return (
    <group>
      {/* Fuselage - Main aerodynamic body */}
      <mesh position={[0, 0, 0]} rotation={[0, Math.PI, 0]}>
        <coneGeometry args={[0.55, 2.6, 6]} />
        <meshStandardMaterial
          color="#E8EAF6"
          roughness={0.25}
          metalness={0.7}
        />
      </mesh>

      {/* Cockpit Canopy */}
      <mesh position={[0, 0.22, -0.2]} rotation={[-0.15, 0, 0]}>
        <sphereGeometry args={[0.3, 16, 12]} />
        <meshStandardMaterial
          color="#00E5FF"
          emissive="#00B0FF"
          emissiveIntensity={0.4}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>

      {/* Left Wing */}
      <mesh position={[-0.95, -0.05, 0.4]} rotation={[0, 0.35, -0.08]}>
        <boxGeometry args={[1.4, 0.06, 1.1]} />
        <meshStandardMaterial
          color="#3F51B5"
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>
      {/* Left Wingtip Sensor */}
      <mesh position={[-1.7, 0.1, 0.4]}>
        <cylinderGeometry args={[0.04, 0.04, 0.5, 8]} />
        <meshStandardMaterial color="#FFD166" emissive="#FFD166" emissiveIntensity={0.8} />
      </mesh>

      {/* Right Wing */}
      <mesh position={[0.95, -0.05, 0.4]} rotation={[0, -0.35, 0.08]}>
        <boxGeometry args={[1.4, 0.06, 1.1]} />
        <meshStandardMaterial
          color="#3F51B5"
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>
      {/* Right Wingtip Sensor */}
      <mesh position={[1.7, 0.1, 0.4]}>
        <cylinderGeometry args={[0.04, 0.04, 0.5, 8]} />
        <meshStandardMaterial color="#FFD166" emissive="#FFD166" emissiveIntensity={0.8} />
      </mesh>

      {/* Vertical Dorsal Stabilizer */}
      <mesh position={[0, 0.42, 0.7]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[0.06, 0.65, 0.8]} />
        <meshStandardMaterial color="#1A237E" roughness={0.3} metalness={0.5} />
      </mesh>

      {/* Left Thruster Nozzle */}
      <mesh position={[-0.35, -0.05, 1.3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.16, 0.19, 0.4, 12]} />
        <meshStandardMaterial color="#263238" metalness={0.9} roughness={0.3} />
      </mesh>
      {/* Left Thruster Flame */}
      <mesh
        ref={leftExhaustRef}
        position={[-0.35, -0.05, 1.8]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <coneGeometry args={[0.18, 0.9, 12]} />
        <meshBasicMaterial
          color={isBoosting ? "#FF7043" : "#00E5FF"}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Right Thruster Nozzle */}
      <mesh position={[0.35, -0.05, 1.3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.16, 0.19, 0.4, 12]} />
        <meshStandardMaterial color="#263238" metalness={0.9} roughness={0.3} />
      </mesh>
      {/* Right Thruster Flame */}
      <mesh
        ref={rightExhaustRef}
        position={[0.35, -0.05, 1.8]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <coneGeometry args={[0.18, 0.9, 12]} />
        <meshBasicMaterial
          color={isBoosting ? "#FF7043" : "#00E5FF"}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Front Nose Sensor Beacon */}
      <mesh ref={scannerGlowRef} position={[0, 0, -1.35]}>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshBasicMaterial
          color={isScanning ? "#B5EAD7" : "#00E5FF"}
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  );
}

// Scanner Ray Beam connecting ship to celestial target
function ScannerBeam({
  from,
  to,
  active,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  active: boolean;
}) {
  const linePoints = useMemo(() => {
    return [
      [from.x, from.y, from.z] as [number, number, number],
      [to.x, to.y, to.z] as [number, number, number],
    ];
  }, [from, to]);

  if (!active) return null;

  return (
    <Line
      points={linePoints}
      color="#B5EAD7"
      lineWidth={3}
      transparent
      opacity={0.75}
    />
  );
}

// Single Celestial Body component
function CelestialBody({
  obj,
  shipDist,
  isTargeted,
  isDiscovered,
  textures,
}: {
  obj: CelestialObjectData;
  shipDist: number;
  isTargeted: boolean;
  isDiscovered: boolean;
  textures: Partial<Record<keyof typeof TEXTURE_PATHS, THREE.Texture>>;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  // Rotation
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * obj.rotationSpeed;
    }
  });

  const saturnRingGeo = useMemo(() => {
    if (!obj.hasRing) return null;
    return createSaturnRingGeometry(obj.size * 1.25, obj.size * 2.3);
  }, [obj.hasRing, obj.size]);

  // Determine texture if present
  let map: THREE.Texture | undefined;
  if (obj.textureKey && obj.textureKey in TEXTURE_PATHS) {
    map = textures[obj.textureKey as keyof typeof TEXTURE_PATHS];
  }

  // Label is visible when within 45 units or if it's the currently targeted nearest object
  const labelVisible = shipDist < 45 || isTargeted;

  const position: [number, number, number] = useMemo(() => {
    if (obj.orbitRadius === 0) return [0, 0, 0];
    const x = Math.cos(obj.initialAngle) * obj.orbitRadius;
    const z = Math.sin(obj.initialAngle) * obj.orbitRadius;
    return [x, 0, z];
  }, [obj.orbitRadius, obj.initialAngle]);

  const labelColor = isDiscovered ? "#FFD166" : isTargeted ? "#B5EAD7" : "#F1EEFF";

  return (
    <group position={position}>
      {/* 3D Label: Billboard + Text (Pure WebGL, zero HTML DOM nodes) */}
      <Billboard position={[0, obj.size + 1.2, 0]}>
        <Text
          visible={labelVisible}
          fontSize={Math.max(obj.size * 0.45, 0.75)}
          color={labelColor}
          outlineWidth={0.06}
          outlineColor="#0B0B1E"
          anchorX="center"
          anchorY="bottom"
        >
          {isDiscovered ? `★ ${obj.name}` : obj.name}
        </Text>
      </Billboard>

      {/* Celestial Sphere or Egg Mesh */}
      <mesh
        ref={meshRef}
        rotation={[THREE.MathUtils.degToRad(obj.axialTiltDeg), 0, 0]}
        scale={
          obj.shape === "egg" && obj.eggScale
            ? [obj.eggScale[0], obj.eggScale[1], obj.eggScale[2]]
            : [1, 1, 1]
        }
      >
        <sphereGeometry args={[obj.size, 36, 36]} />
        {obj.id === "sun" ? (
          <meshBasicMaterial
            map={map}
            color={map ? undefined : obj.fallbackColor}
          />
        ) : (
          <meshStandardMaterial
            map={map}
            color={map ? undefined : obj.fallbackColor}
            roughness={0.7}
            metalness={0.1}
          />
        )}
      </mesh>

      {/* Saturn Rings */}
      {obj.hasRing && saturnRingGeo && (
        <mesh
          ref={ringRef}
          geometry={saturnRingGeo}
          rotation={[Math.PI / 2 + 0.35, 0.1, 0]}
        >
          <meshStandardMaterial
            map={textures.saturnRing}
            color={textures.saturnRing ? undefined : "#C5A059"}
            side={THREE.DoubleSide}
            transparent
            opacity={0.9}
            roughness={0.8}
          />
        </mesh>
      )}
    </group>
  );
}

// Main Interactive Flight Scene
interface FlightSceneProps {
  onUpdateHUD: (hud: FlightHUDState) => void;
  onScanComplete: (objectId: string) => void;
  isPaused: boolean;
  touchInputRef: React.MutableRefObject<TouchInputState>;
  discoveredIds: string[];
}

function FlightScene({
  onUpdateHUD,
  onScanComplete,
  isPaused,
  touchInputRef,
  discoveredIds,
}: FlightSceneProps) {
  const { camera, gl } = useThree();

  // Load available textures with graceful fallback
  const textures = useTexture(TEXTURE_PATHS);

  // Corona texture
  const coronaTexture = useMemo(() => createCoronaTexture(), []);

  // Spaceship physics state (kept strictly in refs to prevent render cycle overhead)
  const shipPos = useRef(new THREE.Vector3(0, 2.5, 42)); // Starts near Earth
  const shipVel = useRef(new THREE.Vector3(0, 0, 0));
  const shipEuler = useRef(new THREE.Euler(0, Math.PI, 0, "YXZ"));
  const shipQuat = useRef(new THREE.Quaternion().setFromEuler(shipEuler.current));
  const shipGroupRef = useRef<THREE.Group>(null);

  const boostEnergy = useRef(100);
  const isBoostingRef = useRef(false);
  const isScanningRef = useRef(false);
  const scanProgressRef = useRef(0);
  const lastStatePushRef = useRef(0);

  // Keyboard input states
  const keys = useRef<Record<string, boolean>>({});

  // Mouse steer states
  const isMouseDown = useRef(false);
  const mouseDelta = useRef({ x: 0, y: 0 });

  // Precomputed body coordinates for fast distance checks
  const bodyCoords = useMemo(() => {
    return VOYAGE_OBJECTS.map((obj) => {
      const x = obj.orbitRadius === 0 ? 0 : Math.cos(obj.initialAngle) * obj.orbitRadius;
      const z = obj.orbitRadius === 0 ? 0 : Math.sin(obj.initialAngle) * obj.orbitRadius;
      return {
        id: obj.id,
        name: obj.name,
        size: obj.size,
        pos: new THREE.Vector3(x, 0, z),
      };
    });
  }, []);

  const nearestBodyRef = useRef(bodyCoords[3]); // Earth initially
  const nearestDistRef = useRef(3.5);

  // Register keyboard & pointer listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      keys.current[e.key.toLowerCase()] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
      keys.current[e.key.toLowerCase()] = false;
    };

    const dom = gl.domElement;
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) isMouseDown.current = true;
    };
    const onMouseUp = () => {
      isMouseDown.current = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (isMouseDown.current || document.pointerLockElement === dom) {
        mouseDelta.current.x += e.movementX || 0;
        mouseDelta.current.y += e.movementY || 0;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    dom.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      dom.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [gl.domElement]);

  // Main 60fps physics & flight loop
  useFrame((state, delta) => {
    if (isPaused) return;

    const dt = Math.min(delta, 0.08);
    const k = keys.current;
    const touch = touchInputRef.current;

    // Boost logic
    const wantsBoost =
      (k["ShiftLeft"] || k["ShiftRight"] || touch.boost) &&
      boostEnergy.current > 5;

    isBoostingRef.current = wantsBoost;
    if (wantsBoost) {
      boostEnergy.current = Math.max(0, boostEnergy.current - dt * 25);
    } else {
      boostEnergy.current = Math.min(100, boostEnergy.current + dt * 14);
    }

    // Steering input (Yaw, Pitch, Roll)
    let yawInput = 0;
    let pitchInput = 0;
    let rollInput = 0;

    if (k["KeyA"] || k["ArrowLeft"]) yawInput += 1.4;
    if (k["KeyD"] || k["ArrowRight"]) yawInput -= 1.4;
    if (k["KeyW"] || k["ArrowUp"]) pitchInput -= 1.0;
    if (k["KeyS"] || k["ArrowDown"]) pitchInput += 1.0;
    if (k["KeyQ"]) rollInput += 1.2;
    if (k["KeyE"] && !isScanningRef.current) rollInput -= 1.2;

    // Apply Touch inputs
    if (Math.abs(touch.steer) > 0.05) yawInput -= touch.steer * 1.5;
    if (Math.abs(touch.pitch) > 0.05) pitchInput += touch.pitch * 1.2;

    // Apply Mouse movement
    if (Math.abs(mouseDelta.current.x) > 0.1) {
      yawInput -= mouseDelta.current.x * 0.0022;
      mouseDelta.current.x *= 0.35;
    }
    if (Math.abs(mouseDelta.current.y) > 0.1) {
      pitchInput += mouseDelta.current.y * 0.0022;
      mouseDelta.current.y *= 0.35;
    }

    // Update ship rotation
    shipEuler.current.y += yawInput * dt;
    shipEuler.current.x = THREE.MathUtils.clamp(
      shipEuler.current.x + pitchInput * dt,
      -Math.PI * 0.42,
      Math.PI * 0.42
    );
    // Automatic banking roll when steering
    const targetRoll = -yawInput * 0.35 + rollInput * 0.4;
    shipEuler.current.z = THREE.MathUtils.lerp(shipEuler.current.z, targetRoll, dt * 5);

    shipQuat.current.setFromEuler(shipEuler.current);

    // Thrust & Braking
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(shipQuat.current);
    const maxSpeed = wantsBoost ? 52 : 24;
    const accelRate = wantsBoost ? 32 : 16;
    const brake = k["Space"] || touch.brake;

    let thrustInput = 0;
    if (k["KeyW"] || k["ArrowUp"] || touch.thrust > 0.1) thrustInput += 1;
    if (k["KeyS"] || k["ArrowDown"] || touch.thrust < -0.1) thrustInput -= 0.5;

    if (thrustInput > 0) {
      shipVel.current.addScaledVector(forward, accelRate * dt * thrustInput);
    } else if (thrustInput < 0) {
      shipVel.current.addScaledVector(forward, -accelRate * dt * 0.5);
    }

    // Natural drag or brake
    const drag = brake ? 0.88 : 0.985;
    shipVel.current.multiplyScalar(Math.pow(drag, dt * 60));

    // Cap maximum speed
    const currentSpeed = shipVel.current.length();
    if (currentSpeed > maxSpeed) {
      shipVel.current.setLength(maxSpeed);
    }

    // Apply velocity to position
    shipPos.current.addScaledVector(shipVel.current, dt);

    // Keep ship within reasonable solar system bounds (radius < 260, Y within +/- 25)
    const planarDist = Math.hypot(shipPos.current.x, shipPos.current.z);
    if (planarDist > 255) {
      shipPos.current.x *= 255 / planarDist;
      shipPos.current.z *= 255 / planarDist;
    }
    shipPos.current.y = THREE.MathUtils.clamp(shipPos.current.y, -22, 22);

    // Update ship 3D group
    if (shipGroupRef.current) {
      shipGroupRef.current.position.copy(shipPos.current);
      shipGroupRef.current.quaternion.copy(shipQuat.current);
    }

    // Smooth Follow Camera
    const camOffset = new THREE.Vector3(0, 2.2, 6.8).applyQuaternion(shipQuat.current);
    const desiredCamPos = shipPos.current.clone().add(camOffset);
    camera.position.lerp(desiredCamPos, dt * 6.5);

    const lookTarget = shipPos.current.clone().add(forward.clone().multiplyScalar(4));
    camera.lookAt(lookTarget);

    // Proximity checks to celestial bodies
    let closestBody = bodyCoords[0];
    let closestDist = Infinity;

    for (let i = 0; i < bodyCoords.length; i++) {
      const dist = shipPos.current.distanceTo(bodyCoords[i].pos);
      if (dist < closestDist) {
        closestDist = dist;
        closestBody = bodyCoords[i];
      }
    }
    nearestBodyRef.current = closestBody;
    nearestDistRef.current = closestDist;

    // Scan availability
    const scanThreshold = closestBody.size * 2.6 + 5.0;
    const canScan = closestDist < scanThreshold;

    // Scanning action
    const wantsScan = (k["KeyE"] || touch.scan) && canScan;
    if (wantsScan) {
      isScanningRef.current = true;
      scanProgressRef.current += dt / 1.7; // ~1.7s to complete scan
      if (scanProgressRef.current >= 1) {
        scanProgressRef.current = 1;
        onScanComplete(closestBody.id);
        isScanningRef.current = false;
        // reset key trigger so it doesn't immediately repeat
        keys.current["KeyE"] = false;
        keys.current["e"] = false;
        touch.scan = false;
      }
    } else {
      isScanningRef.current = false;
      scanProgressRef.current = Math.max(0, scanProgressRef.current - dt * 2);
    }

    // Heat calculation (Sun proximity)
    const distToSun = shipPos.current.length();
    let heat = 0;
    if (distToSun < 14) {
      heat = Math.min(100, Math.round(((14 - distToSun) / 10) * 100));
    }

    // Throttle HUD state updates to ~5 times per second (every 180ms)
    const now = performance.now();
    if (now - lastStatePushRef.current > 180) {
      lastStatePushRef.current = now;
      onUpdateHUD({
        speed: Math.round(currentSpeed * 10) / 10,
        maxSpeed,
        boost: Math.round(boostEnergy.current),
        isBoosting: isBoostingRef.current,
        heat,
        heatWarning: heat > 30,
        shipPos: [
          Math.round(shipPos.current.x * 10) / 10,
          Math.round(shipPos.current.y * 10) / 10,
          Math.round(shipPos.current.z * 10) / 10,
        ],
        shipHeading: shipEuler.current.y,
        nearestObjectId: closestBody.id,
        nearestObjectName: closestBody.name,
        nearestObjectDist: Math.round(closestDist * 10) / 10,
        canScan,
        isScanning: isScanningRef.current,
        scanProgress: scanProgressRef.current,
      });
    }
  });

  return (
    <>
      {/* Background Starry Sky */}
      <mesh scale={[-320, -320, -320]}>
        <sphereGeometry args={[1, 32, 32]} />
        {textures.milkyWay ? (
          <meshBasicMaterial map={textures.milkyWay} side={THREE.BackSide} />
        ) : (
          <meshBasicMaterial color="#050512" side={THREE.BackSide} />
        )}
      </mesh>

      {/* Lighting: Sun light + subtle ambient */}
      <ambientLight intensity={0.05} />
      <pointLight position={[0, 0, 0]} intensity={3.5} decay={0} color="#FFF8E7" />
      <pointLight position={[0, 0, 0]} intensity={0.8} distance={200} decay={1} color="#FFD166" />

      {/* Sun Corona Sprite */}
      {coronaTexture && (
        <sprite position={[0, 0, 0]} scale={[24, 24, 1]}>
          <spriteMaterial
            map={coronaTexture}
            blending={THREE.AdditiveBlending}
            transparent
            opacity={0.85}
          />
        </sprite>
      )}

      {/* Asteroid Belt */}
      <AsteroidBelt />

      {/* Orbit Lines for all 14 celestial bodies */}
      {VOYAGE_OBJECTS.map((obj) =>
        obj.orbitRadius > 0 ? (
          <OrbitLine key={`orbit-${obj.id}`} radius={obj.orbitRadius} />
        ) : null
      )}

      {/* 14 Celestial Bodies */}
      {VOYAGE_OBJECTS.map((obj) => {
        const isDiscovered = discoveredIds.includes(obj.id);
        const isTargeted = nearestBodyRef.current?.id === obj.id;
        return (
          <CelestialBody
            key={`body-${obj.id}`}
            obj={obj}
            shipDist={isTargeted ? nearestDistRef.current : 999}
            isTargeted={isTargeted}
            isDiscovered={isDiscovered}
            textures={textures}
          />
        );
      })}

      {/* Spaceship */}
      <group ref={shipGroupRef}>
        <SpaceshipModel
          isBoosting={isBoostingRef.current}
          isScanning={isScanningRef.current}
          speed={shipVel.current.length()}
        />
      </group>

      {/* Scanner Beam */}
      <ScannerBeam
        from={shipPos.current}
        to={nearestBodyRef.current.pos}
        active={isScanningRef.current}
      />
    </>
  );
}

export interface VoyageCanvasProps {
  onUpdateHUD: (hud: FlightHUDState) => void;
  onScanComplete: (objectId: string) => void;
  isPaused: boolean;
  touchInputRef: React.MutableRefObject<TouchInputState>;
  discoveredIds: string[];
}

export default function VoyageCanvas({
  onUpdateHUD,
  onScanComplete,
  isPaused,
  touchInputRef,
  discoveredIds,
}: VoyageCanvasProps) {
  return (
    <div className="w-full h-full relative select-none">
      <Canvas
        camera={{ position: [0, 4, 52], fov: 50, near: 0.1, far: 800 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
        dpr={[1, 1.5]}
        className="w-full h-full"
      >
        <Suspense fallback={null}>
          <FlightScene
            onUpdateHUD={onUpdateHUD}
            onScanComplete={onScanComplete}
            isPaused={isPaused}
            touchInputRef={touchInputRef}
            discoveredIds={discoveredIds}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
