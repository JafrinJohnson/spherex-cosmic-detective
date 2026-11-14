"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
} from "recharts";
import { getSpectrum } from "@/lib/api";
import type { SpectrumPoint } from "@/types";

interface SpectrumChartProps {
  targetId: string;
  source?: string;
}

const SPHEREX_BAND_REGIONS = [
  { id: "B1", x1: 0.75, x2: 1.09, fill: "rgba(162, 210, 255, 0.08)" },
  { id: "B2", x1: 1.1, x2: 1.62, fill: "rgba(195, 177, 225, 0.05)" },
  { id: "B3", x1: 1.63, x2: 2.41, fill: "rgba(181, 234, 215, 0.08)" },
  { id: "B4", x1: 2.42, x2: 3.82, fill: "rgba(255, 200, 221, 0.05)" },
  { id: "B5", x1: 3.83, x2: 4.41, fill: "rgba(255, 181, 167, 0.08)" },
  { id: "B6", x1: 4.42, x2: 5.0, fill: "rgba(255, 209, 102, 0.05)" },
];

const ABSORPTION_LINES = [
  { x: 3.0, label: "Water ice 3.0 µm", color: "#A2D2FF" },
  { x: 3.3, label: "Methane 3.3 µm", color: "#B5EAD7" },
  { x: 4.27, label: "CO₂ 4.27 µm", color: "#FFC8DD" },
  { x: 4.67, label: "CO 4.67 µm", color: "#FFB5A7" },
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value?: number;
    payload?: { wavelength: number; brightness: number };
  }>;
}

function CustomGlassTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="glass px-3.5 py-2 rounded-xl bg-[#0B0B1E]/95 border border-white/25 shadow-glass-glow text-xs font-mono text-cosmic-text">
      {point.wavelength.toFixed(2)} µm · brightness{" "}
      {point.brightness.toFixed(2)}
    </div>
  );
}

export function SpectrumChart({
  targetId,
}: SpectrumChartProps) {
  const [rawPoints, setRawPoints] = useState<SpectrumPoint[]>([]);

  useEffect(() => {
    let active = true;
    getSpectrum(targetId || "barnards-star").then((pts) => {
      if (active) setRawPoints(pts);
    });
    return () => {
      active = false;
    };
  }, [targetId]);

  const chartData = useMemo(() => {
    if (rawPoints.length === 0) return [];
    const maxFlux = Math.max(...rawPoints.map((p) => p.flux), 1);
    return rawPoints.map((p) => ({
      wavelength: p.wavelength,
      flux: p.flux,
      brightness: Number(Math.min(1, Math.max(0, p.flux / maxFlux)).toFixed(2)),
    }));
  }, [rawPoints]);

  return (
    <div className="glass p-6 sm:p-8 space-y-5">
      {/* Header Row */}
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-heading text-xl sm:text-2xl font-medium text-cosmic-text">
          Spectrum
        </h2>
        <span className="text-xs font-mono text-cosmic-muted">
          102 channels · 0.75 to 5.0 µm
        </span>
      </div>

      {/* Band Legend Strip (B1–B6) */}
      <div className="grid grid-cols-6 gap-1.5 text-center text-[11px] font-mono">
        {SPHEREX_BAND_REGIONS.map((band) => (
          <div
            key={band.id}
            style={{ backgroundColor: band.fill }}
            className="py-1 px-2 rounded-lg border border-white/10 text-cosmic-muted"
          >
            <span className="font-semibold text-cosmic-text">{band.id}</span>{" "}
            <span className="hidden sm:inline">
              {band.x1}–{band.x2}µm
            </span>
          </div>
        ))}
      </div>

      {/* Recharts AreaChart */}
      <div className="h-[290px] sm:h-[320px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 24, right: 18, left: -12, bottom: 8 }}
          >
            <defs>
              {/* Horizontal & vertical gradient fill: sky blue -> lavender -> infrared orange */}
              <linearGradient id="spectrumFillGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#A2D2FF" stopOpacity={0.55} />
                <stop offset="50%" stopColor="#C3B1E1" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#FF8A65" stopOpacity={0.65} />
              </linearGradient>
              <linearGradient
                id="spectrumStrokeGrad"
                x1="0"
                y1="0"
                x2="1"
                y2="0"
              >
                <stop offset="0%" stopColor="#A2D2FF" />
                <stop offset="50%" stopColor="#C3B1E1" />
                <stop offset="100%" stopColor="#FF8A65" />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255, 255, 255, 0.07)"
            />

            {/* 6 Shaded SPHEREx Bands (B1–B6) */}
            {SPHEREX_BAND_REGIONS.map((band) => (
              <ReferenceArea
                key={band.id}
                x1={band.x1}
                x2={band.x2}
                fill={band.fill}
                label={{
                  value: band.id,
                  position: "insideTop",
                  fill: "#CFCBEA",
                  fontSize: 10,
                }}
              />
            ))}

            <XAxis
              dataKey="wavelength"
              type="number"
              domain={[0.75, 5.0]}
              tickCount={9}
              stroke="#CFCBEA"
              fontSize={11}
              tickFormatter={(v) => `${Number(v).toFixed(1)} µm`}
            />

            <YAxis
              domain={[0, 1.05]}
              tickCount={6}
              stroke="#CFCBEA"
              fontSize={11}
              tickFormatter={(v) => Number(v).toFixed(1)}
            />

            <Tooltip content={<CustomGlassTooltip />} />

            {/* Vertical Dashed Molecular Reference Lines */}
            {ABSORPTION_LINES.map((ref) => (
              <ReferenceLine
                key={ref.label}
                x={ref.x}
                stroke={ref.color}
                strokeDasharray="4 4"
                strokeWidth={1.3}
                label={{
                  value: ref.label,
                  position: "top",
                  fill: ref.color,
                  fontSize: 10,
                }}
              />
            ))}

            <Area
              type="monotone"
              dataKey="brightness"
              stroke="url(#spectrumStrokeGrad)"
              strokeWidth={2.4}
              fillOpacity={1}
              fill="url(#spectrumFillGrad)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Caption */}
      <p className="text-xs sm:text-sm text-cosmic-muted">
        Dips in the curve show which molecules absorb infrared light.
      </p>
    </div>
  );
}

