import React from "react";
import { getPlantColor } from "@/lib/plantUtils";

const PlantPlaceholder = ({ name, className = '' }: { name: string; className?: string }) => {
  const color = getPlantColor(name);
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <div className={`w-full h-full flex items-center justify-center rounded-full ${className}`} style={{ backgroundColor: color }}>
      <span className="text-white font-bold select-none" style={{ fontSize: '38%', lineHeight: 1 }}>{initial}</span>
    </div>
  );
};

export default PlantPlaceholder;
