import { useRef } from "react";
import { format, parseISO } from "date-fns";
import { SoilHistoryEntry } from "@/types";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  history: SoilHistoryEntry[];
  selectedDate?: string;
  onSelect?: (entry: SoilHistoryEntry) => void;
}

/** Compute an "overall health" score 0-100 for a snapshot */
function computeHealth(entry: SoilHistoryEntry): number {
  const cells = entry.cells?.flat() ?? [];
  if (cells.length === 0) return 50;

  const avg = (key: keyof Pick<SoilHistoryEntry["cells"][0][0], "moisture" | "nitrogen" | "phosphorus" | "potassium">) => {
    const sum = cells.reduce((acc, c) => acc + (c[key] ?? 50), 0);
    return sum / cells.length;
  };

  const moisture = entry.avgMoisture ?? avg("moisture");
  const nitrogen = entry.avgNitrogen ?? avg("nitrogen");
  const phosphorus = entry.avgPhosphorus ?? avg("phosphorus");
  const potassium = entry.avgPotassium ?? avg("potassium");

  // Ideal ranges: moisture 40-70, N/P/K 30-80
  const score = (
    scoreRange(moisture, 40, 70) +
    scoreRange(nitrogen, 30, 80) +
    scoreRange(phosphorus, 30, 80) +
    scoreRange(potassium, 30, 80)
  ) / 4;

  return Math.round(score * 100);
}

function scoreRange(val: number, low: number, high: number): number {
  if (val >= low && val <= high) return 1;
  if (val < low) return Math.max(0, val / low);
  return Math.max(0, 1 - (val - high) / (100 - high));
}

/** Produce a CSS color class based on health percentage */
function healthColor(health: number): string {
  if (health >= 70) return "stroke-green-500";
  if (health >= 40) return "stroke-yellow-500";
  return "stroke-red-500";
}

function healthBg(health: number): string {
  if (health >= 70) return "bg-green-100";
  if (health >= 40) return "bg-yellow-100";
  return "bg-red-100";
}

interface GaugeProps {
  value: number; // 0-100
  size?: number;
}

/** SVG circular gauge ring */
function SoilGaugeRing({ value, size = 40 }: GaugeProps) {
  const r = (size - 6) / 2;
  const circumference = 2 * Math.PI * r;
  const dash = (value / 100) * circumference;
  const color = healthColor(value);

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={5}
        className="stroke-muted"
      />
      {/* Progress */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={5}
        className={cn("transition-all duration-300", color)}
        strokeDasharray={`${dash} ${circumference - dash}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * SoilCalendarWheel — a horizontally scrollable timeline of soil health snapshots.
 * Uses CSS scroll-snap for smooth wheel/touch UX.
 */
export function SoilCalendarWheel({ history, selectedDate, onSelect }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-muted-foreground rounded-lg border border-dashed">
        No soil history yet — update your soil to start tracking.
      </div>
    );
  }

  return (
    <div className="relative">
      <p className="text-xs text-muted-foreground mb-2 select-none">
        Scroll to browse soil history ↔
      </p>
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-2 scroll-smooth"
        style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
      >
        {history.map((entry) => {
          const health = computeHealth(entry);
          const isSelected = selectedDate === entry.recordedAt;
          let dateLabel = "";
          try {
            dateLabel = format(parseISO(entry.recordedAt.split("T")[0]), "MMM d");
          } catch {
            dateLabel = entry.recordedAt.slice(5, 10);
          }

          return (
            <Tooltip key={entry.recordedAt}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onSelect?.(entry)}
                  className={cn(
                    "flex-shrink-0 flex flex-col items-center gap-1 p-1 rounded-lg transition-all cursor-pointer",
                    "hover:scale-105 focus:outline-none focus:ring-2 focus:ring-garden-primary",
                    isSelected && "ring-2 ring-garden-primary scale-105",
                    healthBg(health)
                  )}
                  style={{ scrollSnapAlign: "center", minWidth: "3.5rem" }}
                  aria-label={`Soil health on ${dateLabel}: ${health}%`}
                >
                  <SoilGaugeRing value={health} size={44} />
                  <span className="text-[10px] font-medium text-muted-foreground leading-none">
                    {dateLabel}
                  </span>
                  <span className="text-[10px] font-bold leading-none">{health}%</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-[160px]">
                <p className="font-medium">{dateLabel}</p>
                <p>Overall health: {health}%</p>
                {entry.avgMoisture != null && <p>Moisture: {entry.avgMoisture.toFixed(1)}%</p>}
                {entry.avgNitrogen != null && <p>Nitrogen: {entry.avgNitrogen.toFixed(1)}%</p>}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

export default SoilCalendarWheel;
