import React from "react";
import { Database } from "lucide-react";

interface SampleDataBadgeProps {
  source?: string;
  className?: string;
}

export function SampleDataBadge({
  source = "placeholder",
  className = "",
}: SampleDataBadgeProps) {
  if (source !== "placeholder") {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium tracking-wide bg-[#FFB5A7]/15 text-[#FFB5A7] border border-[#FFB5A7]/35 ${className}`}
      title="Using local simulated SPHEREx archive data (/public/data)"
    >
      <Database className="w-3.5 h-3.5 shrink-0" />
      <span>Sample data</span>
    </span>
  );
}

