import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Copy, Sprout } from "lucide-react";
import NutrientBadges from "./NutrientBadges";
import PlantImage from "./PlantImage";
import { Plant } from "@/types";

interface PlantTableProps {
  plants: Plant[];
  /** Map of plant id → name for resolving companion plant IDs */
  plantNameMap: Map<string, string>;
  onEdit: (plant: Plant) => void;
  onCopy: (plant: Plant) => void;
  onViewDetails: (plant: Plant) => void;
}

/** Desktop table view for the plant library list. */
const PlantTable: React.FC<PlantTableProps> = ({
  plants,
  plantNameMap,
  onEdit,
  onCopy,
  onViewDetails,
}) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead className="w-[200px]">Plant</TableHead>
        <TableHead>Nutrient Impact</TableHead>
        <TableHead>Growth Cycle</TableHead>
        <TableHead>Companion Plants</TableHead>
        <TableHead>Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {plants.map((plant) => (
        <TableRow key={plant.id}>
          <TableCell className="font-medium">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-garden-secondary/10 flex items-center justify-center">
                <PlantImage imageUrl={plant.imageUrl} name={plant.name} iconSize="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span>{plant.name}</span>
                  {!plant.creatorId && (
                    <Badge
                      variant="outline"
                      className="text-xs border-garden-secondary text-garden-secondary"
                    >
                      Common
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {plant.description.substring(0, 40)}…
                </div>
              </div>
            </div>
          </TableCell>

          <TableCell>
            <NutrientBadges
              nitrogenImpact={plant.nutrients.nitrogenImpact}
              phosphorusImpact={plant.nutrients.phosphorusImpact}
              potassiumImpact={plant.nutrients.potassiumImpact}
            />
          </TableCell>

          <TableCell>
            <div className="text-xs">
              <div>Germination: {plant.growthCycle.germination} days</div>
              <div>Maturity: {plant.growthCycle.maturity} days</div>
              <div>Harvest: {plant.growthCycle.harvest} days</div>
            </div>
          </TableCell>

          <TableCell>
            {plant.compatiblePlants && plant.compatiblePlants.length > 0 ? (
              <div className="flex flex-col gap-1">
                <div className="text-xs font-medium">
                  {plant.compatiblePlants.map((id) => plantNameMap.get(id) ?? id).join(", ")}
                </div>
                {plant.companionBenefits && (
                  <div className="text-xs text-muted-foreground">
                    <span className="italic">Benefits:</span> {plant.companionBenefits}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">None specified</span>
            )}
          </TableCell>

          <TableCell>
            <div className="flex items-center space-x-2">
              {plant.isEditable ? (
                <Button variant="outline" size="sm" onClick={() => onEdit(plant)}>
                  Edit
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => onCopy(plant)}>
                  <Copy className="h-3 w-3 mr-2" />
                  Copy
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => onViewDetails(plant)}>
                Details
              </Button>
            </div>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

export default PlantTable;
