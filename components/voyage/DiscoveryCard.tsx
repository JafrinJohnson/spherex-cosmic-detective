"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Volume2,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  Info,
  BookOpen,
  HelpCircle,
} from "lucide-react";
import type { CelestialObjectData } from "@/data/objects";
import { useAudio } from "@/context/AudioProvider";

interface DiscoveryCardProps {
  objectData: CelestialObjectData;
  isDiscovered: boolean;
  onClose: () => void;
  onQuizCorrect: (points: number) => void;
}

export function DiscoveryCard({
  objectData,
  isDiscovered,
  onClose,
  onQuizCorrect,
}: DiscoveryCardProps) {
  const { playSound, playSignature } = useAudio();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [infraredMode, setInfraredMode] = useState<boolean>(false);

  const isCorrect = selectedOption === objectData.quiz.answer;

  const handleSelectOption = (option: string) => {
    if (quizSubmitted) return;
    playSound("click");
    setSelectedOption(option);
  };

  const handleSubmitQuiz = () => {
    if (!selectedOption || quizSubmitted) return;
    setQuizSubmitted(true);
    if (selectedOption === objectData.quiz.answer) {
      playSound("success");
      onQuizCorrect(50);
    } else {
      playSound("wrong");
    }
  };

  const handlePlaySoundSignature = () => {
    playSound("click");
    playSignature(objectData.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-panel rounded-3xl border border-pastel-mint/30 shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-[#F1EEFF] flex items-center justify-center transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pr-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-pastel-mint mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>SPHEREx Target Analysis</span>
              <span className="px-2 py-0.5 rounded-full bg-pastel-mint/15 border border-pastel-mint/30 text-[10px]">
                {objectData.type}
              </span>
              {isDiscovered && (
                <span className="px-2 py-0.5 rounded-full bg-pastel-sky/15 border border-pastel-sky/30 text-[10px] text-pastel-sky">
                  Cataloged
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[#F1EEFF]">
              {objectData.name}
            </h2>
          </div>

          {/* Audio Signature Button */}
          <button
            type="button"
            onClick={handlePlaySoundSignature}
            className="px-3.5 py-2 rounded-xl glass-panel border border-pastel-sky/40 hover:border-pastel-sky text-xs font-semibold text-[#F1EEFF] hover:bg-white/10 transition-all flex items-center gap-2 shadow-sm"
          >
            <Volume2 className="w-4 h-4 text-pastel-sky" />
            <span>Harmonic Signature</span>
          </button>
        </div>

        {/* Infrared Mode Toggle Banner */}
        <div
          className={`p-4 rounded-2xl border transition-all duration-300 ${
            infraredMode
              ? "bg-gradient-to-r from-orange-950/60 to-amber-950/60 border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.25)]"
              : "bg-white/5 border-white/10"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Eye
                className={`w-5 h-5 ${
                  infraredMode ? "text-orange-400 animate-pulse" : "text-cosmic-muted"
                }`}
              />
              <div>
                <div className="text-xs font-bold font-heading text-[#F1EEFF]">
                  SPHEREx Infrared Spectrometer View
                </div>
                <div className="text-xs text-cosmic-muted">
                  {infraredMode ? "Active: false-color thermal absorption spectra" : "Toggle to reveal infrared data"}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                playSound("click");
                setInfraredMode(!infraredMode);
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                infraredMode
                  ? "bg-orange-500 text-white shadow-md shadow-orange-500/30"
                  : "bg-white/10 hover:bg-white/20 text-[#F1EEFF]"
              }`}
            >
              {infraredMode ? "Infrared On" : "Preview Infrared"}
            </button>
          </div>

          {infraredMode && (
            <div className="mt-3 pt-3 border-t border-orange-500/20 text-xs text-orange-200 leading-relaxed animate-in fade-in duration-200">
              <span className="font-semibold text-orange-300">SPHEREx Observation: </span>
              {objectData.infraredNote}
            </div>
          )}
        </div>

        {/* Why this name & History */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-pastel-peach uppercase tracking-wide">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Why this Name?</span>
            </div>
            <p className="text-xs sm:text-sm text-cosmic-text leading-relaxed">
              {objectData.whyName}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-pastel-sky uppercase tracking-wide">
              <Info className="w-3.5 h-3.5" />
              <span>History & Discovery</span>
            </div>
            <p className="text-xs sm:text-sm text-cosmic-text leading-relaxed">
              {objectData.history}
            </p>
          </div>
        </div>

        {/* 3 Key Facts */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold font-heading text-cosmic-muted uppercase tracking-wider">
            Cosmic Dossier Facts
          </h3>
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {objectData.facts.map((fact, idx) => (
              <li
                key={idx}
                className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs text-[#F1EEFF] leading-relaxed flex flex-col justify-between"
              >
                <span>{fact}</span>
                <span className="text-[10px] font-mono text-pastel-mint mt-2 font-bold">
                  FACT 0{idx + 1}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Mini Quiz (+50 pts) */}
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-pastel-mint uppercase tracking-wider">
              <HelpCircle className="w-4 h-4" />
              <span>Telemetry Quiz Challenge</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-pastel-mint/20 border border-pastel-mint/40 text-[11px] font-bold text-pastel-mint">
              +50 PTS
            </span>
          </div>

          <p className="text-sm font-semibold text-[#F1EEFF]">
            {objectData.quiz.question}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {objectData.quiz.options.map((opt) => {
              const isSelected = selectedOption === opt;
              let btnStyle =
                "bg-white/5 border-white/10 hover:border-white/25 text-[#F1EEFF]";

              if (quizSubmitted) {
                if (opt === objectData.quiz.answer) {
                  btnStyle = "bg-pastel-mint/20 border-pastel-mint text-pastel-mint font-bold";
                } else if (isSelected) {
                  btnStyle = "bg-red-500/20 border-red-400 text-red-300";
                } else {
                  btnStyle = "bg-white/5 border-white/5 text-cosmic-muted opacity-60";
                }
              } else if (isSelected) {
                btnStyle = "bg-pastel-mint/20 border-pastel-mint text-pastel-mint";
              }

              return (
                <button
                  key={opt}
                  type="button"
                  disabled={quizSubmitted}
                  onClick={() => handleSelectOption(opt)}
                  className={`p-3 rounded-xl border text-left text-xs font-medium transition-all ${btnStyle}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {quizSubmitted ? (
            <div
              className={`p-3 rounded-xl border text-xs leading-relaxed ${
                isCorrect
                  ? "bg-pastel-mint/15 border-pastel-mint/30 text-pastel-mint"
                  : "bg-pastel-peach/15 border-pastel-peach/30 text-pastel-peach"
              }`}
            >
              <div className="font-bold mb-1 flex items-center gap-1.5">
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Correct! +50 Points Awarded
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    Not quite:
                  </>
                )}
              </div>
              <div>{objectData.quiz.explanation}</div>
            </div>
          ) : (
            <button
              type="button"
              disabled={!selectedOption}
              onClick={handleSubmitQuiz}
              className={`w-full py-2.5 rounded-full text-xs font-bold transition-all shadow-md ${
                selectedOption
                  ? "bg-gradient-to-r from-pastel-mint to-pastel-sky text-cosmic-bg hover:opacity-95"
                  : "bg-white/10 text-cosmic-muted cursor-not-allowed"
              }`}
            >
              Submit Answer (+50 pts)
            </button>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-8 py-3 rounded-full bg-gradient-to-r from-pastel-mint to-pastel-sky text-cosmic-bg text-sm font-bold shadow-lg hover:opacity-95 transition-all"
          >
            Continue Voyage
          </button>
        </div>
      </div>
    </div>
  );
}
