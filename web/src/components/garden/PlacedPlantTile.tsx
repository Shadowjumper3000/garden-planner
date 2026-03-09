import React, { useState } from "react";
import PlantPlaceholder from "@/components/garden/PlantPlaceholder";
import { PlacedPlant } from "@/types";
import { SCALE } from "@/constants/garden";

const PlacedPlantTile = ({ pp, isMoving, onPointerDown, onRemove }: { pp: PlacedPlant; isMoving: boolean; onPointerDown: (e: React.PointerEvent) => void; onRemove: () => void; }) => {
  const diam = Math.max(pp.widthM * SCALE, 18);
  const [imgError, setImgError] = useState(false);
  const plantColor = '#ddd';
  return (
    <div
      className={`absolute group rounded-full overflow-hidden flex items-center justify-center select-none border-2 ${isMoving ? 'border-garden-primary ring-2 ring-garden-primary/50 cursor-grabbing z-20 shadow-lg' : 'border-transparent hover:border-garden-secondary cursor-grab z-10'}`}
      style={{ left: pp.x * SCALE, top: pp.y * SCALE, width: diam, height: diam, backgroundColor: `${plantColor}28` }}
      onPointerDown={onPointerDown}
      title={pp.plant.name}
    >
      {pp.plant.imageUrl && !imgError ? (
        <img src={pp.plant.imageUrl} alt={pp.plant.name} className="w-full h-full object-cover rounded-full" onError={() => setImgError(true)} />
      ) : (
        <PlantPlaceholder name={pp.plant.name} />
      )}
      <div className="absolute inset-0 rounded-full bg-black/65 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[10px] pointer-events-none">
        <p className="font-semibold text-center px-1 leading-tight">{pp.plant.name}</p>
        <p className="opacity-70 mt-0.5">⌀ {pp.widthM}m</p>
      </div>
      <button className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-4 h-4 text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-auto z-30 shadow" onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRemove(); }}>×</button>
    </div>
  );
};

export default PlacedPlantTile;
