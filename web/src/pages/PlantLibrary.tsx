import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plant } from "@/types";
import { plantAPI } from "@/api";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, BookOpen, Copy, Flower, History, Info, Leaf, Plus, Search, Sprout, SproutIcon, UsersIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const addPlantSchema = z.object({
  name: z.string().min(2, "Plant name must be at least 2 characters"),
  imageUrl: z.string().url("Must be a valid URL").or(z.string().length(0)),
  description: z.string().min(10, "Description must be at least 10 characters"),
  nitrogenImpact: z.number().min(-10).max(10),
  phosphorusImpact: z.number().min(-10).max(10),
  potassiumImpact: z.number().min(-10).max(10),
  germinationDays: z.number().min(1),
  maturityDays: z.number().min(1),
  harvestDays: z.number().min(1),
  widthM: z.number().min(0.1, "Min 0.1m").max(10, "Max 10m"),
  heightM: z.number().min(0.1, "Min 0.1m").max(10, "Max 10m"),
  compatiblePlants: z.string().default(""),
  companionBenefits: z.string().default("")
});

type AddPlantFormValues = z.infer<typeof addPlantSchema>;

const PlantLibrary = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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

  const addPlantMutation = useMutation({
    mutationFn: async (newPlant: Omit<Plant, 'id'>) => {
      return await plantAPI.create(newPlant);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["plants"]);
      queryClient.invalidateQueries(["my-plants"]);
      queryClient.invalidateQueries(["recent-plants"]);
    },
  });

  const updatePlantMutation = useMutation({
    mutationFn: async ({ id, updatedPlant }: { id: string; updatedPlant: Partial<Omit<Plant, 'id'>> }) => {
      return await plantAPI.update(id, updatedPlant);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["plants"]);
      queryClient.invalidateQueries(["my-plants"]);
      queryClient.invalidateQueries(["recent-plants"]);
    },
  });

  const deletePlantMutation = useMutation({
    mutationFn: async (id: string) => {
      return await plantAPI.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["plants"]);
      queryClient.invalidateQueries(["my-plants"]);
      queryClient.invalidateQueries(["recent-plants"]);
    },
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm<AddPlantFormValues>({
    resolver: zodResolver(addPlantSchema),
    defaultValues: {
      name: "",
      imageUrl: "",
      description: "",
      nitrogenImpact: 0,
      phosphorusImpact: 0,
      potassiumImpact: 0,
      germinationDays: 7,
      maturityDays: 60,
      harvestDays: 90,
      widthM: 0.5,
      heightM: 0.5,
      compatiblePlants: "",
      companionBenefits: "",
    },
  });

  const { 
    register: registerEdit, 
    handleSubmit: handleSubmitEdit, 
    formState: { errors: errorsEdit }, 
    reset: resetEdit,
    setValue
  } = useForm<AddPlantFormValues>({
    resolver: zodResolver(addPlantSchema),
    defaultValues: {
      name: "",
      imageUrl: "",
      description: "",
      nitrogenImpact: 0,
      phosphorusImpact: 0,
      potassiumImpact: 0,
      germinationDays: 7,
      maturityDays: 60,
      harvestDays: 90,
      widthM: 0.5,
      heightM: 0.5,
      compatiblePlants: "",
      companionBenefits: "",
    },
  });

  const onAddPlant = async (data: AddPlantFormValues) => {
    try {
      const companionPlants = data.compatiblePlants
        ? data.compatiblePlants.split(',').map(p => p.trim()).filter(p => p.length > 0)
        : [];

      const newPlant: Omit<Plant, 'id'> = {
        name: data.name,
        imageUrl: data.imageUrl || undefined,
        description: data.description,
        nutrients: {
          nitrogenImpact: data.nitrogenImpact,
          phosphorusImpact: data.phosphorusImpact,
          potassiumImpact: data.potassiumImpact,
        },
        size: {
          widthM: data.widthM,
          heightM: data.heightM,
        },
        compatiblePlants: companionPlants,
        companionBenefits: data.companionBenefits || undefined,
        growthCycle: {
          germination: data.germinationDays,
          maturity: data.maturityDays,
          harvest: data.harvestDays,
        }
      };

      await addPlantMutation.mutateAsync(newPlant);

      toast({
        title: "Plant Added",
        description: `${data.name} has been added to your plant library.`,
      });

      setIsDialogOpen(false);
      reset();
    } catch (error) {
      console.error("Error creating plant:", error);
      toast({
        title: "Error",
        description: "Failed to create plant. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditPlant = (plant: Plant) => {
    setCurrentPlant(plant);

    setValue("name", plant.name);
    setValue("imageUrl", plant.imageUrl || "");
    setValue("description", plant.description);
    setValue("nitrogenImpact", plant.nutrients.nitrogenImpact);
    setValue("phosphorusImpact", plant.nutrients.phosphorusImpact);
    setValue("potassiumImpact", plant.nutrients.potassiumImpact);
    setValue("germinationDays", plant.growthCycle.germination);
    setValue("maturityDays", plant.growthCycle.maturity);
    setValue("harvestDays", plant.growthCycle.harvest);
    setValue("widthM",  plant.size?.widthM  ?? 0.5);
    setValue("heightM", plant.size?.heightM ?? 0.5);

    setValue("compatiblePlants", plant.compatiblePlants ? plant.compatiblePlants.join(', ') : "");
    setValue("companionBenefits", plant.companionBenefits || "");

    setIsEditDialogOpen(true);
  };

  const onEditPlant = async (data: AddPlantFormValues) => {
    if (!currentPlant) return;

    try {
      const companionPlants = data.compatiblePlants
        ? data.compatiblePlants.split(',').map(p => p.trim()).filter(p => p.length > 0)
        : [];

      const updatedPlant: Partial<Omit<Plant, 'id'>> = {
        name: data.name,
        imageUrl: data.imageUrl || undefined,
        description: data.description,
        nutrients: {
          nitrogenImpact: data.nitrogenImpact,
          phosphorusImpact: data.phosphorusImpact,
          potassiumImpact: data.potassiumImpact,
        },
        size: {
          widthM: data.widthM,
          heightM: data.heightM,
        },
        compatiblePlants: companionPlants,
        companionBenefits: data.companionBenefits || undefined,
        growthCycle: {
          germination: data.germinationDays,
          maturity: data.maturityDays,
          harvest: data.harvestDays,
        }
      };

      await updatePlantMutation.mutateAsync({ id: currentPlant.id, updatedPlant });

      toast({
        title: "Plant Updated",
        description: `${data.name} has been updated in your plant library.`,
      });

      setIsEditDialogOpen(false);
      setCurrentPlant(null);
    } catch (error) {
      console.error("Error updating plant:", error);
      toast({
        title: "Error",
        description: "Failed to update plant. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeletePlant = async (plant: Plant) => {
    try {
      await deletePlantMutation.mutateAsync(plant.id);

      toast({
        title: "Plant Deleted",
        description: `${plant.name} has been removed from your plant library.`,
      });

      setIsEditDialogOpen(false);
      setCurrentPlant(null);
    } catch (error) {
      console.error("Error deleting plant:", error);
      toast({
        title: "Error",
        description: "Failed to delete plant. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCopyPlant = async (plant: Plant) => {
    try {
      const templatePlant: Omit<Plant, 'id'> = {
        name: `${plant.name} (My Version)`,
        imageUrl: plant.imageUrl,
        description: plant.description,
        nutrients: {
          nitrogenImpact: plant.nutrients.nitrogenImpact,
          phosphorusImpact: plant.nutrients.phosphorusImpact,
          potassiumImpact: plant.nutrients.potassiumImpact,
        },
        compatiblePlants: plant.compatiblePlants,
        companionBenefits: plant.companionBenefits,
        growthCycle: {
          germination: plant.growthCycle.germination,
          maturity: plant.growthCycle.maturity,
          harvest: plant.growthCycle.harvest,
        }
      };

      await addPlantMutation.mutateAsync(templatePlant);

      toast({
        title: "Plant Created",
        description: `${plant.name} template has been used to create a new plant in your library.`,
      });

      setActiveTab("my-plants");
    } catch (error) {
      console.error("Error creating plant from template:", error);
      toast({
        title: "Error",
        description: "Failed to create plant from template. Please try again.",
        variant: "destructive",
      });
    }
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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-garden-primary hover:bg-garden-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Plant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-md md:max-w-lg overflow-y-auto max-h-[90vh]" style={{ resize: 'none' }}>
              <form onSubmit={handleSubmit(onAddPlant)}>
                <DialogHeader>
                  <DialogTitle>Add New Plant</DialogTitle>
                  <DialogDescription>Create a new plant for your garden library.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-name">Plant Name</Label>
                    <Input id="add-name" {...register("name")} />
                    {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-imageUrl">Image URL (optional)</Label>
                    <Input id="add-imageUrl" placeholder="https://..." {...register("imageUrl")} />
                    {errors.imageUrl && <p className="text-sm text-destructive">{errors.imageUrl.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-description">Description</Label>
                    <Textarea id="add-description" rows={3} {...register("description")} />
                    {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="add-n">Nitrogen Impact</Label>
                      <Input id="add-n" type="number" min={-10} max={10} step={1} {...register("nitrogenImpact", { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="add-p">Phosphorus Impact</Label>
                      <Input id="add-p" type="number" min={-10} max={10} step={1} {...register("phosphorusImpact", { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="add-k">Potassium Impact</Label>
                      <Input id="add-k" type="number" min={-10} max={10} step={1} {...register("potassiumImpact", { valueAsNumber: true })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="add-germ">Germination (days)</Label>
                      <Input id="add-germ" type="number" min={1} {...register("germinationDays", { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="add-mat">Maturity (days)</Label>
                      <Input id="add-mat" type="number" min={1} {...register("maturityDays", { valueAsNumber: true })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="add-harv">Harvest (days)</Label>
                      <Input id="add-harv" type="number" min={1} {...register("harvestDays", { valueAsNumber: true })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="add-widthM">Plant Width (m)</Label>
                      <Input id="add-widthM" type="number" min={0.1} max={10} step={0.1} {...register("widthM", { valueAsNumber: true })} />
                      {errors.widthM && <p className="text-sm text-destructive">{errors.widthM.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="add-heightM">Plant Height (m)</Label>
                      <Input id="add-heightM" type="number" min={0.1} max={10} step={0.1} {...register("heightM", { valueAsNumber: true })} />
                      {errors.heightM && <p className="text-sm text-destructive">{errors.heightM.message}</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-compat">Compatible Plants (comma-separated)</Label>
                    <Input id="add-compat" placeholder="Basil, Marigold, Carrots" {...register("compatiblePlants")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-benefits">Companion Benefits</Label>
                    <Textarea id="add-benefits" rows={2} {...register("companionBenefits")} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => { setIsDialogOpen(false); reset(); }}>Cancel</Button>
                  <Button type="submit" className="bg-garden-primary hover:bg-garden-primary/90">Add Plant</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
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
              {renderPlantList(filteredPlants, isTabLoading(), handleEditPlant, handleCopyPlant, handleViewDetails, false)}
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
              {renderPlantList(filteredPlants, isTabLoading(), handleEditPlant, handleCopyPlant, handleViewDetails, true)}
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
              {renderPlantList(filteredPlants, isTabLoading(), handleEditPlant, handleCopyPlant, handleViewDetails, false)}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <EditPlantDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSubmit={onEditPlant}
        onDelete={handleDeletePlant}
        register={registerEdit}
        handleSubmit={handleSubmitEdit}
        errors={errorsEdit}
        currentPlant={currentPlant}
      />
      <PlantDetailsDialog
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        plant={selectedPlant}
      />
    </Layout>
  );

  function renderPlantList(
    plants: Plant[], 
    isLoading: boolean, 
    onEdit: (plant: Plant) => void,
    onCopy: (plant: Plant) => void,
    onViewDetails: (plant: Plant) => void,
    isMyPlantsTab: boolean
  ) {
    if (isLoading) {
      return (
        <CardContent className="p-0">
          <div className="grid grid-cols-1 gap-6 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-lg bg-gray-200 animate-pulse"></div>
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
          {!searchTerm && isMyPlantsTab && (
            <Button 
              onClick={() => setIsDialogOpen(true)}
              className="bg-garden-primary hover:bg-garden-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Plant
            </Button>
          )}
        </CardContent>
      );
    }

    return (
      <CardContent className="p-0 overflow-hidden">
        <div className="md:hidden">
          <div className="space-y-4 p-4">
            {plants.map((plant) => (
              <div key={plant.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-garden-secondary/10 flex items-center justify-center">
                    {plant.imageUrl ? (
                      <img 
                        src={plant.imageUrl} 
                        alt={plant.name} 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
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
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{plant.name}</span>
                      {!plant.creatorId && (
                        <Badge variant="outline" className="text-xs border-garden-secondary text-garden-secondary">Common</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{plant.description.substring(0, 60)}...</div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-1">Nutrient Impact</p>
                  <div className="flex flex-wrap gap-2">
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

                <div className="flex flex-wrap gap-2">
                  {plant.isEditable ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onEdit(plant)}
                      className="flex-1"
                    >
                      Edit
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onCopy(plant)}
                      className="flex-1"
                    >
                      <Copy className="h-3 w-3 mr-2" />
                      Copy
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onViewDetails(plant)}
                    className="flex-1"
                  >
                    <BookOpen className="h-3 w-3 mr-2" />
                    Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden md:block">
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
                        {plant.imageUrl ? (
                          <img 
                            src={plant.imageUrl} 
                            alt={plant.name} 
                            className="w-full h-full object-cover" 
                            onError={(e) => {
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
                        <div className="flex items-center space-x-2">
                          <span>{plant.name}</span>
                          {!plant.creatorId && (
                            <Badge variant="outline" className="text-xs border-garden-secondary text-garden-secondary">Common</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{plant.description.substring(0, 40)}...</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
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
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <div>Germination: {plant.growthCycle.germination} days</div>
                      <div>Maturity: {plant.growthCycle.maturity} days</div>
                      <div>Harvest: {plant.growthCycle.harvest} days</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {plant.compatiblePlants && plant.compatiblePlants.length > 0 ? (
                        <>
                          <div className="text-xs font-medium">Plants: {plant.compatiblePlants.map(id => plantNameMap.get(id) ?? id).join(', ')}</div>
                          {plant.companionBenefits && (
                            <div className="text-xs text-muted-foreground">
                              <span className="italic">Benefits:</span> {plant.companionBenefits}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-xs text-muted-foreground">None specified</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {plant.isEditable ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => onEdit(plant)}
                        >
                          Edit
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onCopy(plant)}
                        >
                          <Copy className="h-3 w-3 mr-2" />
                          Copy
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onViewDetails(plant)}
                      >
                        Details
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    );
  }
};

// Plant Details Dialog component
const PlantDetailsDialog = ({
  open,
  onOpenChange,
  plant,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plant: Plant | null;
}) => {
  if (!plant) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-xl md:max-w-2xl overflow-y-auto max-h-[90vh]" style={{ resize: 'none' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-garden-secondary/10 flex items-center justify-center">
              {plant.imageUrl ? (
                <img 
                  src={plant.imageUrl} 
                  alt={plant.name} 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
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
            <span>{plant.name}</span>
            {!plant.creatorId && (
              <Badge variant="outline" className="text-xs border-garden-secondary text-garden-secondary">Common</Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Plant image (larger) */}
          {plant.imageUrl && (
            <div className="mb-4 flex justify-center">
              <div className="w-40 h-40 rounded-md overflow-hidden">
                <img 
                  src={plant.imageUrl} 
                  alt={plant.name} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-garden-secondary/10"><svg class="h-10 w-10 text-garden-secondary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9C4 4 7 3 10 3" /><path d="M8 14c-2 0-4-1-4-4" /><path d="M21 10c-1.7-1-3-1-5-1" /><path d="M8 10c0 3.5 6 4.5 8 1" /><path d="M19 9c.3 1.2 0 2.4-.7 3.9" /><path d="M21 15c-1 1-3 2-7 2s-6-1-7-2c-1.7 1.5-2 3-2 5h18c0-2-.4-3.5-2-5Z" /></svg></div>`;
                  }}
                />
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
              <Card className="overflow-hidden">
                <CardHeader className={`py-2 px-3 ${plant.nutrients.nitrogenImpact > 0 ? 'bg-green-50' : plant.nutrients.nitrogenImpact < 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <CardTitle className="text-sm">Nitrogen (N)</CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <div className="text-2xl font-bold flex items-center">
                    {plant.nutrients.nitrogenImpact > 0 && <span className="text-green-600">+</span>}
                    <span className={plant.nutrients.nitrogenImpact > 0 ? 'text-green-600' : plant.nutrients.nitrogenImpact < 0 ? 'text-red-600' : 'text-gray-600'}>
                      {plant.nutrients.nitrogenImpact}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {plant.nutrients.nitrogenImpact > 0 
                      ? 'Adds nitrogen to soil' 
                      : plant.nutrients.nitrogenImpact < 0 
                        ? 'Depletes nitrogen from soil'
                        : 'Neutral impact on nitrogen'}
                  </p>
                </CardContent>
              </Card>
              
              <Card className="overflow-hidden">
                <CardHeader className={`py-2 px-3 ${plant.nutrients.phosphorusImpact > 0 ? 'bg-green-50' : plant.nutrients.phosphorusImpact < 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <CardTitle className="text-sm">Phosphorus (P)</CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <div className="text-2xl font-bold flex items-center">
                    {plant.nutrients.phosphorusImpact > 0 && <span className="text-green-600">+</span>}
                    <span className={plant.nutrients.phosphorusImpact > 0 ? 'text-green-600' : plant.nutrients.phosphorusImpact < 0 ? 'text-red-600' : 'text-gray-600'}>
                      {plant.nutrients.phosphorusImpact}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {plant.nutrients.phosphorusImpact > 0 
                      ? 'Adds phosphorus to soil' 
                      : plant.nutrients.phosphorusImpact < 0 
                        ? 'Depletes phosphorus from soil'
                        : 'Neutral impact on phosphorus'}
                  </p>
                </CardContent>
              </Card>
              
              <Card className="overflow-hidden">
                <CardHeader className={`py-2 px-3 ${plant.nutrients.potassiumImpact > 0 ? 'bg-green-50' : plant.nutrients.potassiumImpact < 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <CardTitle className="text-sm">Potassium (K)</CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <div className="text-2xl font-bold flex items-center">
                    {plant.nutrients.potassiumImpact > 0 && <span className="text-green-600">+</span>}
                    <span className={plant.nutrients.potassiumImpact > 0 ? 'text-green-600' : plant.nutrients.potassiumImpact < 0 ? 'text-red-600' : 'text-gray-600'}>
                      {plant.nutrients.potassiumImpact}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {plant.nutrients.potassiumImpact > 0 
                      ? 'Adds potassium to soil' 
                      : plant.nutrients.potassiumImpact < 0 
                        ? 'Depletes potassium from soil'
                        : 'Neutral impact on potassium'}
                  </p>
                </CardContent>
              </Card>
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
                {/* Timeline */}
                <div className="absolute top-6 left-0 w-full h-1 bg-slate-200 rounded"></div>
                
                {/* Germination */}
                <div className="relative z-10" style={{ left: '0%' }}>
                  <div className="absolute -top-6 transform -translate-x-1/2">
                    <div className="text-xs font-medium">Germination</div>
                    <div className="text-xs text-muted-foreground">{plant.growthCycle.germination} days</div>
                  </div>
                  <div className="w-3 h-3 bg-garden-secondary rounded-full"></div>
                </div>
                
                {/* Maturity */}
                <div className="relative z-10" style={{ position: 'absolute', left: '50%', top: '0' }}>
                  <div className="absolute -top-6 transform -translate-x-1/2">
                    <div className="text-xs font-medium">Maturity</div>
                    <div className="text-xs text-muted-foreground">{plant.growthCycle.maturity} days</div>
                  </div>
                  <div className="w-3 h-3 bg-garden-primary rounded-full"></div>
                </div>
                
                {/* Harvest */}
                <div className="relative z-10" style={{ position: 'absolute', left: '100%', top: '0' }}>
                  <div className="absolute -top-6 transform -translate-x-1/2">
                    <div className="text-xs font-medium">Harvest</div>
                    <div className="text-xs text-muted-foreground">{plant.growthCycle.harvest} days</div>
                  </div>
                  <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Companion Plants */}
          {(plant.compatiblePlants && plant.compatiblePlants.length > 0) && (
            <div>
              <h3 className="text-lg font-medium mb-2 flex items-center">
                <UsersIcon className="h-5 w-5 mr-2 text-garden-secondary" />
                Companion Plants
              </h3>
              <div className="bg-slate-50 rounded-md p-4">
                <div className="flex flex-wrap gap-2 mb-2">
                  {plant.compatiblePlants.map((companion, idx) => (
                    <Badge key={idx} variant="secondary">{companion}</Badge>
                  ))}
                </div>
                {plant.companionBenefits && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground italic">
                      <span className="font-medium text-foreground">Benefits: </span>
                      {plant.companionBenefits}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// EditPlantDialog component definition
const EditPlantDialog = ({
  open,
  onOpenChange,
  onSubmit,
  onDelete,
  register,
  handleSubmit,
  errors,
  currentPlant,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AddPlantFormValues) => void;
  onDelete: (plant: Plant) => void;
  register: any;
  handleSubmit: any;
  errors: any;
  currentPlant: Plant | null;
}) => {
  if (!currentPlant) return null;

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md md:max-w-lg overflow-y-auto max-h-[90vh]" style={{ resize: 'none' }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Edit Plant: {currentPlant.name}</DialogTitle>
            <DialogDescription>
              Update the details of this plant and its soil impact.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="name">Plant Name</Label>
              <Input 
                id="name"
                placeholder="Tomato"
                {...register("name")} 
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL (optional)</Label>
              <Input 
                id="imageUrl"
                placeholder="https://example.com/image.jpg"
                {...register("imageUrl")} 
              />
              {errors.imageUrl && (
                <p className="text-sm text-destructive">{errors.imageUrl.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description"
                placeholder="A brief description of the plant..."
                rows={3}
                {...register("description")} 
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nitrogenImpact">Nitrogen Impact</Label>
                <Input 
                  id="nitrogenImpact"
                  type="number" 
                  min={-10}
                  max={10}
                  {...register("nitrogenImpact", { valueAsNumber: true })} 
                />
                {errors.nitrogenImpact && (
                  <p className="text-sm text-destructive">{errors.nitrogenImpact.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phosphorusImpact">Phosphorus Impact</Label>
                <Input 
                  id="phosphorusImpact"
                  type="number" 
                  min={-10}
                  max={10}
                  {...register("phosphorusImpact", { valueAsNumber: true })} 
                />
                {errors.phosphorusImpact && (
                  <p className="text-sm text-destructive">{errors.phosphorusImpact.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="potassiumImpact">Potassium Impact</Label>
                <Input 
                  id="potassiumImpact"
                  type="number" 
                  min={-10}
                  max={10}
                  {...register("potassiumImpact", { valueAsNumber: true })} 
                />
                {errors.potassiumImpact && (
                  <p className="text-sm text-destructive">{errors.potassiumImpact.message}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="germinationDays">Germination (days)</Label>
                <Input 
                  id="germinationDays"
                  type="number" 
                  min={1}
                  {...register("germinationDays", { valueAsNumber: true })} 
                />
                {errors.germinationDays && (
                  <p className="text-sm text-destructive">{errors.germinationDays.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="maturityDays">Maturity (days)</Label>
                <Input 
                  id="maturityDays"
                  type="number" 
                  min={1}
                  {...register("maturityDays", { valueAsNumber: true })} 
                />
                {errors.maturityDays && (
                  <p className="text-sm text-destructive">{errors.maturityDays.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="harvestDays">Harvest (days)</Label>
                <Input 
                  id="harvestDays"
                  type="number" 
                  min={1}
                  {...register("harvestDays", { valueAsNumber: true })} 
                />
                {errors.harvestDays && (
                  <p className="text-sm text-destructive">{errors.harvestDays.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="widthM">Plant Width (m)</Label>
                <Input
                  id="widthM"
                  type="number"
                  min={0.1}
                  max={10}
                  step={0.1}
                  {...register("widthM", { valueAsNumber: true })}
                />
                {errors.widthM && <p className="text-sm text-destructive">{errors.widthM.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="heightM">Plant Height (m)</Label>
                <Input
                  id="heightM"
                  type="number"
                  min={0.1}
                  max={10}
                  step={0.1}
                  {...register("heightM", { valueAsNumber: true })}
                />
                {errors.heightM && <p className="text-sm text-destructive">{errors.heightM.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="compatiblePlants">Compatible Plants (comma-separated)</Label>
              <Textarea 
                id="compatiblePlants"
                placeholder="Basil, Marigold, Carrots"
                rows={2}
                {...register("compatiblePlants")} 
              />
              <p className="text-xs text-muted-foreground">Enter plant names separated by commas</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companionBenefits">Companion Benefits</Label>
              <Textarea 
                id="companionBenefits"
                placeholder="Describe the mutual benefits of companion planting..."
                rows={2}
                {...register("companionBenefits")} 
              />
              <p className="text-xs text-muted-foreground">
                Describe how these plants benefit each other when planted together
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2">
            <Button 
              type="button" 
              variant="destructive" 
              size="sm"
              onClick={() => setDeleteConfirmOpen(true)}
              className="w-full sm:w-auto"
            >
              Delete Plant
            </Button>
            <Button type="submit" className="bg-garden-primary hover:bg-garden-primary/90 w-full sm:w-auto">
              Save Changes
            </Button>
          </DialogFooter>
        </form>
        
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="max-w-sm" style={{ resize: 'none' }}>
            <DialogHeader>
              <DialogTitle>Confirm Delete</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {currentPlant.name}? This action cannot be undone.
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
                onClick={() => {
                  onDelete(currentPlant);
                  setDeleteConfirmOpen(false);
                }}
                className="sm:flex-1"
              >
                Delete Plant
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default PlantLibrary;
