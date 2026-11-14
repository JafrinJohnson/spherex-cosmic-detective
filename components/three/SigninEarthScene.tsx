"use client";

import React, { Component, Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, useTexture } from "@react-three/drei";
import * as THREE from "three";

const EARTH_TILT = (23.4 * Math.PI) / 180;

function useSrgbTextures<T extends Record<string, string>>(input: T) {
  const loaded = useTexture(input) as Record<keyof T, THREE.Texture>;
  useEffect(() => {
    Object.values(loaded).forEach((tex) => {
      if (tex) {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
      }
    });
  }, [loaded]);
  return loaded;
}

class TextureErrorBoundary extends Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
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

function AtmosphereRim({ radius }: { radius: number }) {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color("#6BB8FF") },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        void main() {
          vec3 viewDir = normalize(vViewPosition);
          float fresnel = pow(1.0 - max(0.0, dot(vNormal, viewDir)), 2.9);
          gl_FragColor = vec4(uColor, fresnel * 0.72);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.FrontSide,
    });
  }, []);

  return (
    <mesh scale={1.06}>
      <sphereGeometry args={[radius, 48, 48]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function EarthTexturedMeshes({
  earthRef,
  cloudsRef,
  moonRef,
}: {
  earthRef: React.RefObject<THREE.Mesh | null>;
  cloudsRef: React.RefObject<THREE.Mesh | null>;
  moonRef: React.RefObject<THREE.Mesh | null>;
}) {
  const { earth, clouds, moon } = useSrgbTextures({
    earth: "/textures/earth.jpg",
    clouds: "/textures/earth-clouds.jpg",
    moon: "/textures/moon.jpg",
  });

  return (
    <>
      <mesh ref={earthRef}>
        <sphereGeometry args={[1.45, 64, 64]} />
        <meshStandardMaterial map={earth} roughness={0.62} metalness={0.08} />
      </mesh>
      <mesh ref={cloudsRef} scale={1.015}>
        <sphereGeometry args={[1.45, 64, 64]} />
        <meshStandardMaterial
          map={clouds}
          alphaMap={clouds}
          transparent
          opacity={0.44}
          depthWrite={false}
          roughness={0.85}
        />
      </mesh>
      <AtmosphereRim radius={1.45} />
      <mesh ref={moonRef} position={[2.25, 0.25, 0]}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial map={moon} roughness={0.88} metalness={0.04} />
      </mesh>
    </>
  );
}

function EarthFallbackMeshes({
  earthRef,
  cloudsRef,
  moonRef,
}: {
  earthRef: React.RefObject<THREE.Mesh | null>;
  cloudsRef: React.RefObject<THREE.Mesh | null>;
  moonRef: React.RefObject<THREE.Mesh | null>;
}) {
  return (
    <>
      <mesh ref={earthRef}>
        <sphereGeometry args={[1.45, 48, 48]} />
        <meshStandardMaterial color="#3A7CA5" roughness={0.65} />
      </mesh>
      <mesh ref={cloudsRef} scale={1.015}>
        <sphereGeometry args={[1.45, 48, 48]} />
        <meshStandardMaterial color="#FFFFFF" transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <AtmosphereRim radius={1.45} />
      <mesh ref={moonRef} position={[2.25, 0.25, 0]}>
        <sphereGeometry args={[0.25, 24, 24]} />
        <meshStandardMaterial color="#CFCBEA" roughness={0.88} />
      </mesh>
    </>
  );
}

function RotatingEarthSystem() {
  const earthRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const moonRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * 0.22;
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.28;
    }
    if (moonRef.current) {
      const angle = t * 0.42;
      moonRef.current.position.set(
        Math.cos(angle) * 2.25,
        Math.sin(angle * 0.7) * 0.35,
        Math.sin(angle) * 2.25
      );
      moonRef.current.rotation.y += delta * 0.3;
    }
  });

  const fallback = (
    <EarthFallbackMeshes earthRef={earthRef} cloudsRef={cloudsRef} moonRef={moonRef} />
  );

  return (
    <group rotation={[0, 0, EARTH_TILT]}>
      <TextureErrorBoundary fallback={fallback}>
        <Suspense fallback={fallback}>
          <EarthTexturedMeshes earthRef={earthRef} cloudsRef={cloudsRef} moonRef={moonRef} />
        </Suspense>
      </TextureErrorBoundary>
    </group>
  );
}

export default function SigninEarthScene() {
  return (
    <div className="relative h-full w-full select-none">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0.4, 4.6], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={0.35} color="#C3B1E1" />
        <directionalLight position={[-5, 2.5, 4]} intensity={2.4} color="#FFF1D6" />
        <pointLight position={[4, -2, 3]} intensity={0.6} color="#A2D2FF" />

        <Stars radius={45} depth={30} count={900} factor={2.5} saturation={0.4} fade speed={0.4} />
        <RotatingEarthSystem />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableDamping
          dampingFactor={0.06}
          rotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}

