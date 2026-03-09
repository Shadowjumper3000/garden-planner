import React from "react";
import { Progress } from "@/components/ui/progress";
import { SoilCell } from "@/types";

const SoilStats = ({ cells }: { cells: SoilCell[] }) => {
  const calculateAverage = (key: keyof SoilCell) => {
    if (cells.length === 0) return 0;
    const sum = cells.reduce((acc, cell) => acc + (cell[key] as number), 0);
    return Math.round((sum / cells.length) * 10) / 10;
  };

  const avgMoisture = calculateAverage('moisture');
  const avgNitrogen = calculateAverage('nitrogen');
  const avgPhosphorus = calculateAverage('phosphorus');
  const avgPotassium = calculateAverage('potassium');
  const avgPh = calculateAverage('ph');

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium">Moisture</span>
          <span className="text-sm text-muted-foreground">{avgMoisture}%</span>
        </div>
        <Progress value={avgMoisture} className="h-2" />
      </div>

      <div>
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium">Nitrogen (N)</span>
          <span className="text-sm text-muted-foreground">{avgNitrogen}%</span>
        </div>
        <Progress value={avgNitrogen} className="h-2" />
      </div>

      <div>
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium">Phosphorus (P)</span>
          <span className="text-sm text-muted-foreground">{avgPhosphorus}%</span>
        </div>
        <Progress value={avgPhosphorus} className="h-2" />
      </div>

      <div>
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium">Potassium (K)</span>
          <span className="text-sm text-muted-foreground">{avgPotassium}%</span>
        </div>
        <Progress value={avgPotassium} className="h-2" />
      </div>

      <div>
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium">pH Level</span>
          <span className="text-sm text-muted-foreground">{avgPh}</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full" style={{ width: `${(avgPh / 14) * 100}%`, background: "linear-gradient(to right, #f87171, #fbbf24, #34d399)" }}></div>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>Acidic</span>
          <span>Neutral</span>
          <span>Alkaline</span>
        </div>
      </div>
    </div>
  );
};

export default SoilStats;
