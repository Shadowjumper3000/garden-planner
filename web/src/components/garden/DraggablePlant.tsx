import React, { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import PlantPlaceholder from "@/components/garden/PlantPlaceholder";
import { Plant } from "@/types";

const DraggablePlant = ({ plant }: { plant: Plant }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: plant.id, data: { plant } });
  const [imgError, setImgError] = useState(false);

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={`plant-item cursor-grab select-none ${isDragging ? 'opacity-30' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
          {plant.imageUrl && !imgError ? (
            <img src={plant.imageUrl} alt={plant.name} className="w-full h-full object-cover" onError={() => setImgError(true)} />
          ) : (
            <PlantPlaceholder name={plant.name} />
          )}
        </div>
        <div>
          <h4 className="font-medium">{plant.name}</h4>
          <div className="flex flex-wrap gap-1.5 mt-1">
            <span className={`text-xs px-1.5 py-0.5 rounded ${plant.nutrients.nitrogenImpact > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>N: {plant.nutrients.nitrogenImpact > 0 ? '+' : ''}{plant.nutrients.nitrogenImpact}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${plant.nutrients.phosphorusImpact > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>P: {plant.nutrients.phosphorusImpact > 0 ? '+' : ''}{plant.nutrients.phosphorusImpact}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${plant.nutrients.potassiumImpact > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>K: {plant.nutrients.potassiumImpact > 0 ? '+' : ''}{plant.nutrients.potassiumImpact}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">⌀ {plant.size.widthM}m</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DraggablePlant;
