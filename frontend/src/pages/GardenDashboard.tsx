
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Garden, Plant, PlantingEvent, SoilCell } from "@/types";
import { gardenAPI, getMockGardens, getMockPlants } from "@/api";
import { CalendarDays, Edit, Leaf, Sprout } from "lucide-react";

// Import DnD components conditionally to prevent build failures
let DndProvider: any;
let useDrag: any;
let useDrop: any;
let HTML5Backend: any;

try {
  // Dynamic imports for DnD
  const dndImport = require("react-dnd");
  const backendImport = require("react-dnd-html5-backend");
  DndProvider = dndImport.DndProvider;
  useDrag = dndImport.useDrag;
  useDrop = dndImport.useDrop;
  HTML5Backend = backendImport.HTML5Backend;
} catch (error) {
  console.warn("Failed to load react-dnd dependencies:", error);
  // Provide fallback implementations
  DndProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;
  useDrag = () => [{ isDragging: false }, () => null];
  useDrop = () => [{ isOver: false }, () => null];
  HTML5Backend = {};
}

// Import FullCalendar components conditionally
let FullCalendar: any;
let dayGridPlugin: any;

try {
  // Dynamic imports for FullCalendar
  FullCalendar = require("@fullcalendar/react").default;
  dayGridPlugin = require("@fullcalendar/daygrid").default;
} catch (error) {
  console.warn("Failed to load FullCalendar dependencies:", error);
  // Provide a fallback component
  FullCalendar = ({ events }: { events: any[] }) => (
    <div className="p-4 border rounded bg-gray-50">
      <p className="text-center text-muted-foreground">Calendar unavailable</p>
      <ul className="mt-4">
        {events?.map((event) => (
          <li key={event.id} className="py-1 border-b">
            {event.title} - {event.start}
          </li>
        ))}
      </ul>
    </div>
  );
  dayGridPlugin = {};
}

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
        <div className="w-10 h-10 rounded-full overflow-hidden bg-garden-secondary/10">
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
            <div className="w-full h-full flex items-center justify-center">
              <Sprout className="h-5 w-5 text-garden-secondary" />
            </div>
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
  plantPlacement = null 
}: { 
  row: number; 
  col: number; 
  soilCell: SoilCell; 
  onDrop: (row: number, col: number, plant: Plant) => void; 
  plantPlacement?: { plant: Plant } | null;
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
      className={`soil-cell ${isOver ? "ring-2 ring-garden-primary" : ""}`}
      style={{ backgroundColor: getNutrientColor() }}
    >
      {plantPlacement && (
        <div className="w-full h-full flex items-center justify-center">
          {plantPlacement.plant.imageUrl ? (
            <img 
              src={plantPlacement.plant.imageUrl} 
              alt={plantPlacement.plant.name} 
              className="w-3/4 h-3/4 object-contain"
              onError={(e) => {
                // Handle image loading errors
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = `<svg class="h-1/2 w-1/2 text-garden-secondary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9C4 4 7 3 10 3" /><path d="M8 14c-2 0-4-1-4-4" /><path d="M21 10c-1.7-1-3-1-5-1" /><path d="M8 10c0 3.5 6 4.5 8 1" /><path d="M19 9c.3 1.2 0 2.4-.7 3.9" /><path d="M21 15c-1 1-3 2-7 2s-6-1-7-2c-1.7 1.5-2 3-2 5h18c0-2-.4-3.5-2-5Z" /></svg>`;
              }}
            />
          ) : (
            <Leaf className="h-1/2 w-1/2 text-garden-secondary" />
          )}
        </div>
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

  useEffect(() => {
    const loadGardenData = async () => {
      if (!isAuthenticated) {
        navigate('/login');
        return;
      }
      
      try {
        setIsLoading(true);
        
        // Load mock data for demo
        const mockGardens = getMockGardens();
        const foundGarden = mockGardens.find(g => g.id === gardenId);
        
        if (!foundGarden) {
          toast({
            title: "Garden not found",
            description: "Could not find the requested garden.",
            variant: "destructive",
          });
          navigate('/');
          return;
        }
        
        setGarden(foundGarden);
        
        // Load plants
        const mockPlants = getMockPlants();
        setPlants(mockPlants);
        
        // Create some mock calendar events
        const mockEvents: PlantingEvent[] = mockPlants.slice(0, 3).map((plant, i) => ({
          id: `event-${i}`,
          title: `Plant ${plant.name}`,
          start: new Date(Date.now() + i * 86400000 * 3).toISOString().split('T')[0],
          plantId: plant.id,
          gardenId: foundGarden.id,
          type: 'planting',
          color: '#4B7F52',
        }));
        
        setEvents(mockEvents);
        
        // Simulate some initial plantings
        const initialPlacements = new Map<string, { plant: Plant }>();
        mockPlants.slice(0, 2).forEach((plant, i) => {
          initialPlacements.set(`1-${i+2}`, { plant });
        });
        
        setPlantPlacements(initialPlacements);
      } catch (error) {
        console.error("Error loading garden:", error);
        toast({
          title: "Error",
          description: "Failed to load garden data.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadGardenData();
  }, [gardenId, isAuthenticated, navigate, toast]);

  const handlePlantDrop = (row: number, col: number, plant: Plant) => {
    const cellKey = `${row}-${col}`;
    
    // Make a new Map to trigger re-render
    const newPlacements = new Map(plantPlacements);
    newPlacements.set(cellKey, { plant });
    setPlantPlacements(newPlacements);
    
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
          <Button variant="outline">
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
                                plantPlacement={placement}
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
                    <FullCalendar
                      plugins={[dayGridPlugin]}
                      initialView="dayGridMonth"
                      headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth'
                      }}
                      height="auto"
                      events={events}
                    />
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
    </Layout>
  );
};

export default GardenDashboard;
