"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { VOYAGE_OBJECTS, type CelestialObjectData } from "@/data/objects";
import { VoyageErrorBoundary } from "@/components/voyage/VoyageErrorBoundary";
import { VoyageHUD } from "@/components/voyage/VoyageHUD";
import { VoyageStartModal } from "@/components/voyage/VoyageStartModal";
import { VoyagePauseModal } from "@/components/voyage/VoyagePauseModal";
import { VoyageCompleteModal } from "@/components/voyage/VoyageCompleteModal";
import { DiscoveryCard } from "@/components/voyage/DiscoveryCard";
import { TouchControls } from "@/components/voyage/TouchControls";
import type { FlightHUDState, TouchInputState } from "@/components/voyage/types";
import { useAudio } from "@/context/AudioProvider";
import { useAuth } from "@/context/AuthProvider";
import { getTrainingStorageKey } from "@/lib/auth";

const STORAGE_DISCOVERED_KEY = "cosmic-detective-voyage-discovered-v1";
const STORAGE_SCORE_KEY = "cosmic-detective-voyage-score-v1";

const DEFAULT_HUD: FlightHUDState = {
  speed: 0,
  maxSpeed: 24,
  boost: 100,
  isBoosting: false,
  heat: 0,
  heatWarning: false,
  shipPos: [0, 2.5, 42],
  shipHeading: Math.PI,
  nearestObjectId: "earth",
  nearestObjectName: "Earth",
  nearestObjectDist: 3.5,
  canScan: true,
  isScanning: false,
  scanProgress: 0,
};

const VoyageCanvas = dynamic(
  () => import("@/components/voyage/VoyageCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#080816] text-[#F1EEFF] gap-3">
        <Loader2 className="w-8 h-8 text-pastel-mint animate-spin" />
        <span className="font-heading font-semibold text-sm tracking-wide">
          Initializing SPHEREx Recon Systems...
        </span>
      </div>
    ),
  }
);

export default function VoyagePage() {
  const { playSound, playSignature } = useAudio();
  const { user } = useAuth();
  const trainingStorageKey = getTrainingStorageKey(user);

  // Flight & Game States
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [hudState, setHudState] = useState<FlightHUDState>(DEFAULT_HUD);
  const [discoveredIds, setDiscoveredIds] = useState<string[]>([]);
  const [missionScore, setMissionScore] = useState<number>(0);

  // Active Discovery Card / Modals
  const [activeDiscovery, setActiveDiscovery] = useState<CelestialObjectData | null>(null);
  const [isCompleteOpen, setIsCompleteOpen] = useState<boolean>(false);

  // Mobile Touch Input State (stored in ref to feed directly into R3F useFrame)
  const touchInputRef = useRef<TouchInputState>({
    thrust: 0,
    steer: 0,
    pitch: 0,
    boost: false,
    brake: false,
    scan: false,
  });

  // Load saved voyage progress from localStorage
  useEffect(() => {
    try {
      const savedDiscovered = window.localStorage.getItem(STORAGE_DISCOVERED_KEY);
      if (savedDiscovered) {
        const parsed = JSON.parse(savedDiscovered);
        if (Array.isArray(parsed)) {
          setDiscoveredIds(parsed);
        }
      }

      const savedScore = window.localStorage.getItem(STORAGE_SCORE_KEY);
      if (savedScore) {
        const parsedScore = parseInt(savedScore, 10);
        if (!isNaN(parsedScore)) {
          setMissionScore(parsedScore);
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  // Save progress
  const saveProgress = useCallback((newDiscovered: string[], newScore: number) => {
    try {
      window.localStorage.setItem(
        STORAGE_DISCOVERED_KEY,
        JSON.stringify(newDiscovered)
      );
      window.localStorage.setItem(STORAGE_SCORE_KEY, newScore.toString());
    } catch {
      // Ignore
    }
  }, []);

  // Sync badge and points to user training account
  const syncTrainingBadge = useCallback(
    (pointsToAdd: number, unlockVoyagerBadge = false) => {
      try {
        const raw = window.localStorage.getItem(trainingStorageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          parsed.score = (parsed.score || 0) + pointsToAdd;
          if (unlockVoyagerBadge) {
            if (!Array.isArray(parsed.unlockedBadges)) {
              parsed.unlockedBadges = ["cadet"];
            }
            if (!parsed.unlockedBadges.includes("voyager")) {
              parsed.unlockedBadges.push("voyager");
            }
          }
          window.localStorage.setItem(
            trainingStorageKey,
            JSON.stringify(parsed)
          );
        }
      } catch {
        // Ignore
      }
    },
    [trainingStorageKey]
  );

  // Escape key listener for pausing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeDiscovery) {
          setActiveDiscovery(null);
        } else if (hasStarted) {
          setIsPaused((prev) => !prev);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasStarted, activeDiscovery]);

  // Scan Completion Callback from Canvas
  const handleScanComplete = useCallback(
    (objectId: string) => {
      playSound("reveal");
      playSignature(objectId);

      const targetData = VOYAGE_OBJECTS.find((o) => o.id === objectId);
      if (targetData) {
        setActiveDiscovery(targetData);
      }

      setDiscoveredIds((prev) => {
        if (!prev.includes(objectId)) {
          const updated = [...prev, objectId];
          const newScore = missionScore + 100; // +100 for newly scanned celestial body
          setMissionScore(newScore);
          saveProgress(updated, newScore);
          syncTrainingBadge(100, updated.length === VOYAGE_OBJECTS.length);

          if (updated.length === VOYAGE_OBJECTS.length) {
            setIsCompleteOpen(true);
          }
          return updated;
        }
        return prev;
      });
    },
    [missionScore, playSound, playSignature, saveProgress, syncTrainingBadge]
  );

  // Quiz correct callback from DiscoveryCard
  const handleQuizCorrect = useCallback(
    (points: number) => {
      setMissionScore((prev) => {
        const updated = prev + points;
        saveProgress(discoveredIds, updated);
        syncTrainingBadge(points, false);
        return updated;
      });
    },
    [discoveredIds, saveProgress, syncTrainingBadge]
  );

  const handleStartMission = () => {
    setHasStarted(true);
    setIsPaused(false);
  };

  const handleResetMission = () => {
    setIsPaused(false);
    // Reload canvas state by resetting position
    setHudState((prev) => ({
      ...prev,
      shipPos: [0, 2.5, 42],
      speed: 0,
      boost: 100,
    }));
  };

  return (
    <div className="relative w-full h-screen bg-[#080816] overflow-hidden select-none">
      {/* 3D Canvas Scene wrapped in ErrorBoundary */}
      <VoyageErrorBoundary>
        <VoyageCanvas
          onUpdateHUD={setHudState}
          onScanComplete={handleScanComplete}
          isPaused={!hasStarted || isPaused || !!activeDiscovery}
          touchInputRef={touchInputRef}
          discoveredIds={discoveredIds}
        />
      </VoyageErrorBoundary>

      {/* DOM Flight HUD */}
      {hasStarted && !activeDiscovery && (
        <VoyageHUD
          hud={hudState}
          discoveredCount={discoveredIds.length}
          totalCount={VOYAGE_OBJECTS.length}
          onOpenPause={() => setIsPaused(true)}
          onOpenHelp={() => setIsPaused(true)}
          onTriggerScan={() => {
            touchInputRef.current.scan = true;
          }}
        />
      )}

      {/* Mobile Touch Controls Overlay */}
      {hasStarted && !activeDiscovery && !isPaused && (
        <TouchControls
          touchInputRef={touchInputRef}
          canScan={hudState.canScan}
          onScanTap={() => {
            touchInputRef.current.scan = true;
          }}
        />
      )}

      {/* Start Mission Modal */}
      {!hasStarted && (
        <VoyageStartModal
          onStart={handleStartMission}
          discoveredCount={discoveredIds.length}
          totalCount={VOYAGE_OBJECTS.length}
        />
      )}

      {/* Pause Menu Modal */}
      {isPaused && (
        <VoyagePauseModal
          onResume={() => setIsPaused(false)}
          onReset={handleResetMission}
          discoveredCount={discoveredIds.length}
          totalCount={VOYAGE_OBJECTS.length}
        />
      )}

      {/* Discovery Detail Card */}
      {activeDiscovery && (
        <DiscoveryCard
          objectData={activeDiscovery}
          isDiscovered={discoveredIds.includes(activeDiscovery.id)}
          onClose={() => setActiveDiscovery(null)}
          onQuizCorrect={handleQuizCorrect}
        />
      )}

      {/* All 14 Celestial Bodies Mastered Modal */}
      {isCompleteOpen && (
        <VoyageCompleteModal
          onContinue={() => setIsCompleteOpen(false)}
          totalScore={missionScore}
        />
      )}
    </div>
  );
}
