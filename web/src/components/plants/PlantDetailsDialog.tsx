import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BookOpen, Leaf, Sprout, UsersIcon } from "lucide-react";
import PlantImage from "./PlantImage";
import NutrientBadges from "./NutrientBadges";
import { Plant } from "@/types";

interface PlantDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plant: Plant | null;
}

const PlantDetailsDialog: React.FC<PlantDetailsDialogProps> = ({ open, onOpenChange, plant }) => {
  if (!plant) return null;

  const nutrientLabel = (value: number, nutrient: string) => {
    if (value > 0) return `Adds ${nutrient} to soil`;
    if (value < 0) return `Depletes ${nutrient} from soil`;
    return `Neutral impact on ${nutrient}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[95vw] sm:max-w-xl md:max-w-2xl overflow-y-auto max-h-[90vh]"
        style={{ resize: "none" }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-garden-secondary/10 flex items-center justify-center">
              <PlantImage imageUrl={plant.imageUrl} name={plant.name} iconSize="h-5 w-5" />
            </div>
            <span>{plant.name}</span>
            {!plant.creatorId && (
              <Badge variant="outline" className="text-xs border-garden-secondary text-garden-secondary">
                Common
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Larger plant image */}
          {plant.imageUrl && (
            <div className="flex justify-center">
              <div className="w-40 h-40 rounded-md overflow-hidden">
                <PlantImage imageUrl={plant.imageUrl} name={plant.name} iconSize="h-10 w-10" />
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <h3 className="text-lg font-medium mb-2 flex items-center">
              <BookOpen className="h-5 w-5 mr-2 text-garden-secondary" />
              Description
            </h3>
            <p className="text-sm">{plant.description}</p>
          </div>

          {/* Nutrient Impact */}
          <div>
            <h3 className="text-lg font-medium mb-2 flex items-center">
              <Leaf className="h-5 w-5 mr-2 text-garden-secondary" />
              Nutrient Impact
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(
                [
                  { label: "Nitrogen (N)", value: plant.nutrients.nitrogenImpact, key: "nitrogen" },
                  { label: "Phosphorus (P)", value: plant.nutrients.phosphorusImpact, key: "phosphorus" },
                  { label: "Potassium (K)", value: plant.nutrients.potassiumImpact, key: "potassium" },
                ] as const
              ).map(({ label, value, key }) => (
                <Card key={key} className="overflow-hidden">
                  <CardHeader
                    className={`py-2 px-3 ${
                      value > 0 ? "bg-green-50" : value < 0 ? "bg-red-50" : "bg-gray-50"
                    }`}
                  >
                    <CardTitle className="text-sm">{label}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3">
                    <div className="text-2xl font-bold flex items-center">
                      {value > 0 && <span className="text-green-600">+</span>}
                      <span
                        className={
                          value > 0 ? "text-green-600" : value < 0 ? "text-red-600" : "text-gray-600"
                        }
                      >
                        {value}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{nutrientLabel(value, key)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Growth Cycle */}
          <div>
            <h3 className="text-lg font-medium mb-2 flex items-center">
              <Sprout className="h-5 w-5 mr-2 text-garden-secondary" />
              Growth Cycle
            </h3>
            <div className="bg-slate-50 rounded-md p-4">
              <div className="relative pt-6">
                <div className="absolute top-6 left-0 w-full h-1 bg-slate-200 rounded" />
                {/* Germination marker */}
                <div className="relative z-10">
                  <div className="absolute -top-6 transform -translate-x-1/2">
                    <div className="text-xs font-medium">Germination</div>
                    <div className="text-xs text-muted-foreground">{plant.growthCycle.germination} days</div>
                  </div>
                  <div className="w-3 h-3 bg-garden-secondary rounded-full" />
                </div>
                {/* Maturity marker */}
                <div className="relative z-10" style={{ position: "absolute", left: "50%", top: 0 }}>
                  <div className="absolute -top-6 transform -translate-x-1/2">
                    <div className="text-xs font-medium">Maturity</div>
                    <div className="text-xs text-muted-foreground">{plant.growthCycle.maturity} days</div>
                  </div>
                  <div className="w-3 h-3 bg-garden-primary rounded-full" />
                </div>
                {/* Harvest marker */}
                <div className="relative z-10" style={{ position: "absolute", left: "100%", top: 0 }}>
                  <div className="absolute -top-6 transform -translate-x-1/2">
                    <div className="text-xs font-medium">Harvest</div>
                    <div className="text-xs text-muted-foreground">{plant.growthCycle.harvest} days</div>
                  </div>
                  <div className="w-3 h-3 bg-amber-500 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Companion Plants */}
          {plant.compatiblePlants && plant.compatiblePlants.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-2 flex items-center">
                <UsersIcon className="h-5 w-5 mr-2 text-garden-secondary" />
                Companion Plants
              </h3>
              <div className="bg-slate-50 rounded-md p-4">
                <div className="flex flex-wrap gap-2 mb-2">
                  {plant.compatiblePlants.map((companion, idx) => (
                    <Badge key={idx} variant="secondary">
                      {companion}
                    </Badge>
                  ))}
                </div>
                {plant.companionBenefits && (
                  <p className="text-sm text-muted-foreground italic mt-2">
                    <span className="font-medium text-foreground">Benefits: </span>
                    {plant.companionBenefits}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlantDetailsDialog;
