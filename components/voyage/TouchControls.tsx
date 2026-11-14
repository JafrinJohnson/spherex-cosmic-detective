"use client";

import React, { useRef, useState } from "react";
import { Zap, Shield, Radio, ArrowUp, ArrowDown } from "lucide-react";
import type { TouchInputState } from "./types";

interface TouchControlsProps {
  touchInputRef: React.MutableRefObject<TouchInputState>;
  canScan: boolean;
  onScanTap: () => void;
}

export function TouchControls({
  touchInputRef,
  canScan,
  onScanTap,
}: TouchControlsProps) {
  const stickBaseRef = useRef<HTMLDivElement>(null);
  const [stickOffset, setStickOffset] = useState({ x: 0, y: 0 });
  const touchIdRef = useRef<number | null>(null);

  // Virtual joystick touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    updateStickPos(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        updateStickPos(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setStickOffset({ x: 0, y: 0 });
        touchInputRef.current.steer = 0;
        touchInputRef.current.pitch = 0;
        break;
      }
    }
  };

  const updateStickPos = (clientX: number, clientY: number) => {
    const base = stickBaseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const maxRadius = rect.width / 2;
    const distance = Math.hypot(dx, dy);

    const clampedDist = Math.min(distance, maxRadius);
    const angle = Math.atan2(dy, dx);

    const offsetX = Math.cos(angle) * clampedDist;
    const offsetY = Math.sin(angle) * clampedDist;

    setStickOffset({ x: offsetX, y: offsetY });

    // Normalize to -1..1
    touchInputRef.current.steer = offsetX / maxRadius;
    touchInputRef.current.pitch = offsetY / maxRadius;
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 flex justify-between items-end p-6 md:hidden">
      {/* Left: Virtual Joystick */}
      <div
        ref={stickBaseRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="w-28 h-28 rounded-full bg-black/40 border border-white/20 backdrop-blur-sm pointer-events-auto flex items-center justify-center relative touch-none shadow-xl"
      >
        <div
          className="w-12 h-12 rounded-full bg-pastel-sky/50 border border-white/40 shadow-md transition-transform duration-75 flex items-center justify-center"
          style={{
            transform: `translate(${stickOffset.x}px, ${stickOffset.y}px)`,
          }}
        >
          <div className="w-4 h-4 rounded-full bg-white/80" />
        </div>
      </div>

      {/* Right: Flight Action Buttons (Thrust, Boost, Brake, Scan) */}
      <div className="flex flex-col gap-3 pointer-events-auto items-end">
        {/* Forward Thrust */}
        <button
          type="button"
          onTouchStart={() => {
            touchInputRef.current.thrust = 1;
          }}
          onTouchEnd={() => {
            touchInputRef.current.thrust = 0;
          }}
          className="w-14 h-14 rounded-2xl bg-pastel-sky/30 border border-pastel-sky/50 text-[#F1EEFF] flex items-center justify-center active:scale-95 transition-transform shadow-lg"
          title="Thrust Forward"
        >
          <ArrowUp className="w-6 h-6 text-pastel-sky" />
        </button>

        {/* Reverse / Slow Thrust */}
        <button
          type="button"
          onTouchStart={() => {
            touchInputRef.current.thrust = -0.5;
          }}
          onTouchEnd={() => {
            touchInputRef.current.thrust = 0;
          }}
          className="w-14 h-14 rounded-2xl bg-pastel-sky/20 border border-pastel-sky/40 text-[#F1EEFF] flex items-center justify-center active:scale-95 transition-transform shadow-lg"
          title="Reverse Thrust"
        >
          <ArrowDown className="w-6 h-6 text-pastel-sky/80" />
        </button>

        {/* Boost Button */}
        <button
          type="button"
          onTouchStart={() => {
            touchInputRef.current.boost = true;
          }}
          onTouchEnd={() => {
            touchInputRef.current.boost = false;
          }}
          className="w-14 h-14 rounded-2xl bg-amber-500/30 border border-amber-400/50 text-[#F1EEFF] flex items-center justify-center active:scale-95 transition-transform shadow-lg"
          title="Engine Boost"
        >
          <Zap className="w-6 h-6 text-amber-300" />
        </button>

        {/* Brake Button */}
        <button
          type="button"
          onTouchStart={() => {
            touchInputRef.current.brake = true;
          }}
          onTouchEnd={() => {
            touchInputRef.current.brake = false;
          }}
          className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 text-[#F1EEFF] flex items-center justify-center active:scale-95 transition-transform shadow-lg"
          title="Air Brake"
        >
          <Shield className="w-5 h-5 text-cosmic-muted" />
        </button>

        {/* Scan Button (highlighted when in range) */}
        {canScan && (
          <button
            type="button"
            onClick={onScanTap}
            className="w-14 h-14 rounded-2xl bg-pastel-mint/40 border border-pastel-mint text-cosmic-bg flex items-center justify-center active:scale-95 transition-transform shadow-lg animate-pulse"
            title="Scan Target"
          >
            <Radio className="w-6 h-6 text-pastel-mint" />
          </button>
        )}
      </div>
    </div>
  );
}
