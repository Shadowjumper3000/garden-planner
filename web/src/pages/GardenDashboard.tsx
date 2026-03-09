import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger,
  DropdownMenuItem 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Garden, Plant, PlantingEvent, SoilCell, PlantPlacement, SoilHistoryEntry, PlacedPlant } from "@/types";
import { gardenAPI, plantAPI, soilHistoryAPI } from "@/api";
import { useQuery } from "@tanstack/react-query";
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, useDraggable, useDroppable } from "@dnd-kit/core";
import SoilCalendarWheel from "@/components/soil/SoilCalendarWheel";
import CompanionBadge from "@/components/garden/CompanionBadge";
import SimpleCalendarComponent from "@/components/garden/SimpleCalendarComponent";
import DraggablePlant from "@/components/garden/DraggablePlant";
import PlacedPlantTile from "@/components/garden/PlacedPlantTile";
import PlantPlaceholder from "@/components/garden/PlantPlaceholder";
import SoilStats from "@/components/garden/SoilStats";
import { CalendarDays, Edit, Leaf, Sprout, ChevronDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { getPlantColor } from "@/lib/plantUtils";
import { SCALE } from "@/constants/garden";

// DnD handled via @dnd-kit/core — DndContext wraps the whole layout

// SimpleCalendarComponent moved to components/garden/SimpleCalendarComponent.tsx

// `DraggablePlant` moved to components/garden/DraggablePlant.tsx

// ─── Garden canvas constants ───────────────────────────────────────────────
// SCALE (px/metre) and getPlantColor are imported from shared modules.

// `PlacedPlantTile` moved to components/garden/PlacedPlantTile.tsx

// ─── Garden canvas ──────────────────────────────────────────────────────────
const GardenCanvas = ({
  garden,
  plantPlacements,
  onDropPlant,
  onMovePlant,
  onRemovePlant,
}: {
  garden: Garden;
  plantPlacements: Map<string, PlacedPlant>;
  onDropPlant: (x: number, y: number, plant: Plant) => void;
  onMovePlant: (placementId: string, x: number, y: number) => void;
  onRemovePlant: (placementId: string) => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: 'garden-canvas' });
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const [movingId, setMovingId] = useState<string | null>(null);
  const moveStart = useRef<{ mouseX: number; mouseY: number; origX: number; origY: number } | null>(null);
  const [draggedPos, setDraggedPos] = useState<{ id: string; x: number; y: number } | null>(null);

  const canvasW = garden.widthM  * SCALE;
  const canvasH = garden.heightM * SCALE;
  const res     = garden.soilData.resolution || 0.5;
  const cellPx  = res * SCALE;

  const getNutrientColor = (cell: SoilCell | undefined) => {
    if (!cell) return 'rgba(94,75,62,0.1)';
    const avg = (cell.nitrogen + cell.phosphorus + cell.potassium) / 300;
    return `rgba(94,75,62,${(0.1 + avg * 0.4 + (cell.moisture / 100) * 0.2).toFixed(2)})`;
  };

  const handlePointerDown = (e: React.PointerEvent, id: string, origX: number, origY: number) => {
    e.stopPropagation(); e.preventDefault();
    setMovingId(id);
    moveStart.current = { mouseX: e.clientX, mouseY: e.clientY, origX, origY };

    // capture pointer on the target if possible
    try { (e.currentTarget as Element).setPointerCapture?.(e.pointerId); } catch {}

    const onMove = (me: PointerEvent) => {
      if (!moveStart.current) return;
      const { mouseX, mouseY, origX, origY } = moveStart.current!;
      const pp = plantPlacements.get(id);
      const dx = (me.clientX - mouseX) / SCALE;
      const dy = (me.clientY - mouseY) / SCALE;
      const newX = Math.max(0, Math.min(origX + dx, garden.widthM  - (pp?.widthM  || 0.5)));
      const newY = Math.max(0, Math.min(origY + dy, garden.heightM - (pp?.heightM || 0.5)));
      setDraggedPos({ id, x: newX, y: newY });
    };

    const onUp = (me: PointerEvent) => {
      // finalize move
      if (movingId === id && draggedPos?.id === id) {
        onMovePlant(id, draggedPos.x, draggedPos.y);
      }
      setMovingId(null);
      moveStart.current = null;
      setDraggedPos(null);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div className="overflow-auto border-2 border-garden-soil rounded-lg bg-garden-sand/30 shadow-inner p-1">
      <div className="w-full flex justify-center items-start">
        <div
          ref={(el) => { setNodeRef(el); canvasRef.current = el; }}
          className={`relative ${isOver ? 'ring-2 ring-garden-primary' : ''}`}
          style={{
            width: canvasW,
            height: canvasH,
            minWidth: canvasW,
            minHeight: canvasH,
            backgroundColor: '#efe7d6',
            backgroundImage: 'radial-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)',
            backgroundSize: '12px 12px',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.04)'
          }}
          onPointerMove={() => { /* pointer handled via window listeners when dragging */ }}
          onPointerUp={() => { /* pointer handled via window listeners when dragging */ }}
        >
        {/* Soil impact blobs (rendered as circles) */}
        {garden.soilData.cells.map((cell, i) => (
          <div
            key={i}
            className="absolute pointer-events-none"
            style={{
              left:  cell.x * SCALE,
              top:   cell.y * SCALE,
              width:  cellPx,
              height: cellPx,
              borderRadius: '9999px',
              background: `radial-gradient(circle at 50% 50%, ${getNutrientColor(cell)} 0%, rgba(0,0,0,0) 75%)`,
              mixBlendMode: 'multiply',
              filter: 'blur(1px)'
            }}
            title={`pH:${cell.ph.toFixed(1)} N:${cell.nitrogen}% M:${cell.moisture}%`}
          />
        ))}

        {/* Grid disabled: free-coordinate placement used instead */}

        {/* Placed plants */}
        {Array.from(plantPlacements.entries()).map(([id, pp]) => {
          const x = draggedPos?.id === id ? draggedPos.x : pp.x;
          const y = draggedPos?.id === id ? draggedPos.y : pp.y;
          return (
            <PlacedPlantTile
              key={id}
              pp={{ ...pp, x, y }}
              isMoving={movingId === id}
              onPointerDown={(e) => handlePointerDown(e, id, pp.x, pp.y)}
              onRemove={() => onRemovePlant(id)}
            />
          );
        })}
      </div>
    </div>
    </div>
  );
};

// ─── Legacy: Component for droppable soil cell (kept for dialog logic) ───────
interface DroppableSoilCellProps {
  row: number;
  col: number;
  soilCell: SoilCell;
  onDrop: (row: number, col: number, plant: Plant) => void;
  onRemovePlant: (row: number, col: number) => void;
  plantPlacement?: { plant: Plant } | null;
  plants: Plant[];
  placements: Map<string, { plant: Plant }>;
}

const DroppableSoilCell = (props: DroppableSoilCellProps) => {
  const { row, col, soilCell, onDrop, onRemovePlant, plantPlacement = null, plants, placements } = props;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSoilInfoDialogOpen, setIsSoilInfoDialogOpen] = useState(false);
  const { isOver, setNodeRef: dropRef } = useDroppable({
    id: `${row}-${col}`,
  });

  // Calculate color based on soil health
  const getSoilHealthColor = () => {
    // pH-based health indicator
    const pH = soilCell.ph;
    
    // pH health ranges
    if (pH < 4 || pH > 10) return '#ff5252'; // Red - very poor
    if (pH < 5 || pH > 9) return '#ff9100';  // Orange - poor
    if (pH < 5.5 || pH > 8) return '#ffdc00'; // Yellow - fair
    if (pH >= 5.5 && pH <= 7.5) return '#4caf50'; // Green - good
    
    return '#80cbc4'; // Teal - moderate
  };

  // Calculate soil color based on nutrients
  const getNutrientColor = () => {
    // Default soil color with opacity based on moisture
    const moistureFactor = soilCell.moisture / 100;
    
    // Use more brown if a plant is placed
    if (plantPlacement) {
      return `rgba(94, 75, 62, ${0.4 + moistureFactor * 0.6})`;
    }
    
    // Average of nutrient levels for color intensity
    const avgNutrients = (soilCell.nitrogen + soilCell.phosphorus + soilCell.potassium) / 300;
    return `rgba(94, 75, 62, ${0.1 + avgNutrients * 0.4})`;
  };

  // Get plant recommendations based on soil pH
  const getPlantRecommendations = () => {
    const pH = soilCell.ph;
    const nitrogen = soilCell.nitrogen;
    const phosphorus = soilCell.phosphorus;
    const potassium = soilCell.potassium;
    
    // Filter plants based on soil conditions
    return plants.filter(plant => {
      // This is a simplified recommendation algorithm
      // In a real app, you would have more sophisticated matching
      
      // For now, just recommend plants that match pH range and have positive
      // impact on nutrients that are low, or can thrive with existing nutrients
      const nutrientScore = 
        (nitrogen < 30 ? plant.nutrients.nitrogenImpact > 0 ? 1 : 0 : 0) +
        (phosphorus < 30 ? plant.nutrients.phosphorusImpact > 0 ? 1 : 0 : 0) +
        (potassium < 30 ? plant.nutrients.potassiumImpact > 0 ? 1 : 0 : 0);
      
      return nutrientScore >= 1;
    }).slice(0, 3); // Limit to 3 recommended plants
  };
  
  // Get soil health status text
  const getSoilHealthStatus = () => {
    const pH = soilCell.ph;
    
    if (pH < 4 || pH > 10) return "Very Poor";
    if (pH < 5 || pH > 9) return "Poor";
    if (pH < 5.5 || pH > 8) return "Fair";
    if (pH >= 5.5 && pH <= 7.5) return "Good";
    
    return "Moderate";
  };

  // Function to handle opening appropriate dialog based on whether there's a plant
  const handleCellClick = () => {
    if (plantPlacement) {
      setIsSoilInfoDialogOpen(true);
    } else {
      setIsDialogOpen(true);
    }
  };

  return (
    <>
      <div
        ref={dropRef}
        className={`soil-cell relative ${isOver ? "ring-2 ring-garden-primary" : ""} ${!plantPlacement && isOver ? "bg-garden-primary/10" : ""}`}
        style={{ backgroundColor: getNutrientColor() }}
        onClick={handleCellClick}
      >
        {/* Health indicator overlay */}
        <div 
          className="absolute top-0 left-0 right-0 bottom-0 opacity-30"
          style={{ backgroundColor: getSoilHealthColor() }}
        ></div>

        {/* Companion plant badges on cell edges */}
        <CompanionBadge row={row} col={col} placements={placements} />

        {plantPlacement && (
          <div className="w-full h-full flex items-center justify-center group">
            <div className="w-3/4 h-3/4 rounded-full overflow-hidden flex items-center justify-center bg-garden-secondary/20">
              {plantPlacement.plant.imageUrl ? (
                <img 
                  src={plantPlacement.plant.imageUrl} 
                  alt={plantPlacement.plant.name} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Handle image loading errors
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = `<svg class="h-1/2 w-1/2 text-garden-secondary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9C4 4 7 3 10 3" /><path d="M8 14c-2 0-4-1-4-4" /><path d="M21 10c-1.7-1-3-1-5-1" /><path d="M8 10c0 3.5 6 4.5 8 1" /><path d="M19 9c.3 1.2 0 2.4-.7 3.9" /><path d="M21 15c-1 1-3 2-7 2s-6-1-7-2c-1.7 1.5-2 3-2 5h18c0-2-.4-3.5-2-5Z" /></svg>`;
                  }}
                />
              ) : (
                <Leaf className="h-1/2 w-1/2 text-garden-secondary group-hover:opacity-80 transition-opacity" />
              )}
            </div>
            
            {/* Plant info tooltip on hover - always visible */}
            <div className="absolute inset-0 bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-1 text-xs">
              <p className="font-semibold">{plantPlacement.plant.name}</p>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onRemovePlant(row, col);
                }} 
                className="mt-1 bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded text-[10px]"
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Soil Info Dialog for empty cells */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: getSoilHealthColor() }}
              ></div>
              Soil Information ({row+1}, {col+1})
            </DialogTitle>
            <DialogDescription>
              Health Status: <span className="font-medium">{getSoilHealthStatus()}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium mb-1">Soil Properties</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>pH Level:</span>
                  <span className="font-medium">{soilCell.ph.toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Nitrogen:</span>
                  <span className="font-medium">{soilCell.nitrogen}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Phosphorus:</span>
                  <span className="font-medium">{soilCell.phosphorus}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Potassium:</span>
                  <span className="font-medium">{soilCell.potassium}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Moisture:</span>
                  <span className="font-medium">{soilCell.moisture}%</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-1">Recommendations</h3>
              <div className="text-xs text-muted-foreground mb-2">
                {soilCell.ph < 5 && "This soil is acidic. Consider adding lime to raise pH."}
                {soilCell.ph > 8 && "This soil is alkaline. Consider adding sulfur to lower pH."}
                {(soilCell.nitrogen < 30) && "Low nitrogen. Consider adding compost or nitrogen fertilizer."}
                {(soilCell.phosphorus < 30) && "Low phosphorus. Consider adding bone meal or rock phosphate."}
                {(soilCell.potassium < 30) && "Low potassium. Consider adding wood ash or potassium fertilizer."}
                {(soilCell.moisture < 30) && "Low moisture. Consider adding organic matter to improve water retention."}
                {(soilCell.nitrogen >= 30 && soilCell.phosphorus >= 30 && soilCell.potassium >= 30 && soilCell.ph >= 5.5 && soilCell.ph <= 7.5) && 
                  "Soil conditions are good for most plants."}
              </div>
              
              <h4 className="text-xs font-medium">Recommended Plants:</h4>
              <div className="grid grid-cols-1 gap-1 mt-1">
                {getPlantRecommendations().map(plant => (
                  <div 
                    key={plant.id}
                    className="flex items-center gap-2 bg-green-50 p-1 rounded text-xs cursor-pointer hover:bg-green-100"
                    onClick={() => {
                      onDrop(row, col, plant);
                      setIsDialogOpen(false);
                    }}
                  >
                    <div className="w-5 h-5 rounded-full overflow-hidden bg-garden-secondary/10 flex-shrink-0 flex items-center justify-center">
                      {plant.imageUrl ? (
                        <img 
                          src={plant.imageUrl} 
                          alt={plant.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Sprout className="h-3 w-3 text-garden-secondary" />
                      )}
                    </div>
                    <span>{plant.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 border-t pt-4">
            <h3 className="text-sm font-medium mb-2">Plant Selection</h3>
            <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto">
              {plants.map((plant) => (
                <div 
                  key={plant.id} 
                  onClick={() => {
                    onDrop(row, col, plant);
                    setIsDialogOpen(false);
                  }}
                  className="flex flex-col items-center gap-1 p-1 cursor-pointer hover:bg-gray-100 rounded text-center"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-garden-secondary/10 flex-shrink-0 flex items-center justify-center">
                    {plant.imageUrl ? (
                      <img 
                        src={plant.imageUrl} 
                        alt={plant.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Sprout className="h-4 w-4 text-garden-secondary" />
                    )}
                  </div>
                  <span className="text-xs truncate w-full">{plant.name}</span>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Plant and Soil Info Dialog for planted cells */}
      {plantPlacement && (
        <Dialog open={isSoilInfoDialogOpen} onOpenChange={setIsSoilInfoDialogOpen}>
          <DialogContent className="max-w-md overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-garden-secondary/20">
                  {plantPlacement.plant.imageUrl ? (
                    <img
                      src={plantPlacement.plant.imageUrl}
                      alt={plantPlacement.plant.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Sprout className="h-4 w-4 text-garden-secondary" />
                  )}
                </div>
                <span>{plantPlacement.plant.name} at ({row+1}, {col+1})</span>
              </DialogTitle>
              <DialogDescription>
                Soil Health Status: <span className="font-medium">{getSoilHealthStatus()}</span>
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium mb-2">Plant Information</h3>
                <div className="space-y-3">
                  <div>
                    <h4 className="text-xs font-medium">Description</h4>
                    <p className="text-sm text-muted-foreground">{plantPlacement.plant.description}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-medium">Growth Cycle</h4>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      <div className="bg-green-50 p-1 rounded text-center">
                        <div className="text-xs text-muted-foreground">Germination</div>
                        <div className="text-sm font-medium">{plantPlacement.plant.growthCycle.germination} days</div>
                      </div>
                      <div className="bg-green-50 p-1 rounded text-center">
                        <div className="text-xs text-muted-foreground">Maturity</div>
                        <div className="text-sm font-medium">{plantPlacement.plant.growthCycle.maturity} days</div>
                      </div>
                      <div className="bg-green-50 p-1 rounded text-center">
                        <div className="text-xs text-muted-foreground">Harvest</div>
                        <div className="text-sm font-medium">{plantPlacement.plant.growthCycle.harvest} days</div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-medium">Nutrient Impact</h4>
                    <div className="flex gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${plantPlacement.plant.nutrients.nitrogenImpact > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        N: {plantPlacement.plant.nutrients.nitrogenImpact > 0 ? "+" : ""}{plantPlacement.plant.nutrients.nitrogenImpact}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${plantPlacement.plant.nutrients.phosphorusImpact > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        P: {plantPlacement.plant.nutrients.phosphorusImpact > 0 ? "+" : ""}{plantPlacement.plant.nutrients.phosphorusImpact}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${plantPlacement.plant.nutrients.potassiumImpact > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        K: {plantPlacement.plant.nutrients.potassiumImpact > 0 ? "+" : ""}{plantPlacement.plant.nutrients.potassiumImpact}
                      </span>
                    </div>
                  </div>
                  
                  {plantPlacement.plant.compatiblePlants && plantPlacement.plant.compatiblePlants.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium">Companion Plants</h4>
                      <p className="text-sm">{plantPlacement.plant.compatiblePlants.join(', ')}</p>
                      {plantPlacement.plant.companionBenefits && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="italic">Benefits:</span> {plantPlacement.plant.companionBenefits}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">Soil Properties</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>pH Level:</span>
                      <span className="font-medium">{soilCell.ph.toFixed(1)}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
                      <div 
                        className="h-full"
                        style={{ 
                          width: `${(soilCell.ph / 14) * 100}%`,
                          background: "linear-gradient(to right, #f87171, #fbbf24, #34d399)" 
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Nitrogen:</span>
                      <span className="text-sm font-medium">{soilCell.nitrogen}%</span>
                    </div>
                    <Progress value={soilCell.nitrogen} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Phosphorus:</span>
                      <span className="text-sm font-medium">{soilCell.phosphorus}%</span>
                    </div>
                    <Progress value={soilCell.phosphorus} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Potassium:</span>
                      <span className="text-sm font-medium">{soilCell.potassium}%</span>
                    </div>
                    <Progress value={soilCell.potassium} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Moisture:</span>
                      <span className="text-sm font-medium">{soilCell.moisture}%</span>
                    </div>
                    <Progress value={soilCell.moisture} className="h-2" />
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => {
                  onRemovePlant(row, col);
                  setIsSoilInfoDialogOpen(false);
                }}
              >
                Remove Plant
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsSoilInfoDialogOpen(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

const GardenDashboard = () => {
  const { id: gardenId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [garden, setGarden] = useState<Garden | null>(null);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [plantPlacements, setPlantPlacements] = useState<Map<string, PlacedPlant>>(new Map());
  const [events, setEvents] = useState<PlantingEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<SoilHistoryEntry | null>(null);
  const [activeDragPlant, setActiveDragPlant] = useState<Plant | null>(null);

  // Soil history for the calendar wheel
  const { data: soilHistory = [] } = useQuery<SoilHistoryEntry[]>({
    queryKey: ["soilHistory", gardenId],
    queryFn: () => soilHistoryAPI.getHistory(gardenId!),
    enabled: !!gardenId && isAuthenticated,
  });

  const handleHistorySelect = (entry: SoilHistoryEntry) => {
    setSelectedHistoryEntry(entry);
  };

  // @dnd-kit drag end — plant dropped from sidebar onto canvas
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragPlant(null);
    const { active, over, delta, activatorEvent: ae } = event;
    if (over?.id !== 'garden-canvas' || !garden) return;
    const plant = (active.data?.current as { plant?: Plant })?.plant;
    if (!plant) return;
    const canvasRect = over.rect;
    // Prefer the active item's final bounding rect (more accurate), fallback to activatorEvent+delta
    const diam = plant.size.widthM;
    let centerClientX = 0;
    let centerClientY = 0;
    if (active?.rect?.current?.translated && typeof active.rect.current.translated.left === 'number' && typeof active.rect.current.translated.width === 'number') {
      centerClientX = active.rect.current.translated.left + (active.rect.current.translated.width / 2);
      centerClientY = active.rect.current.translated.top  + (active.rect.current.translated.height / 2);
    } else {
      const me = ae as MouseEvent;
      centerClientX = (me?.clientX || 0) + delta.x;
      centerClientY = (me?.clientY || 0) + delta.y;
    }

    const rawX = (centerClientX - canvasRect.left) / SCALE - diam / 2;
    const rawY = (centerClientY - canvasRect.top)  / SCALE - diam / 2;
    const x = Math.max(0, Math.min(rawX, garden.widthM  - diam));
    const y = Math.max(0, Math.min(rawY, garden.heightM - diam));
    handlePlantDrop(x, y, plant);
  };

  const editGardenSchema = z.object({
    name: z.string().min(1, "Garden name is required"),
    widthM:  z.number().min(0.5, "Minimum 0.5m").max(50, "Maximum 50m"),
    heightM: z.number().min(0.5, "Minimum 0.5m").max(50, "Maximum 50m"),
    defaultMoisture:   z.number().min(0).max(100),
    defaultNitrogen:   z.number().min(0).max(100),
    defaultPhosphorus: z.number().min(0).max(100),
    defaultPotassium:  z.number().min(0).max(100),
    defaultPh:         z.number().min(0).max(14),
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    resolver: zodResolver(editGardenSchema),
    defaultValues: {
      name:    garden?.name     || "",
      widthM:  garden?.widthM  || 5,
      heightM: garden?.heightM || 5,
      defaultMoisture:   50,
      defaultNitrogen:   50,
      defaultPhosphorus: 50,
      defaultPotassium:  50,
      defaultPh: 7,
    },
  });

  const avgSoilProp = (key: keyof SoilCell) => {
    const cells = garden?.soilData.cells ?? [];
    if (!cells.length) return 50;
    return Math.round((cells.reduce((s, c) => s + (c[key] as number), 0) / cells.length) * 10) / 10;
  };

  useEffect(() => {
    const loadGardenData = async () => {
      if (!isAuthenticated) {
        navigate('/login');
        return;
      }
      
      try {
        setIsLoading(true);
        
        // Use the real API to fetch garden data
        const garden = await gardenAPI.getById(gardenId!);
        setGarden(garden);
        
        // Use the real API to fetch plants
        const plantsData = await plantAPI.getAll();
        setPlants(plantsData);
        
        // Initialize plant placements from the garden data
        const initialPlacements = new Map<string, PlacedPlant>();
        if (garden.plants && garden.plants.length > 0) {
          for (const placement of garden.plants) {
            const plant = plantsData.find(p => p.id === placement.plantId);
            if (plant) {
              initialPlacements.set(placement.id, {
                id:      placement.id,
                plant,
                x:       placement.x,
                y:       placement.y,
                widthM:  placement.widthM,
                heightM: placement.heightM,
              });
            }
          }
        }
        setPlantPlacements(initialPlacements);
        
        // Create calendar events from plant placements
        const calendarEvents: PlantingEvent[] = [];
        if (garden.plants && garden.plants.length > 0) {
          for (const placement of garden.plants) {
            const plant = plantsData.find(p => p.id === placement.plantId);
            if (plant) {
              const posKey = placement.id;
              calendarEvents.push({
                id: `planting-${placement.plantId}-${posKey}`,
                title: `Plant ${plant.name}`,
                start: new Date(placement.plantedDate).toISOString().split('T')[0],
                plantId: plant.id,
                gardenId: garden.id,
                type: 'planting',
                color: '#4B7F52',
              });
              const plantDate  = new Date(placement.plantedDate);
              const harvestDate = new Date(plantDate);
              harvestDate.setDate(plantDate.getDate() + plant.growthCycle.harvest);
              calendarEvents.push({
                id: `harvest-${placement.plantId}-${posKey}`,
                title: `Harvest ${plant.name}`,
                start: harvestDate.toISOString().split('T')[0],
                plantId: plant.id,
                gardenId: garden.id,
                type: 'harvest',
                color: '#f97316',
              });
            }
          }
        }
        
        setEvents(calendarEvents);
      } catch (error) {
        console.error("Error loading garden:", error);
        toast({
          title: "Error",
          description: "Failed to load garden data.",
          variant: "destructive",
        });
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadGardenData();
  }, [gardenId, isAuthenticated, navigate, toast]);

  const handlePlantDrop = async (x: number, y: number, plant: Plant) => {
    if (!garden) return;
    const plantDateStr = new Date().toISOString().split('T')[0];
    // Top-down view: both dimensions equal the plant's diameter (widthM)
    const widthM  = plant.size.widthM;
    const heightM = plant.size.widthM;

    try {
      const updatedGarden = await gardenAPI.addPlant(gardenId!, {
        plantId: plant.id,
        date:    plantDateStr,
        x, y, widthM, heightM,
      });

      // Find the newly-created placement by position
      const newPl = updatedGarden.plants?.find(
        pp => pp.plantId === plant.id && Math.abs(pp.x - x) < 0.01 && Math.abs(pp.y - y) < 0.01
      );
      if (newPl) {
        setPlantPlacements(prev => new Map(prev).set(newPl.id, {
          id: newPl.id, plant, x, y, widthM, heightM,
        }));
      }
      setGarden(updatedGarden);

      const harvestDate = new Date(plantDateStr);
      harvestDate.setDate(harvestDate.getDate() + plant.growthCycle.harvest);
      setEvents(ev => [...ev,
        { id: `p-${Date.now()}`,   title: `Plant ${plant.name}`,   start: plantDateStr,                              plantId: plant.id, gardenId: gardenId!, type: 'planting', color: '#4B7F52' },
        { id: `h-${Date.now()+1}`, title: `Harvest ${plant.name}`, start: harvestDate.toISOString().split('T')[0],   plantId: plant.id, gardenId: gardenId!, type: 'harvest',  color: '#f97316' },
      ]);

      toast({ title: "Plant Added", description: `${plant.name} added to your garden.` });
    } catch (error) {
      console.error("Error adding plant:", error);
      toast({ title: "Error", description: "Failed to add plant.", variant: "destructive" });
    }
  };

  const handleMovePlant = async (placementId: string, x: number, y: number) => {
    const pp = plantPlacements.get(placementId);
    if (!pp) return;
    // Optimistic update
    setPlantPlacements(prev => new Map(prev).set(placementId, { ...pp, x, y }));
    try {
      await gardenAPI.movePlant(gardenId!, placementId, { x, y, widthM: pp.widthM, heightM: pp.heightM });
    } catch (error) {
      // Rollback
      setPlantPlacements(prev => new Map(prev).set(placementId, pp));
      toast({ title: "Error", description: "Failed to move plant.", variant: "destructive" });
    }
  };

  const handleRemovePlant = async (placementId: string) => {
    const pp = plantPlacements.get(placementId);
    // Optimistic removal
    setPlantPlacements(prev => { const m = new Map(prev); m.delete(placementId); return m; });
    try {
      // removePlant returns the updated garden — soil may be reverted if planted today
      const updatedGarden = await gardenAPI.removePlant(gardenId!, placementId);
      setGarden(updatedGarden);
      toast({ title: "Plant Removed", description: `${pp?.plant.name ?? 'Plant'} removed from garden.` });
    } catch (error) {
      console.error("Error removing plant:", error);
      if (pp) setPlantPlacements(prev => new Map(prev).set(placementId, pp));
      toast({ title: "Error", description: "Failed to remove plant.", variant: "destructive" });
    }
  };

  const handleEditGarden = async (data: { 
    name: string; 
    widthM: number;
    heightM: number;
    defaultMoisture: number;
    defaultNitrogen: number;
    defaultPhosphorus: number;
    defaultPotassium: number;
    defaultPh: number;
  }) => {
    try {
      const updatedGarden = await gardenAPI.update(gardenId!, { name: data.name, widthM: data.widthM, heightM: data.heightM });
      setGarden(updatedGarden);
      toast({ title: "Garden Updated", description: "Your garden has been successfully updated." });
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating garden:", error);
      toast({ title: "Error", description: "Failed to update garden.", variant: "destructive" });
    }
  };

  const handleDeleteGarden = async () => {
    try {
      await gardenAPI.delete(gardenId!);
      toast({
        title: "Garden Deleted",
        description: "Your garden has been successfully deleted.",
      });
      navigate('/'); // Navigate back to home page
    } catch (error) {
      console.error("Error deleting garden:", error);
      toast({
        title: "Error",
        description: "Failed to delete garden.",
        variant: "destructive",
      });
    }
  };

  if (isLoading || !garden) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-garden-primary"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-garden-primary">{garden.name}</h1>
            <p className="text-muted-foreground">
              {garden.widthM}m × {garden.heightM}m • Last updated {new Date(garden.soilData.lastUpdated).toLocaleDateString()}
            </p>
          </div>
          <Button variant="outline" onClick={() => {
            setValue("name",    garden.name);
            setValue("widthM",  garden.widthM);
            setValue("heightM", garden.heightM);
            setValue("defaultMoisture",   avgSoilProp('moisture'));
            setValue("defaultNitrogen",   avgSoilProp('nitrogen'));
            setValue("defaultPhosphorus", avgSoilProp('phosphorus'));
            setValue("defaultPotassium",  avgSoilProp('potassium'));
            setValue("defaultPh",         avgSoilProp('ph'));
            setIsEditDialogOpen(true);
          }}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Garden
          </Button>
        </div>
        
        <DndContext
          onDragStart={(e: DragStartEvent) => {
            const p = (e.active.data?.current as { plant?: Plant })?.plant;
            if (p) setActiveDragPlant(p);
          }}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveDragPlant(null)}
        >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Tabs defaultValue="grid">
              <TabsList className="mb-4">
                <TabsTrigger value="grid" className="flex items-center gap-1">
                  <Sprout className="h-4 w-4" />
                  <span>Garden Grid</span>
                </TabsTrigger>
                <TabsTrigger value="calendar" className="flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" />
                  <span>Calendar</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="grid">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-serif">Garden Layout</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <GardenCanvas
                      garden={garden}
                      plantPlacements={plantPlacements}
                      onDropPlant={handlePlantDrop}
                      onMovePlant={handleMovePlant}
                      onRemovePlant={handleRemovePlant}
                    />
                    <div className="mt-3 text-sm text-muted-foreground text-center">
                      Drag a plant from the sidebar onto the canvas. Drag placed plants to reposition.
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="calendar">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-serif">Planting Calendar</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SimpleCalendarComponent events={events} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          
          <div>
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-serif">Soil Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <SoilStats cells={garden.soilData.cells} />
                  {soilHistory.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Soil History</p>
                      <SoilCalendarWheel
                        history={soilHistory}
                        onSelect={handleHistorySelect}
                        selectedDate={selectedHistoryEntry?.recordedAt}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-serif">Plant Library</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {plants.map(plant => (
                      <DraggablePlant key={plant.id} plant={plant} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
          {/* Floating ghost that follows the cursor while dragging from the sidebar */}
          <DragOverlay dropAnimation={null}>
            {activeDragPlant ? (
              <div
                className="rounded-full overflow-hidden border-2 border-garden-primary shadow-2xl opacity-90 pointer-events-none"
                style={{
                  width:  Math.max(activeDragPlant.size.widthM * SCALE, 40),
                  height: Math.max(activeDragPlant.size.widthM * SCALE, 40),
                }}
              >
                {activeDragPlant.imageUrl ? (
                  <img src={activeDragPlant.imageUrl} alt={activeDragPlant.name} className="w-full h-full object-cover" />
                ) : (
                  <PlantPlaceholder name={activeDragPlant.name} />
                )}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md md:max-w-lg" style={{ resize: 'none' }}>
          <DialogHeader>
            <DialogTitle>Edit Garden</DialogTitle>
            <DialogDescription>
              Update the garden name and soil properties.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleEditGarden)}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Garden Name</Label>
                <Input id="name" {...register("name")} />
                {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="widthM">Width (m)</Label>
                    <Input
                      id="widthM"
                      type="number"
                      min={0.5}
                      max={50}
                      step={0.5}
                      {...register("widthM", { valueAsNumber: true })}
                    />
                    {errors.widthM && <p className="text-red-600 text-sm mt-1">{errors.widthM.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="heightM">Height (m)</Label>
                    <Input
                      id="heightM"
                      type="number"
                      min={0.5}
                      max={50}
                      step={0.5}
                      {...register("heightM", { valueAsNumber: true })}
                    />
                    {errors.heightM && <p className="text-red-600 text-sm mt-1">{errors.heightM.message}</p>}
                  </div>
                </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="font-medium mb-2">Soil Default Properties</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="defaultMoisture">Moisture (%)</Label>
                    <Input 
                      id="defaultMoisture" 
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      {...register("defaultMoisture", { valueAsNumber: true })} 
                    />
                    {errors.defaultMoisture && <p className="text-red-600 text-sm mt-1">{errors.defaultMoisture.message}</p>}
                  </div>
                  
                  <div>
                    <Label htmlFor="defaultNitrogen">Nitrogen (%)</Label>
                    <Input 
                      id="defaultNitrogen" 
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      {...register("defaultNitrogen", { valueAsNumber: true })} 
                    />
                    {errors.defaultNitrogen && <p className="text-red-600 text-sm mt-1">{errors.defaultNitrogen.message}</p>}
                  </div>
                  
                  <div>
                    <Label htmlFor="defaultPhosphorus">Phosphorus (%)</Label>
                    <Input 
                      id="defaultPhosphorus" 
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      {...register("defaultPhosphorus", { valueAsNumber: true })} 
                    />
                    {errors.defaultPhosphorus && <p className="text-red-600 text-sm mt-1">{errors.defaultPhosphorus.message}</p>}
                  </div>
                  
                  <div>
                    <Label htmlFor="defaultPotassium">Potassium (%)</Label>
                    <Input 
                      id="defaultPotassium" 
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      {...register("defaultPotassium", { valueAsNumber: true })} 
                    />
                    {errors.defaultPotassium && <p className="text-red-600 text-sm mt-1">{errors.defaultPotassium.message}</p>}
                  </div>
                  
                  <div className="sm:col-span-2">
                    <Label htmlFor="defaultPh">pH Level (0-14): {watch("defaultPh")}</Label>
                    <div className="mt-2">
                      <Slider
                        id="defaultPh"
                        min={0}
                        max={14}
                        step={0.1}
                        className="py-1"
                        value={[watch("defaultPh")]}
                        onValueChange={([value]) => setValue("defaultPh", value)}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Acidic (0-6)</span>
                      <span>Neutral (7)</span>
                      <span>Alkaline (8-14)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2 mt-6">
              <Button 
                type="button" 
                variant="destructive"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setDeleteConfirmOpen(true);
                }}
              >
                Delete Garden
              </Button>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm" style={{ resize: 'none' }}>
          <DialogHeader>
            <DialogTitle>Delete Garden</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this garden? All plants and data will be permanently lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              className="sm:flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteGarden}
              className="sm:flex-1"
            >
              Delete Garden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default GardenDashboard;
