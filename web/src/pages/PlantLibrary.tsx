import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plant } from "@/types";
import { plantAPI } from "@/api";
import { History, Info, Leaf, Plus, Search, UsersIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AddPlantDialog from "@/components/plants/AddPlantDialog";
import EditPlantDialog from "@/components/plants/EditPlantDialog";
import PlantDetailsDialog from "@/components/plants/PlantDetailsDialog";
import PlantList from "@/components/plants/PlantList";
import { usePlantMutations } from "@/hooks/usePlantMutations";


const PlantLibrary = () => {
  const { isAuthenticated } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentPlant, setCurrentPlant] = useState<Plant | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("generic");
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);

  const { data: plants = [], isLoading, refetch } = useQuery({
    queryKey: ["plants"],
    queryFn: async () => {
      try {
        return await plantAPI.getAll();
      } catch (error) {
        console.error("Error fetching plants:", error);
        return [];
      }
    },
  });

  const { data: myPlants = [], isLoading: isLoadingMyPlants, refetch: refetchMyPlants } = useQuery({
    queryKey: ["my-plants"],
    queryFn: async () => {
      if (!isAuthenticated) return [];
      try {
        return await plantAPI.getMyPlants();
      } catch (error) {
        console.error("Error fetching my plants:", error);
        return [];
      }
    },
    enabled: isAuthenticated,
  });

  const { data: recentPlants = [], isLoading: isLoadingRecentPlants } = useQuery({
    queryKey: ["recent-plants"],
    queryFn: async () => {
      try {
        return await plantAPI.getRecentPlants();
      } catch (error) {
        console.error("Error fetching recent plants:", error);
        return [];
      }
    },
  });

  const plantNameMap = useMemo(
    () => new Map(plants.map(p => [p.id, p.name])),
    [plants]
  );

  const { copyMutation } = usePlantMutations();


  const handleEditPlant = (plant: Plant) => {
    setCurrentPlant(plant);
    setIsEditDialogOpen(true);
  };


  const handleCopyPlant = async (plant: Plant) => {
    await copyMutation.mutateAsync(plant);
    setActiveTab("my-plants");
  };

  const handleViewDetails = (plant: Plant) => {
    setSelectedPlant(plant);
    setIsDetailsDialogOpen(true);
  };

  const getFilteredPlants = () => {
    let plantsToFilter: Plant[] = [];

    switch(activeTab) {
      case "generic":
        plantsToFilter = plants.filter(p => !p.creatorId);
        break;
      case "my-plants":
        plantsToFilter = myPlants;
        break;
      case "recent":
        plantsToFilter = recentPlants;
        break;
      default:
        plantsToFilter = plants;
    }

    return plantsToFilter.filter(plant => 
      plant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plant.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredPlants = getFilteredPlants();

  const isTabLoading = () => {
    switch(activeTab) {
      case "my-plants":     return isLoadingMyPlants;
      case "recent":        return isLoadingRecentPlants;
      case "generic":
      default:              return isLoading;
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-garden-primary">Plant Library</h1>
            <p className="text-muted-foreground">
              Manage your plants and learn about their characteristics
            </p>
          </div>
          <Button className="bg-garden-primary hover:bg-garden-primary/90" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Plant
          </Button>
        </div>

        <Alert className="mb-6 bg-garden-secondary/10 border-garden-secondary/30">
          <Info className="h-4 w-4" />
          <AlertTitle>About the Plant Library</AlertTitle>
          <AlertDescription>
            <p className="mb-2">Welcome to your plant library! Here you can create and manage your personal plant collection.</p>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Create plants with customized soil impact, growth cycles, and companion planting information</li>
              <li>Track nutrient requirements and contributions for better garden planning</li>
              <li>Add detailed information about growing conditions and compatibility</li>
              <li>All plants you create are private to your account and can be used in your garden designs</li>
              <li>Use your plant library to plan balanced and healthy garden layouts</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
            <TabsList className="grid grid-cols-3 w-full sm:w-auto sm:inline-flex">
              <TabsTrigger value="generic">Generic Plants</TabsTrigger>
              <TabsTrigger value="my-plants">My Plants</TabsTrigger>
              <TabsTrigger value="recent">Recent Plants</TabsTrigger>
            </TabsList>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search plants..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <TabsContent value="generic" className="mt-0">
            <Card className="overflow-hidden">
              <CardHeader className="bg-slate-50 py-3 px-4">
                <CardTitle className="text-lg flex items-center">
                  <Leaf className="h-5 w-5 mr-2 text-garden-primary" />
                  Generic Plants
                </CardTitle>
                <CardDescription>
                  Standard plants available to all users
                </CardDescription>
              </CardHeader>
              <PlantList
                plants={filteredPlants}
                isLoading={isTabLoading()}
                plantNameMap={plantNameMap}
                isMyPlantsTab={false}
                searchTerm={searchTerm}
                onEdit={handleEditPlant}
                onCopy={handleCopyPlant}
                onViewDetails={handleViewDetails}
                onAddFirst={() => setIsAddDialogOpen(true)}
              />
            </Card>
          </TabsContent>

          <TabsContent value="my-plants" className="mt-0">
            <Card className="overflow-hidden">
              <CardHeader className="bg-slate-50 py-3 px-4">
                <CardTitle className="text-lg flex items-center">
                  <UsersIcon className="h-5 w-5 mr-2 text-garden-primary" />
                  My Plants
                </CardTitle>
                <CardDescription>
                  Plants you have created or copied
                </CardDescription>
              </CardHeader>
              <PlantList
                plants={filteredPlants}
                isLoading={isTabLoading()}
                plantNameMap={plantNameMap}
                isMyPlantsTab={true}
                searchTerm={searchTerm}
                onEdit={handleEditPlant}
                onCopy={handleCopyPlant}
                onViewDetails={handleViewDetails}
                onAddFirst={() => setIsAddDialogOpen(true)}
              />
            </Card>
          </TabsContent>

          <TabsContent value="recent" className="mt-0">
            <Card className="overflow-hidden">
              <CardHeader className="bg-slate-50 py-3 px-4">
                <CardTitle className="text-lg flex items-center">
                  <History className="h-5 w-5 mr-2 text-garden-primary" />
                  Recent Plants
                </CardTitle>
                <CardDescription>
                  Plants recently added or updated
                </CardDescription>
              </CardHeader>
              <PlantList
                plants={filteredPlants}
                isLoading={isTabLoading()}
                plantNameMap={plantNameMap}
                isMyPlantsTab={false}
                searchTerm={searchTerm}
                onEdit={handleEditPlant}
                onCopy={handleCopyPlant}
                onViewDetails={handleViewDetails}
              />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <AddPlantDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
      <EditPlantDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} plant={currentPlant} />
      <PlantDetailsDialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen} plant={selectedPlant} />
    </Layout>
  );
};

export default PlantLibrary;
