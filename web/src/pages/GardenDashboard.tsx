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
import { Garden, Plant, PlantingEvent, SoilCell, PlantPlacement, SoilHistoryEntry } from "@/types";
import { gardenAPI, plantAPI, soilHistoryAPI } from "@/api";
import { useQuery } from "@tanstack/react-query";
import { DndContext, DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import SoilCalendarWheel from "@/components/soil/SoilCalendarWheel";
import CompanionBadge from "@/components/garden/CompanionBadge";
import { CalendarDays, Edit, Leaf, Sprout, ChevronDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// DnD handled via @dnd-kit/core — DndContext wraps the whole layout

// Create a simple calendar component
const SimpleCalendarComponent = ({ events }: { events: PlantingEvent[] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
  
  // Get events for current month
  const filteredEvents = events.filter(event => {
    const eventDate = new Date(event.start);
    return eventDate.getMonth() === currentDate.getMonth() && 
           eventDate.getFullYear() === currentDate.getFullYear();
  });
  
  // Helper to get all days in current month
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({
        date,
        dayNumber: i,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        events: filteredEvents.filter(event => 
          new Date(event.start).toDateString() === date.toDateString()
        )
      });
    }
    return days;
  };
  
  // Get current month days
  const days = getDaysInMonth();
  
  // Get first day of month to calculate offset
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const firstDayOfWeek = firstDayOfMonth.getDay(); // 0 for Sunday, 1 for Monday, etc.
  
  // Change month
  const nextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };
  
  const prevMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };
  
  // Get to current month
  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  // Get color and icon based on event type
  const getEventStyle = (type: string) => {
    switch(type) {
      case 'planting':
        return {
          bgColor: 'bg-garden-primary/20',
          textColor: 'text-garden-primary',
          icon: <Sprout className="h-3 w-3 mr-1" />
        };
      case 'harvest':
        return {
          bgColor: 'bg-orange-300/30',
          textColor: 'text-orange-700',
          icon: <svg className="h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" /><path d="M8 16h.01" /><path d="M8 20h.01" /><path d="M12 18h.01" /><path d="M12 22h.01" /><path d="M16 16h.01" /><path d="M16 20h.01" /></svg>
        };
      default:
        return {
          bgColor: 'bg-gray-200',
          textColor: 'text-gray-700',
          icon: null
        };
    }
  };

  // Format the date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };
  
  return (
    <div className="calendar-container">
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={prevMonth}
          >
            Previous
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={goToToday}
          >
            Today
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={nextMonth}
          >
            Next
          </Button>
        </div>
        <h2 className="text-xl font-medium">
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex space-x-2">
          <Button
            variant={viewMode === 'month' ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode('month')}
          >
            Month
          </Button>
          <Button
            variant={viewMode === 'list' ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            List
          </Button>
        </div>
      </div>
      
      {viewMode === 'month' ? (
        <div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {/* Add empty cells for days before the first day of month */}
            {Array.from({ length: firstDayOfWeek }).map((_, index) => (
              <div key={`empty-${index}`} className="h-24 border rounded bg-gray-50 p-1"></div>
            ))}
            
            {/* Render all days of the month */}
            {days.map(({ date, dayNumber, events }) => (
              <div 
                key={dayNumber} 
                className={`h-24 border rounded p-1 overflow-y-auto ${
                  date.toDateString() === new Date().toDateString() ? 'bg-garden-primary/10' : ''
                }`}
              >
                <div className="font-medium text-sm mb-1">{dayNumber}</div>
                {events.map(event => {
                  const style = getEventStyle(event.type);
                  return (
                    <div 
                      key={event.id} 
                      className={`text-xs p-1 mb-1 rounded truncate flex items-center ${style.bgColor} ${style.textColor}`}
                      title={event.title}
                    >
                      {style.icon}
                      <span className="truncate flex-1">{event.title}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEvents.length > 0 ? (
            filteredEvents
              .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
              .map(event => {
                const style = getEventStyle(event.type);
                return (
                  <div 
                    key={event.id} 
                    className={`p-3 rounded flex items-center space-x-3 ${style.bgColor}`}
                  >
                    <div 
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        event.type === 'planting' ? 'bg-garden-primary/20' : 'bg-orange-300/30'
                      }`}
                    >
                      {style.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium truncate ${style.textColor}`}>{event.title}</div>
                      <div className="text-sm text-muted-foreground flex items-center">
                        <CalendarDays className="h-3 w-3 mr-1" />
                        {formatDate(event.start)}
                      </div>
                    </div>
                  </div>
                );
              })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No events for {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
          )}
        </div>
      )}
      
      {/* Legend */}
      <div className="flex gap-4 justify-end mt-4 text-xs text-muted-foreground">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-garden-primary/20 rounded mr-1"></div>
          <span>Planting</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-orange-300/30 rounded mr-1"></div>
          <span>Harvest</span>
        </div>
      </div>
    </div>
  );
};

// Component for draggable plant item
const DraggablePlant = ({ plant }: { plant: Plant }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: plant.id,
    data: { plant },
  });

  const dragStyle = transform
    ? { transform: CSS.Transform.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      {...listeners}
      {...attributes}
      className={`plant-item cursor-grab ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-garden-secondary/10 flex items-center justify-center">
          {plant.imageUrl ? (
            <img 
              src={plant.imageUrl} 
              alt={plant.name} 
              className="w-full h-full object-cover"
              onError={(e) => {
                // Handle image loading errors by replacing with icon
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center"><svg class="h-5 w-5 text-garden-secondary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9C4 4 7 3 10 3" /><path d="M8 14c-2 0-4-1-4-4" /><path d="M21 10c-1.7-1-3-1-5-1" /><path d="M8 10c0 3.5 6 4.5 8 1" /><path d="M19 9c.3 1.2 0 2.4-.7 3.9" /><path d="M21 15c-1 1-3 2-7 2s-6-1-7-2c-1.7 1.5-2 3-2 5h18c0-2-.4-3.5-2-5Z" /></svg></div>`;
              }}
            />
          ) : (
            <Sprout className="h-5 w-5 text-garden-secondary" />
          )}
        </div>
        <div>
          <h4 className="font-medium">{plant.name}</h4>
          <div className="flex gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded ${plant.nutrients.nitrogenImpact > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
              N: {plant.nutrients.nitrogenImpact > 0 ? "+" : ""}{plant.nutrients.nitrogenImpact}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded ${plant.nutrients.phosphorusImpact > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
              P: {plant.nutrients.phosphorusImpact > 0 ? "+" : ""}{plant.nutrients.phosphorusImpact}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded ${plant.nutrients.potassiumImpact > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
              K: {plant.nutrients.potassiumImpact > 0 ? "+" : ""}{plant.nutrients.potassiumImpact}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Component for droppable soil cell
const DroppableSoilCell = ({ 
  row, 
  col, 
  soilCell, 
  onDrop, 
  onRemovePlant,
  plantPlacement = null,
  plants,
  placements,
}: { 
  row: number; 
  col: number; 
  soilCell: SoilCell; 
  onDrop: (row: number, col: number, plant: Plant) => void; 
  onRemovePlant: (row: number, col: number) => void;
  plantPlacement?: { plant: Plant } | null;
  plants: Plant[];
  placements: Map<string, { plant: Plant }>;
}) => {
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

const SoilStats = ({ soilData }: { soilData: SoilCell[][] }) => {
  // Calculate average soil stats
  const calculateAverage = (nutrient: keyof SoilCell) => {
    let sum = 0;
    let count = 0;
    
    soilData.forEach(row => {
      row.forEach(cell => {
        sum += cell[nutrient] as number;
        count += 1;
      });
    });
    
    return count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
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
          <div 
            className="h-full"
            style={{ 
              width: `${(avgPh / 14) * 100}%`,
              background: "linear-gradient(to right, #f87171, #fbbf24, #34d399)" 
            }}
          ></div>
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

const GardenDashboard = () => {
  const { id: gardenId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [garden, setGarden] = useState<Garden | null>(null);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [plantPlacements, setPlantPlacements] = useState<Map<string, { plant: Plant }>>(new Map());
  const [events, setEvents] = useState<PlantingEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<SoilHistoryEntry | null>(null);

  // Soil history for the calendar wheel
  const { data: soilHistory = [] } = useQuery<SoilHistoryEntry[]>({
    queryKey: ["soilHistory", gardenId],
    queryFn: () => soilHistoryAPI.getHistory(gardenId!),
    enabled: !!gardenId && isAuthenticated,
  });

  const handleHistorySelect = (entry: SoilHistoryEntry) => {
    setSelectedHistoryEntry(entry);
  };

  // @dnd-kit drag end handler — called when a plant from the sidebar is dropped on a cell
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const plant = (active.data?.current as { plant?: Plant })?.plant;
    if (!plant) return;
    const [row, col] = (over.id as string).split("-").map(Number);
    handlePlantDrop(row, col, plant);
  };

  const editGardenSchema = z.object({
    name: z.string().min(1, "Garden name is required"),
    rows: z.number().min(1, "Rows must be at least 1").max(100, "Rows cannot exceed 100"),
    columns: z.number().min(1, "Columns must be at least 1").max(100, "Columns cannot exceed 100"),
    defaultMoisture: z.number().min(0, "Moisture cannot be negative").max(100, "Moisture cannot exceed 100%"),
    defaultNitrogen: z.number().min(0, "Nitrogen cannot be negative").max(100, "Nitrogen cannot exceed 100%"),
    defaultPhosphorus: z.number().min(0, "Phosphorus cannot be negative").max(100, "Phosphorus cannot exceed 100%"),
    defaultPotassium: z.number().min(0, "Potassium cannot be negative").max(100, "Potassium cannot exceed 100%"),
    defaultPh: z.number().min(0, "pH cannot be negative").max(14, "pH cannot exceed 14"),
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    resolver: zodResolver(editGardenSchema),
    defaultValues: {
      name: garden?.name || "",
      rows: garden?.rows || 10,
      columns: garden?.columns || 10,
      defaultMoisture: 50,
      defaultNitrogen: 50,
      defaultPhosphorus: 50,
      defaultPotassium: 50,
      defaultPh: 7,
    },
  });

  const calculateAverageSoilProperty = (soilData: SoilCell[][], property: keyof SoilCell) => {
    let sum = 0;
    let count = 0;
    
    soilData.forEach(row => {
      row.forEach(cell => {
        sum += cell[property] as number;
        count += 1;
      });
    });
    
    return count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
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
        const initialPlacements = new Map<string, { plant: Plant }>();
        if (garden.plants && garden.plants.length > 0) {
          for (const placement of garden.plants) {
            const plant = plantsData.find(p => p.id === placement.plantId);
            if (plant && placement.position) {
              const cellKey = `${placement.position.row}-${placement.position.col}`;
              initialPlacements.set(cellKey, { plant });
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
              // Create a deterministic ID using position and plantId
              const posKey = placement.position ? `${placement.position.row}-${placement.position.col}` : 'unknown';
              
              // Add planting event with deterministic ID
              calendarEvents.push({
                id: `planting-${placement.plantId}-${posKey}`,
                title: `Plant ${plant.name}`,
                start: new Date(placement.plantedDate).toISOString().split('T')[0],
                plantId: plant.id,
                gardenId: garden.id,
                type: 'planting',
                color: '#4B7F52',
              });
              
              // Calculate and add harvest event with deterministic ID
              const plantDate = new Date(placement.plantedDate);
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

  const handlePlantDrop = async (row: number, col: number, plant: Plant) => {
    const cellKey = `${row}-${col}`;
    const plantDate = new Date();
    const plantDateStr = plantDate.toISOString().split('T')[0];
    
    // Make a new Map to trigger re-render
    const newPlacements = new Map(plantPlacements);
    newPlacements.set(cellKey, { plant });
    setPlantPlacements(newPlacements);
    
    // Create plant placement data for the API
    const plantPlacement = {
      plantId: plant.id,
      position: {
        row,
        col
      },
      plantedDate: plantDateStr
    };
    
    try {
      // Use the real API to add the plant to the garden
      const updatedGarden = await gardenAPI.addPlant(gardenId!, plantPlacement);
      
      // Create planting and harvest events
      const harvestDate = new Date(plantDate);
      harvestDate.setDate(plantDate.getDate() + plant.growthCycle.harvest);
      const harvestDateStr = harvestDate.toISOString().split('T')[0];
      
      // Add planting event
      const plantingEvent: PlantingEvent = {
        id: `planting-${plant.id}-${cellKey}`,
        title: `Plant ${plant.name}`,
        start: plantDateStr,
        plantId: plant.id,
        gardenId: gardenId || '',
        type: 'planting',
        color: '#4B7F52',
      };
      
      // Add harvest event
      const harvestEvent: PlantingEvent = {
        id: `harvest-${plant.id}-${cellKey}`,
        title: `Harvest ${plant.name}`,
        start: harvestDateStr,
        plantId: plant.id,
        gardenId: gardenId || '',
        type: 'harvest',
        color: '#f97316',
      };
      
      // Update events state
      setEvents([...events, plantingEvent, harvestEvent]);
      
      toast({
        title: "Plant Added",
        description: `${plant.name} has been planted at position (${row+1}, ${col+1}). Expected harvest: ${new Date(harvestDateStr).toLocaleDateString()}`,
      });
      
      // Check if the garden was updated and contains the new plant data
      // This helps ensure the UI stays in sync with the backend
      if (updatedGarden && updatedGarden.plants) {
        // Refresh garden data to ensure we have latest state
        setGarden(updatedGarden);
      }
      
    } catch (error) {
      console.error("Error adding plant to garden:", error);
      toast({
        title: "Error",
        description: "Failed to add plant to garden.",
        variant: "destructive",
      });
      
      // Remove the plant from the UI if the API call failed
      newPlacements.delete(cellKey);
      setPlantPlacements(newPlacements);
    }
  };

  const handleRemovePlant = async (row: number, col: number) => {
    const cellKey = `${row}-${col}`;
    
    // Make a new Map to trigger re-render
    const newPlacements = new Map(plantPlacements);
    newPlacements.delete(cellKey);
    setPlantPlacements(newPlacements);
    
    try {
      // Use the real API to remove the plant from the garden
      await gardenAPI.removePlant(gardenId!, row, col);
      
      toast({
        title: "Plant Removed",
        description: `Plant at position (${row+1}, ${col+1}) has been removed.`,
      });
    } catch (error) {
      console.error("Error removing plant from garden:", error);
      toast({
        title: "Error",
        description: "Failed to remove plant from garden.",
        variant: "destructive",
      });
      
      // Re-add the plant to the UI if the API call failed
      const plant = plantPlacements.get(cellKey)?.plant;
      if (plant) {
        newPlacements.set(cellKey, { plant });
        setPlantPlacements(newPlacements);
      }
    }
  };

  const handleEditGarden = async (data: { 
    name: string; 
    rows: number; 
    columns: number;
    defaultMoisture: number;
    defaultNitrogen: number;
    defaultPhosphorus: number;
    defaultPotassium: number;
    defaultPh: number;
  }) => {
    try {
      const updatedGarden = await gardenAPI.update(gardenId!, data);
      setGarden(updatedGarden);
      toast({
        title: "Garden Updated",
        description: "Your garden has been successfully updated.",
      });
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating garden:", error);
      toast({
        title: "Error",
        description: "Failed to update garden.",
        variant: "destructive",
      });
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
              {garden.rows}×{garden.columns} garden grid • Last updated {new Date(garden.soilData.lastUpdated).toLocaleDateString()}
            </p>
          </div>
          <Button variant="outline" onClick={() => {
            // Prefill form with current garden values
            setValue("name", garden.name);
            setValue("rows", garden.rows);
            setValue("columns", garden.columns);
            
            // Set soil default properties from the garden data
            const avgMoisture = calculateAverageSoilProperty(garden.soilData.cells, 'moisture');
            const avgNitrogen = calculateAverageSoilProperty(garden.soilData.cells, 'nitrogen');
            const avgPhosphorus = calculateAverageSoilProperty(garden.soilData.cells, 'phosphorus');
            const avgPotassium = calculateAverageSoilProperty(garden.soilData.cells, 'potassium');
            const avgPh = calculateAverageSoilProperty(garden.soilData.cells, 'ph');
            
            setValue("defaultMoisture", avgMoisture);
            setValue("defaultNitrogen", avgNitrogen);
            setValue("defaultPhosphorus", avgPhosphorus);
            setValue("defaultPotassium", avgPotassium);
            setValue("defaultPh", avgPh);
            
            setIsEditDialogOpen(true);
          }}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Garden
          </Button>
        </div>
        
        <DndContext onDragEnd={handleDragEnd}>
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
                    <div 
                      className="soil-grid"
                      style={{ 
                        gridTemplateRows: `repeat(${garden.rows}, 1fr)`,
                        gridTemplateColumns: `repeat(${garden.columns}, 1fr)`
                      }}
                    >
                      {Array.from({ length: garden.rows }).map((_, rowIndex) => (
                        Array.from({ length: garden.columns }).map((_, colIndex) => {
                          const cellKey = `${rowIndex}-${colIndex}`;
                          const placement = plantPlacements.get(cellKey);
                          
                          return (
                            <DroppableSoilCell 
                              key={cellKey}
                              row={rowIndex}
                              col={colIndex}
                              soilCell={garden.soilData.cells[rowIndex]?.[colIndex] || {
                                moisture: 50,
                                nitrogen: 50,
                                phosphorus: 50,
                                potassium: 50,
                                ph: 7,
                              }}
                              onDrop={handlePlantDrop}
                              onRemovePlant={handleRemovePlant}
                              plantPlacement={placement}
                              plants={plants}
                              placements={plantPlacements}
                            />
                          );
                        })
                      ))}
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground text-center">
                      Drag a plant from the sidebar or click a cell to plant.
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
                  <SoilStats soilData={garden.soilData.cells} />
                  {soilHistory.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Soil History</p>
                      <SoilCalendarWheel
                        history={soilHistory}
                        onSelect={handleHistorySelect}
                        selected={selectedHistoryEntry ?? undefined}
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
