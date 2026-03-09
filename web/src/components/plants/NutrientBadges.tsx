import React from "react";

interface NutrientBadgeProps {
  label: string;
  value: number;
}

/** Single coloured N/P/K badge showing +/- value. */
export const NutrientBadge: React.FC<NutrientBadgeProps> = ({ label, value }) => (
  <span
    className={`text-xs px-2 py-0.5 rounded ${
      value > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
    }`}
  >
    {label}: {value > 0 ? "+" : ""}
    {value}
  </span>
);

interface NutrientBadgesProps {
  nitrogenImpact: number;
  phosphorusImpact: number;
  potassiumImpact: number;
  className?: string;
}

/** Row of N, P, K badges. */
const NutrientBadges: React.FC<NutrientBadgesProps> = ({
  nitrogenImpact,
  phosphorusImpact,
  potassiumImpact,
  className = "flex gap-2",
}) => (
  <div className={className}>
    <NutrientBadge label="N" value={nitrogenImpact} />
    <NutrientBadge label="P" value={phosphorusImpact} />
    <NutrientBadge label="K" value={potassiumImpact} />
  </div>
);

export default NutrientBadges;
