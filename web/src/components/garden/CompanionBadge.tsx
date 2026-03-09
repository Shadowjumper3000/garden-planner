import { Plant } from "@/types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CompanionBadgeProps {
  row: number;
  col: number;
  placements: Map<string, { plant: Plant }>;
}

const OFFSETS: Array<{ dr: number; dc: number; pos: string }> = [
  { dr: -1, dc:  0, pos: "top-0    left-1/2 -translate-x-1/2 -translate-y-1/2" },
  { dr:  1, dc:  0, pos: "bottom-0 left-1/2 -translate-x-1/2  translate-y-1/2" },
  { dr:  0, dc: -1, pos: "left-0   top-1/2  -translate-x-1/2 -translate-y-1/2" },
  { dr:  0, dc:  1, pos: "right-0  top-1/2   translate-x-1/2 -translate-y-1/2" },
];

function isCompanion(a: Plant, b: Plant): boolean {
  return (
    (a.compatiblePlants ?? []).includes(b.name) ||
    (b.compatiblePlants ?? []).includes(a.name)
  );
}

/**
 * Renders small green dots on the edges of a grid cell to indicate that the
 * placed plant has a beneficial companion relationship with an adjacent plant.
 */
const CompanionBadge = ({ row, col, placements }: CompanionBadgeProps) => {
  const src = placements.get(`${row}-${col}`);
  if (!src) return null;

  const badges = OFFSETS.map(({ dr, dc, pos }) => {
    const nbr = placements.get(`${row + dr}-${col + dc}`);
    if (!nbr || !isCompanion(src.plant, nbr.plant)) return null;

    return (
      <Tooltip key={`${dr}-${dc}`}>
        <TooltipTrigger asChild>
          <span
            className={`absolute z-10 w-3 h-3 rounded-full border-2 border-white shadow bg-green-500 ${pos}`}
            aria-label="Companion plant pair"
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-[180px]">
          <p>
            <strong>{src.plant.name}</strong> &amp;{" "}
            <strong>{nbr.plant.name}</strong> are companion plants
          </p>
          {(src.plant.companionBenefits || nbr.plant.companionBenefits) && (
            <p className="text-muted-foreground mt-0.5">
              {src.plant.companionBenefits || nbr.plant.companionBenefits}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }).filter(Boolean);

  if (badges.length === 0) return null;
  return <>{badges}</>;
};

export default CompanionBadge;
