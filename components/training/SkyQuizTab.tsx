"use client";

import React, { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, RotateCcw, Sparkles, Trophy, X } from "lucide-react";
import {
  pickRandomQuizQuestions,
  type QuizItem,
} from "@/data/quiz";
import { useSound } from "@/components/SoundProvider";

export interface SkyQuizTabProps {
  bestScore: number;
  onAddPoints: (points: number) => void;
  onUpdateBestScore: (score: number) => void;
}

const QUESTION_COUNT = 10;
const QUESTION_TIME_SEC = 20;

export function SkyQuizTab({
  bestScore,
  onAddPoints,
  onUpdateBestScore,
}: SkyQuizTabProps) {
  const prefersReducedMotion = useReducedMotion();
  const { playSound } = useSound();

  const [questions, setQuestions] = useState<QuizItem[]>(() =>
    pickRandomQuizQuestions(QUESTION_COUNT)
  );
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(QUESTION_TIME_SEC);
  const [results, setResults] = useState<Array<"correct" | "wrong" | null>>(
    () => Array(QUESTION_COUNT).fill(null)
  );
  const [quizScore, setQuizScore] = useState<number>(0);
  const [finished, setFinished] = useState<boolean>(false);

  const currentQuestion = questions[currentIndex];
  const isAnswered = selectedOption !== null || timedOut;
  const isCorrect =
    selectedOption !== null &&
    currentQuestion !== undefined &&
    selectedOption === currentQuestion.answer;

  const startNewQuiz = useCallback(() => {
    playSound("click");
    setQuestions(pickRandomQuizQuestions(QUESTION_COUNT));
    setCurrentIndex(0);
    setSelectedOption(null);
    setTimedOut(false);
    setTimeLeft(QUESTION_TIME_SEC);
    setResults(Array(QUESTION_COUNT).fill(null));
    setQuizScore(0);
    setFinished(false);
  }, [playSound]);

  const handleSelectOption = useCallback(
    (option: string) => {
      if (isAnswered || finished || !currentQuestion) return;

      setSelectedOption(option);
      const correct = option === currentQuestion.answer;

      setResults((prev) => {
        const next = [...prev];
        next[currentIndex] = correct ? "correct" : "wrong";
        return next;
      });

      if (correct) {
        playSound("success");
        const nextScore = quizScore + 50;
        setQuizScore(nextScore);
        onAddPoints(50);
        if (nextScore > bestScore) {
          onUpdateBestScore(nextScore);
        }
      } else {
        playSound("click");
      }
    },
    [
      isAnswered,
      finished,
      currentQuestion,
      currentIndex,
      quizScore,
      bestScore,
      playSound,
      onAddPoints,
      onUpdateBestScore,
    ]
  );

  const handleNext = useCallback(() => {
    if (!isAnswered || finished) return;
    playSound("click");

    if (currentIndex + 1 >= questions.length) {
      setFinished(true);
      if (quizScore > bestScore) {
        onUpdateBestScore(quizScore);
      }
    } else {
      setCurrentIndex((idx) => idx + 1);
      setSelectedOption(null);
      setTimedOut(false);
      setTimeLeft(QUESTION_TIME_SEC);
    }
  }, [
    isAnswered,
    finished,
    currentIndex,
    questions.length,
    quizScore,
    bestScore,
    playSound,
    onUpdateBestScore,
  ]);

  // 20-second countdown timer per question
  useEffect(() => {
    if (finished || isAnswered) return;

    const interval = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          setTimedOut(true);
          setResults((r) => {
            const next = [...r];
            next[currentIndex] = "wrong";
            return next;
          });
          playSound("click");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [finished, isAnswered, currentIndex, playSound]);

  // Keyboard shortcuts: 1/2/3/4 to answer, Enter for next
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (target?.closest('[role="dialog"]')) return;

      if (finished) {
        if (e.key === "Enter") {
          e.preventDefault();
          startNewQuiz();
        }
        return;
      }

      if (!isAnswered && currentQuestion) {
        if (e.key === "1" && currentQuestion.options[0]) {
          e.preventDefault();
          handleSelectOption(currentQuestion.options[0]);
        } else if (e.key === "2" && currentQuestion.options[1]) {
          e.preventDefault();
          handleSelectOption(currentQuestion.options[1]);
        } else if (e.key === "3" && currentQuestion.options[2]) {
          e.preventDefault();
          handleSelectOption(currentQuestion.options[2]);
        } else if (e.key === "4" && currentQuestion.options[3]) {
          e.preventDefault();
          handleSelectOption(currentQuestion.options[3]);
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    finished,
    isAnswered,
    currentQuestion,
    handleSelectOption,
    handleNext,
    startNewQuiz,
  ]);

  if (finished) {
    const correctCount = results.filter((r) => r === "correct").length;
    const finalMessage =
      correctCount >= 9
        ? "Master astronomer! Your sky knowledge is crystal clear."
        : correctCount >= 7
          ? "Sharp detective work! You know your cosmic neighbours well."
          : correctCount >= 5
            ? "Good effort! A few more rounds will make you a sky expert."
            : "Every astronomer starts by looking up. Try another round!";

    return (
      <motion.div
        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass p-6 sm:p-10 max-w-2xl mx-auto text-center space-y-6 border border-[#B5EAD7]/45"
      >
        <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-gradient-to-br from-[#B5EAD7] to-[#A2D2FF] text-[#0B0B1E] shadow-[0_0_30px_rgba(181,234,215,0.4)]">
          <Trophy className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-cosmic-text">
            Sky Quiz Complete
          </h2>
          <p className="text-base text-cosmic-muted max-w-md mx-auto">
            {finalMessage}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/15">
            <div className="text-sm text-cosmic-muted">Quiz score</div>
            <div className="font-mono text-3xl font-semibold text-[#FFD166] mt-1">
              {quizScore}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/15">
            <div className="text-sm text-cosmic-muted">Correct answers</div>
            <div className="font-mono text-3xl font-semibold text-[#B5EAD7] mt-1">
              {correctCount} / {QUESTION_COUNT}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/15">
            <div className="text-sm text-cosmic-muted">Best score</div>
            <div className="font-mono text-3xl font-semibold text-pastel-sky mt-1">
              {Math.max(bestScore, quizScore)}
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={startNewQuiz}
            className="min-h-[44px] px-8 py-3 rounded-full font-heading font-bold text-base bg-infrared-gradient text-[#0B0B1E] shadow-infrared-glow hover:opacity-95 inline-flex items-center gap-2 transition-opacity focus:outline-none focus:ring-2 focus:ring-pastel-mint"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play again</span>
          </button>
        </div>
      </motion.div>
    );
  }

  if (!currentQuestion) return null;

  const circleRadius = 22;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const timerProgress = Math.max(0, Math.min(1, timeLeft / QUESTION_TIME_SEC));
  const strokeDashoffset = circleCircumference * (1 - timerProgress);
  const timerStrokeColor =
    timeLeft <= 5 ? "#FFB5A7" : timeLeft <= 10 ? "#FFD166" : "#B5EAD7";

  return (
    <div className="glass p-6 sm:p-8 max-w-3xl mx-auto space-y-6">
      {/* Top Bar: Progress Dots + Circular Timer + Best Score */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="space-y-2">
          <div className="text-sm text-cosmic-muted font-mono">
            Question {currentIndex + 1} of {QUESTION_COUNT} · Best:{" "}
            <span className="text-[#FFD166]">{bestScore} pts</span>
          </div>

          {/* 10 Progress Dots */}
          <div
            className="flex items-center gap-2"
            aria-label="Quiz question progress"
          >
            {results.map((res, idx) => {
              const isCurrent = idx === currentIndex;
              let dotClass = "bg-white/20 border-white/25";
              if (res === "correct") {
                dotClass =
                  "bg-[#B5EAD7] border-[#B5EAD7] shadow-[0_0_8px_rgba(181,234,215,0.65)]";
              } else if (res === "wrong") {
                dotClass =
                  "bg-[#FFB5A7] border-[#FFB5A7] shadow-[0_0_8px_rgba(255,181,167,0.55)]";
              } else if (isCurrent) {
                dotClass =
                  "bg-pastel-sky border-pastel-sky scale-125 shadow-[0_0_10px_rgba(162,210,255,0.8)]";
              }
              return (
                <span
                  key={idx}
                  className={`w-3 h-3 rounded-full border transition-all ${dotClass}`}
                />
              );
            })}
          </div>
        </div>

        {/* 20-Second Circular Timer */}
        <div className="flex items-center gap-3">
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg
              className="w-14 h-14 -rotate-90"
              viewBox="0 0 56 56"
              aria-hidden="true"
            >
              <circle
                cx="28"
                cy="28"
                r={circleRadius}
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="4"
              />
              <circle
                cx="28"
                cy="28"
                r={circleRadius}
                fill="none"
                stroke={timerStrokeColor}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circleCircumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-300"
              />
            </svg>
            <span
              className={`font-mono text-sm font-semibold ${
                timeLeft <= 5 ? "text-[#FFB5A7]" : "text-cosmic-text"
              }`}
            >
              {timeLeft}s
            </span>
          </div>
        </div>
      </div>

      {/* Question Header with Small Picture */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border border-white/20 bg-[#07061A] shrink-0 relative shadow-md">
          <div
            className="w-full h-full bg-cover bg-center"
            style={{
              backgroundImage: `url(${currentQuestion.image ?? "/textures/jupiter.jpg"})`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-[#0B0B1E]/40 via-transparent to-white/10" />
        </div>

        <h2 className="font-heading text-xl sm:text-2xl font-bold text-cosmic-text leading-snug">
          {currentQuestion.question}
        </h2>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {currentQuestion.options.map((opt, idx) => {
          const isSelected = selectedOption === opt;
          const isRightOption = opt === currentQuestion.answer;

          let cardStyle =
            "bg-white/[0.05] hover:bg-white/[0.11] border-white/15 text-cosmic-text";

          if (isAnswered) {
            if (isRightOption) {
              cardStyle =
                "bg-[#B5EAD7]/20 border-[#B5EAD7] text-[#B5EAD7] shadow-[0_0_20px_rgba(181,234,215,0.2)]";
            } else if (isSelected) {
              cardStyle =
                "bg-[#FFB5A7]/20 border-[#FFB5A7] text-[#FFB5A7] shadow-[0_0_20px_rgba(255,181,167,0.2)]";
            } else {
              cardStyle =
                "bg-white/[0.02] border-white/10 text-cosmic-muted opacity-60";
            }
          }

          return (
            <button
              key={opt}
              type="button"
              disabled={isAnswered}
              onClick={() => handleSelectOption(opt)}
              className={`w-full min-h-[44px] px-4 py-3.5 rounded-2xl border text-left text-base font-medium flex items-center justify-between gap-3 transition-all focus:outline-none focus:ring-2 focus:ring-pastel-mint ${cardStyle}`}
            >
              <span className="inline-flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-white/10 border border-white/20 inline-flex items-center justify-center font-mono text-sm text-cosmic-muted shrink-0">
                  {idx + 1}
                </span>
                <span>{opt}</span>
              </span>

              {isAnswered && isRightOption && (
                <span className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-[#B5EAD7] shrink-0">
                  <Check className="w-4 h-4" />
                  <span>{isSelected ? "+50" : "Correct"}</span>
                </span>
              )}

              {isAnswered && isSelected && !isRightOption && (
                <span className="inline-flex items-center gap-1 font-mono text-sm font-semibold text-[#FFB5A7] shrink-0">
                  <X className="w-4 h-4" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Feedback Banner + Next Button */}
      {isAnswered && (
        <motion.div
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            isCorrect
              ? "bg-[#B5EAD7]/12 border-[#B5EAD7]/60 text-cosmic-text"
              : "bg-[#FFB5A7]/12 border-[#FFB5A7]/60 text-cosmic-text"
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-heading font-bold text-base">
              {isCorrect ? (
                <>
                  <Sparkles className="w-4 h-4 text-[#B5EAD7]" />
                  <span className="text-[#B5EAD7]">Correct! +50 pts</span>
                </>
              ) : (
                <span className="text-[#FFB5A7]">
                  {timedOut ? "Time is up!" : "Not quite"}
                </span>
              )}
            </div>
            <p className="text-sm text-cosmic-muted">
              {currentQuestion.explanation}
            </p>
            {!isCorrect && (
              <p className="text-sm font-medium text-[#B5EAD7]">
                Right answer: {currentQuestion.answer}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="min-h-[44px] px-6 py-2.5 rounded-full font-heading font-semibold text-sm bg-infrared-gradient text-[#0B0B1E] shadow-infrared-glow hover:opacity-95 inline-flex items-center justify-center gap-2 shrink-0 transition-opacity focus:outline-none focus:ring-2 focus:ring-pastel-mint"
          >
            <span>
              {currentIndex + 1 >= questions.length
                ? "See results"
                : "Next question"}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </div>
  );
}
