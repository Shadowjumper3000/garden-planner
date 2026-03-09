import React from "react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, SproutIcon } from "lucide-react";
import PlantCard from "./PlantCard";
import PlantTable from "./PlantTable";
import { Plant } from "@/types";

interface PlantListProps {
  plants: Plant[];
  isLoading: boolean;
  plantNameMap: Map<string, string>;
  /** True when viewing "My Plants" tab — changes empty-state messaging */
  isMyPlantsTab: boolean;
  searchTerm: string;
  onEdit: (plant: Plant) => void;
  onCopy: (plant: Plant) => void;
  onViewDetails: (plant: Plant) => void;
  onAddFirst?: () => void;
}

const PlantList: React.FC<PlantListProps> = ({
  plants,
  isLoading,
  plantNameMap,
  isMyPlantsTab,
  searchTerm,
  onEdit,
  onCopy,
  onViewDetails,
  onAddFirst,
}) => {
  if (isLoading) {
    return (
      <CardContent className="p-0">
        <div className="grid grid-cols-1 gap-6 p-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-gray-200 animate-pulse" />
          ))}
        </div>
      </CardContent>
    );
  }

  if (plants.length === 0) {
    return (
      <CardContent className="py-8 text-center">
        <SproutIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-lg font-medium mb-2">No Plants Found</p>
        <p className="text-muted-foreground mb-4">
          {searchTerm
            ? "No plants match your search criteria."
            : isMyPlantsTab
            ? "You haven't created any plants yet."
            : "No plants available in this category."}
        </p>
        {!searchTerm && isMyPlantsTab && onAddFirst && (
          <Button onClick={onAddFirst} className="bg-garden-primary hover:bg-garden-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Plant
          </Button>
        )}
      </CardContent>
    );
  }

  const isOwned = (plant: Plant) => !!plant.isEditable;

  return (
    <CardContent className="p-0 overflow-hidden">
      {/* Mobile cards */}
      <div className="md:hidden">
        <div className="space-y-4 p-4">
          {plants.map((plant) => (
            <PlantCard
              key={plant.id}
              plant={plant}
              isOwned={isOwned(plant)}
              onEdit={onEdit}
              onCopy={onCopy}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <PlantTable
          plants={plants}
          plantNameMap={plantNameMap}
          onEdit={onEdit}
          onCopy={onCopy}
          onViewDetails={onViewDetails}
        />
      </div>
    </CardContent>
  );
};

export default PlantList;
