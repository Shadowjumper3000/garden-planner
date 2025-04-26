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
import { Garden, Plant, PlantingEvent, SoilCell, PlantPlacement } from "@/types";
import { gardenAPI, plantAPI } from "@/api";
import { CalendarDays, Edit, Leaf, Sprout, ChevronDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Import DnD components conditionally to prevent build failures
let DndProvider: any;
let useDrag: any;
let useDrop: any;
let HTML5Backend: any;

try {
  // Dynamic imports for DnD using ESM import syntax
  Promise.all([
    import("react-dnd"),
    import("react-dnd-html5-backend")
  ]).then(([dndImport, backendImport]) => {
    DndProvider = dndImport.DndProvider;
    useDrag = dndImport.useDrag;
    useDrop = dndImport.useDrop;
    HTML5Backend = backendImport.HTML5Backend;
  }).catch(error => {
    console.warn("Failed to load react-dnd dependencies:", error);
  });
} catch (error) {
  console.warn("Failed to load react-dnd dependencies:", error);
  // Provide fallback implementations
  DndProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  useDrag = () => [{ isDragging: false }, () => null];
  useDrop = () => [{ isOver: false }, () => null];
  HTML5Backend = {};
}

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
                {events.map(event => (
                  <div 
                    key={event.id} 
                    className={`text-xs p-1 mb-1 rounded truncate ${
                      event.type === 'planting' ? 'bg-garden-primary/20' : 'bg-garden-accent/20'
                    }`}
                    title={event.title}
                  >
                    {event.title}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEvents.length > 0 ? (
            filteredEvents
              .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
              .map(event => (
                <div 
                  key={event.id} 
                  className={`p-2 rounded flex items-center space-x-2 ${
                    event.type === 'planting' ? 'bg-garden-primary/10' : 'bg-garden-accent/10'
                  }`}
                >
                  <div 
                    className={`w-3 h-3 rounded-full ${
                      event.type === 'planting' ? 'bg-garden-primary' : 'bg-garden-accent'
                    }`}
                  ></div>
                  <div>
                    <div className="font-medium">{event.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(event.start).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No events for {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ITEM_TYPE = "PLANT";

// Component for draggable plant item
const DraggablePlant = ({ plant }: { plant: Plant }) => {
  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { plant },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag}
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
  plants
}: { 
  row: number; 
  col: number; 
  soilCell: SoilCell; 
  onDrop: (row: number, col: number, plant: Plant) => void; 
  onRemovePlant: (row: number, col: number) => void;
  plantPlacement?: { plant: Plant } | null;
  plants: Plant[];
}) => {
  const [{ isOver }, drop] = useDrop({
    accept: ITEM_TYPE,
    drop: (item: { plant: Plant }) => {
      onDrop(row, col, item.plant);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  // Calculate color based on soil nutrients
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

  return (
    <div
      ref={drop}
      className={`soil-cell relative ${isOver ? "ring-2 ring-garden-primary" : ""} ${!plantPlacement && isOver ? "bg-garden-primary/10" : ""}`}
      style={{ backgroundColor: getNutrientColor() }}
    >
      {plantPlacement && (
        <div className="w-full h-full flex items-center justify-center group">
          {plantPlacement.plant.imageUrl ? (
            <img 
              src={plantPlacement.plant.imageUrl} 
              alt={plantPlacement.plant.name} 
              className="w-3/4 h-3/4 object-contain group-hover:opacity-80 transition-opacity"
              onError={(e) => {
                // Handle image loading errors
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = `<svg class="h-1/2 w-1/2 text-garden-secondary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9C4 4 7 3 10 3" /><path d="M8 14c-2 0-4-1-4-4" /><path d="M21 10c-1.7-1-3-1-5-1" /><path d="M8 10c0 3.5 6 4.5 8 1" /><path d="M19 9c.3 1.2 0 2.4-.7 3.9" /><path d="M21 15c-1 1-3 2-7 2s-6-1-7-2c-1.7 1.5-2 3-2 5h18c0-2-.4-3.5-2-5Z" /></svg>`;
              }}
            />
          ) : (
            <Leaf className="h-1/2 w-1/2 text-garden-secondary group-hover:opacity-80 transition-opacity" />
          )}
          
          {/* Plant info tooltip on hover */} 
          <div className="absolute inset-0 bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-1 text-xs">
            <p className="font-semibold">{plantPlacement.plant.name}</p>
            <button 
              onClick={() => onRemovePlant(row, col)} 
              className="mt-1 bg-red-600 hover:bg-red-700 text-white px-1 py-0.5 rounded text-[10px]"
            >
              Remove
            </button>
          </div>
        </div>
      )}
      
      {/* Dropdown menu for plant selection */}
      {!plantPlacement && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-garden-primary/10">
              <button className="bg-garden-primary text-white rounded-full w-6 h-6 flex items-center justify-center">+</button>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-64 overflow-y-auto" align="center">
            <div className="py-1 px-2 text-sm font-medium border-b">Select a plant:</div>
            {plants.map((plant) => (
              <DropdownMenuItem 
                key={plant.id} 
                onClick={() => onDrop(row, col, plant)}
                className="flex items-center gap-2 py-2 cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full overflow-hidden bg-garden-secondary/10 flex-shrink-0">
                  {plant.imageUrl ? (
                    <img 
                      src={plant.imageUrl} 
                      alt={plant.name} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center"><svg class="h-3 w-3 text-garden-secondary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9C4 4 7 3 10 3" /><path d="M8 14c-2 0-4-1-4-4" /><path d="M21 10c-1.7-1-3-1-5-1" /><path d="M8 10c0 3.5 6 4.5 8 1" /><path d="M19 9c.3 1.2 0 2.4-.7 3.9" /><path d="M21 15c-1 1-3 2-7 2s-6-1-7-2c-1.7 1.5-2 3-2 5h18c0-2-.4-3.5-2-5Z" /></svg></div>`;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Sprout className="h-3 w-3 text-garden-secondary" />
                    </div>
                  )}
                </div>
                <span>{plant.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

// Component for soil stats
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
              // Add planting event
              calendarEvents.push({
                id: `planting-${placement.plantId}-${Date.now()}`,
                title: `Plant ${plant.name}`,
                start: new Date(placement.plantedDate).toISOString().split('T')[0],
                plantId: plant.id,
                gardenId: garden.id,
                type: 'planting',
                color: '#4B7F52',
              });
              
              // Calculate and add harvest event
              const plantDate = new Date(placement.plantedDate);
              const harvestDate = new Date(plantDate);
              harvestDate.setDate(plantDate.getDate() + plant.growthCycle.harvest);
              
              calendarEvents.push({
                id: `harvest-${placement.plantId}-${Date.now()}`,
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
      plantedDate: new Date().toISOString().split('T')[0]  // Using plantedDate to match the type
    };
    
    try {
      // Use the real API to add the plant to the garden
      const updatedGarden = await gardenAPI.addPlant(gardenId!, plantPlacement);
      
      // Add a planting event to the calendar
      const newEvent: PlantingEvent = {
        id: `event-${Date.now()}`,
        title: `Planted ${plant.name}`,
        start: new Date().toISOString().split('T')[0],
        plantId: plant.id,
        gardenId: gardenId || '',
        type: 'planting',
        color: '#4B7F52',
      };
      
      setEvents([...events, newEvent]);
      
      toast({
        title: "Plant Added",
        description: `${plant.name} has been planted at position (${row+1}, ${col+1}).`,
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
                    <DndProvider backend={HTML5Backend}>
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
                              />
                            );
                          })
                        ))}
                      </div>
                      <div className="mt-4 text-sm text-muted-foreground text-center">
                        Drag plants from the sidebar and drop them onto the garden grid
                      </div>
                    </DndProvider>
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
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-serif">Plant Library</CardTitle>
                </CardHeader>
                <CardContent>
                  <DndProvider backend={HTML5Backend}>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {plants.map(plant => (
                        <DraggablePlant key={plant.id} plant={plant} />
                      ))}
                    </div>
                  </DndProvider>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
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
