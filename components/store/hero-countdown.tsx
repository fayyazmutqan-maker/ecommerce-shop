"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface HeroCountdownProps {
  endDate: string;
  label?: string;
  className?: string;
  variant?: "default" | "minimal" | "badge";
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(endDate: string): TimeLeft | null {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function HeroCountdown({ endDate, label, className, variant = "default" }: HeroCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() => getTimeLeft(endDate));
  const t = useTranslations("countdown");

  useEffect(() => {
    const timer = setInterval(() => {
      const tl = getTimeLeft(endDate);
      setTimeLeft(tl);
      if (!tl) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [endDate]);

  if (!timeLeft) return null;

  if (variant === "badge") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-white text-sm",
          className
        )}
      >
        {label && <span className="font-medium">{label}</span>}
        <span className="font-mono font-bold tabular-nums">
          {timeLeft.days > 0 && `${timeLeft.days}d `}
          {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
        </span>
      </div>
    );
  }

  if (variant === "minimal") {
    return (
      <div className={cn("flex items-center gap-2 text-white/90", className)}>
        {label && <span className="text-sm font-medium">{label}</span>}
        <span className="font-mono text-lg font-bold tabular-nums">
          {timeLeft.days > 0 && `${timeLeft.days}d `}
          {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
        </span>
      </div>
    );
  }

  // Default variant - boxed
  const units = [
    ...(timeLeft.days > 0 ? [{ value: timeLeft.days, label: t("days") }] : []),
    { value: timeLeft.hours, label: t("hrs") },
    { value: timeLeft.minutes, label: t("min") },
    { value: timeLeft.seconds, label: t("sec") },
  ];

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      {label && <span className="text-sm font-medium text-white/80">{label}</span>}
      <div className="flex items-center gap-2">
        {units.map((u, i) => (
          <div key={u.label} className="flex items-center gap-2">
            <div className="flex flex-col items-center min-w-14 px-3 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15">
              <span className="text-2xl md:text-3xl font-bold font-mono tabular-nums text-white">
                {pad(u.value)}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-white/60">
                {u.label}
              </span>
            </div>
            {i < units.length - 1 && (
              <span className="text-xl font-bold text-white/40">:</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
