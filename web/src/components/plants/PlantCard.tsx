import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Copy, Plus, Sprout } from "lucide-react";
import NutrientBadges from "./NutrientBadges";
import PlantImage from "./PlantImage";
import { Plant } from "@/types";

interface PlantCardProps {
  plant: Plant;
  isOwned: boolean;
  onEdit: (plant: Plant) => void;
  onCopy: (plant: Plant) => void;
  onViewDetails: (plant: Plant) => void;
}

/** Mobile card view for a single plant entry. */
const PlantCard: React.FC<PlantCardProps> = ({ plant, isOwned, onEdit, onCopy, onViewDetails }) => (
  <div className="border rounded-lg p-4 space-y-3">
    <div className="flex items-center space-x-3">
      <div className="w-10 h-10 rounded-full overflow-hidden bg-garden-secondary/10 flex items-center justify-center">
        <PlantImage imageUrl={plant.imageUrl} name={plant.name} iconSize="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <span className="font-medium">{plant.name}</span>
          {!plant.creatorId && (
            <Badge variant="outline" className="text-xs border-garden-secondary text-garden-secondary">
              Common
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground">{plant.description.substring(0, 60)}…</div>
      </div>
    </div>

    <div>
      <p className="text-sm font-medium mb-1">Nutrient Impact</p>
      <NutrientBadges
        nitrogenImpact={plant.nutrients.nitrogenImpact}
        phosphorusImpact={plant.nutrients.phosphorusImpact}
        potassiumImpact={plant.nutrients.potassiumImpact}
        className="flex flex-wrap gap-2"
      />
    </div>

    <div className="flex flex-wrap gap-2">
      {isOwned ? (
        <Button variant="outline" size="sm" onClick={() => onEdit(plant)} className="flex-1">
          Edit
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={() => onCopy(plant)} className="flex-1">
          <Copy className="h-3 w-3 mr-2" />
          Copy
        </Button>
      )}
      <Button variant="secondary" size="sm" onClick={() => onViewDetails(plant)} className="flex-1">
        <BookOpen className="h-3 w-3 mr-2" />
        Details
      </Button>
    </div>
  </div>
);

export default PlantCard;
