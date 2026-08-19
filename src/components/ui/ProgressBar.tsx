import React from 'react';

interface ProgressBarProps {
  label: string;
  value: number; // 0–100
  color?: string; // hex color
}

export function ProgressBar({ label, value, color = '#1A1410' }: ProgressBarProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-[0.87rem] font-semibold text-[#1A1410]">{label}</span>
        <span className="text-[0.87rem] font-bold font-display" style={{ color }}>{value}%</span>
      </div>
      <div className="h-2 w-full bg-[#E8E0D4] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  );
}