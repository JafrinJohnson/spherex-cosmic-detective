"use client";

import React from "react";
import { UserRole } from "@/lib/auth";
import { useSound } from "@/components/SoundProvider";

export interface RoleOption {
  id: UserRole;
  title: string;
  subtitle: string;
  accentColor: string;
}

export const ROLE_OPTIONS: RoleOption[] = [
  {
    id: "student",
    title: "Student",
    subtitle: "Learn by playing",
    accentColor: "#B5EAD7",
  },
  {
    id: "educator",
    title: "Educator",
    subtitle: "Run sky activities with your class",
    accentColor: "#FFB5A7",
  },
  {
    id: "explorer",
    title: "Explorer",
    subtitle: "Investigate the sky freely",
    accentColor: "#A2D2FF",
  },
];

function RoleSvgIcon({ role, active }: { role: UserRole; active: boolean }) {
  if (role === "student") {
    return (
      <svg
        viewBox="0 0 32 32"
        className="h-7 w-7"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Graduation cap + star */}
        <path
          d="M4 13L16 7L28 13L16 19L4 13Z"
          stroke={active ? "#B5EAD7" : "#C3B1E1"}
          strokeWidth="2"
          strokeLinejoin="round"
          fill={active ? "rgba(181,234,215,0.18)" : "rgba(195,177,225,0.08)"}
        />
        <path
          d="M9 16V22.5C9 24.5 12.2 26 16 26C19.8 26 23 24.5 23 22.5V16"
          stroke={active ? "#B5EAD7" : "#CFCBEA"}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="26" cy="19" r="1.6" fill="#FFD166" />
        <path d="M26 13V18" stroke="#FFD166" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  if (role === "educator") {
    return (
      <svg
        viewBox="0 0 32 32"
        className="h-7 w-7"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Constellation board + pointer */}
        <rect
          x="4"
          y="6"
          width="24"
          height="16"
          rx="3"
          stroke={active ? "#FFB5A7" : "#C3B1E1"}
          strokeWidth="2"
          fill={active ? "rgba(255,181,167,0.16)" : "rgba(195,177,225,0.08)"}
        />
        <circle cx="11" cy="14" r="1.6" fill="#FFD166" />
        <circle cx="16.5" cy="11" r="1.6" fill="#B5EAD7" />
        <circle cx="21.5" cy="15" r="1.6" fill="#A2D2FF" />
        <path
          d="M11 14L16.5 11L21.5 15"
          stroke="#EDEBFF"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path
          d="M12 26L16 22L20 26"
          stroke={active ? "#FFB5A7" : "#CFCBEA"}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 32 32"
      className="h-7 w-7"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Telescope + orbit */}
      <circle
        cx="16"
        cy="16"
        r="11"
        stroke={active ? "#A2D2FF" : "#C3B1E1"}
        strokeWidth="1.8"
        strokeDasharray="3 2.5"
        fill={active ? "rgba(162,210,255,0.15)" : "rgba(195,177,225,0.08)"}
      />
      <path
        d="M11 21L14.2 14.2L21 11L17.8 17.8L11 21Z"
        stroke={active ? "#A2D2FF" : "#EDEBFF"}
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill={active ? "rgba(162,210,255,0.28)" : "rgba(237,235,255,0.12)"}
      />
      <circle cx="16" cy="16" r="1.8" fill="#FFD166" />
    </svg>
  );
}

interface RolePickerCardsProps {
  value: UserRole;
  onChange: (role: UserRole) => void;
  idPrefix?: string;
}

export function RolePickerCards({
  value,
  onChange,
  idPrefix = "role-picker",
}: RolePickerCardsProps) {
  const { playSound } = useSound();

  return (
    <div
      role="radiogroup"
      aria-label="Choose your cosmic detective role"
      className="grid grid-cols-1 gap-2.5 sm:grid-cols-3"
    >
      {ROLE_OPTIONS.map((option) => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            id={`${idPrefix}-${option.id}`}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              playSound("click");
              onChange(option.id);
            }}
            className={`group relative flex flex-col items-start gap-2 rounded-2xl border p-3.5 text-left transition-all min-h-[100px] ${
              active
                ? "border-white/35 bg-white/[0.13] shadow-[0_0_24px_rgba(195,177,225,0.22)]"
                : "border-white/12 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.08]"
            }`}
            style={{
              borderColor: active ? option.accentColor : undefined,
            }}
          >
            <div className="flex w-full items-center justify-between">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-[#0B0B1E]/60"
                style={{
                  borderColor: active ? `${option.accentColor}66` : undefined,
                }}
              >
                <RoleSvgIcon role={option.id} active={active} />
              </div>
              <span
                className={`h-3 w-3 rounded-full border transition-all ${
                  active ? "scale-110" : "border-white/25 bg-transparent"
                }`}
                style={{
                  backgroundColor: active ? option.accentColor : undefined,
                  borderColor: active ? option.accentColor : undefined,
                }}
                aria-hidden="true"
              />
            </div>
            <div>
              <p className="font-display text-sm font-semibold text-[#EDEBFF]">
                {option.title}
              </p>
              <p className="mt-0.5 text-xs leading-snug text-[#CFCBEA]">
                {option.subtitle}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
