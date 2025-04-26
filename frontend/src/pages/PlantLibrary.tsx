import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Leaf, Plus, Search, Sprout } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  compatiblePlants: z.string().default(""),
  companionBenefits: z.string().default("")
});

type AddPlantFormValues = z.infer<typeof addPlantSchema>;

const PlantLibrary = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentPlant, setCurrentPlant] = useState<Plant | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Fetch plants using the real API
  const { data: plants = [], isLoading, refetch } = useQuery({
    queryKey: ["plants"],
    queryFn: async () => {
      try {
        if (!isAuthenticated) {
          navigate('/login');
          return [];
        }
        
        // Use the real API to fetch plants instead of mock data
        return await plantAPI.getAll();
      } catch (error) {
        console.error("Error fetching plants:", error);
        return [];
      }
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
      compatiblePlants: "",
      companionBenefits: "",
    },
  });
  
  const onAddPlant = async (data: AddPlantFormValues) => {
    try {
      // Process companion plants from comma-separated string to array
      const companionPlants = data.compatiblePlants
        ? data.compatiblePlants.split(',').map(p => p.trim()).filter(p => p.length > 0)
        : [];
      
      // Create plant payload for the API
      const newPlant: Omit<Plant, 'id'> = {
        name: data.name,
        imageUrl: data.imageUrl || undefined,
        description: data.description,
        nutrients: {
          nitrogenImpact: data.nitrogenImpact,
          phosphorusImpact: data.phosphorusImpact,
          potassiumImpact: data.potassiumImpact,
        },
        compatiblePlants: companionPlants,
        companionBenefits: data.companionBenefits || undefined,
        growthCycle: {
          germination: data.germinationDays,
          maturity: data.maturityDays,
          harvest: data.harvestDays,
        }
      };
      
      // Use the real API to create a plant
      await plantAPI.create(newPlant);
      
      toast({
        title: "Plant Added",
        description: `${data.name} has been added to your plant library.`,
      });
      
      setIsDialogOpen(false);
      reset();
      refetch(); // In a real app, this will update the plants list
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
    
    // Set form values for editing
    setValue("name", plant.name);
    setValue("imageUrl", plant.imageUrl || "");
    setValue("description", plant.description);
    setValue("nitrogenImpact", plant.nutrients.nitrogenImpact);
    setValue("phosphorusImpact", plant.nutrients.phosphorusImpact);
    setValue("potassiumImpact", plant.nutrients.potassiumImpact);
    setValue("germinationDays", plant.growthCycle.germination);
    setValue("maturityDays", plant.growthCycle.maturity);
    setValue("harvestDays", plant.growthCycle.harvest);
    
    // Handle companion plants as comma-separated string
    setValue("compatiblePlants", plant.compatiblePlants ? plant.compatiblePlants.join(', ') : "");
    setValue("companionBenefits", plant.companionBenefits || "");
    
    setIsEditDialogOpen(true);
  };
  
  const onEditPlant = async (data: AddPlantFormValues) => {
    if (!currentPlant) return;
    
    try {
      // Process companion plants from comma-separated string to array
      const companionPlants = data.compatiblePlants
        ? data.compatiblePlants.split(',').map(p => p.trim()).filter(p => p.length > 0)
        : [];
      
      // Create plant update payload
      const updatedPlant: Partial<Omit<Plant, 'id'>> = {
        name: data.name,
        imageUrl: data.imageUrl || undefined,
        description: data.description,
        nutrients: {
          nitrogenImpact: data.nitrogenImpact,
          phosphorusImpact: data.phosphorusImpact,
          potassiumImpact: data.potassiumImpact,
        },
        compatiblePlants: companionPlants,
        companionBenefits: data.companionBenefits || undefined,
        growthCycle: {
          germination: data.germinationDays,
          maturity: data.maturityDays,
          harvest: data.harvestDays,
        }
      };
      
      // Use the API to update the plant
      await plantAPI.update(currentPlant.id, updatedPlant);
      
      toast({
        title: "Plant Updated",
        description: `${data.name} has been updated in your plant library.`,
      });
      
      setIsEditDialogOpen(false);
      setCurrentPlant(null);
      refetch(); // Refresh the plant list
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
      // Call API to delete the plant
      await plantAPI.delete(plant.id);
      
      toast({
        title: "Plant Deleted",
        description: `${plant.name} has been removed from your plant library.`,
      });
      
      setIsEditDialogOpen(false);
      setCurrentPlant(null);
      refetch(); // Refresh the plant list
    } catch (error) {
      console.error("Error deleting plant:", error);
      toast({
        title: "Error",
        description: "Failed to delete plant. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Filter plants based on search term
  const filteredPlants = plants.filter(plant => 
    plant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    plant.description.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-garden-primary">Plant Library</h1>
            <p className="text-muted-foreground">
              Manage your plants and their impact on soil nutrients
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-garden-primary hover:bg-garden-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Plant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-md md:max-w-lg overflow-y-auto max-h-[90vh]">
              <form onSubmit={handleSubmit(onAddPlant)}>
                <DialogHeader>
                  <DialogTitle>Add New Plant</DialogTitle>
                  <DialogDescription>
                    Enter details about the plant and how it affects soil nutrients.
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
                <DialogFooter className="flex-col sm:flex-row sm:justify-end gap-2">
                  <Button type="submit" className="bg-garden-primary hover:bg-garden-primary/90 w-full sm:w-auto">
                    Add Plant
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search plants..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6">
            {[1, 2, 3].map((i) => (
              <div 
                key={i}
                className="h-20 rounded-lg bg-gray-200 animate-pulse"
              ></div>
            ))}
          </div>
        ) : filteredPlants.length > 0 ? (
          <Card>
            <CardContent className="p-0 overflow-auto">
              <div className="md:hidden">
                {/* Stacked cards for mobile view */}
                <div className="space-y-4 p-4">
                  {filteredPlants.map((plant) => (
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
                        <span className="font-medium">{plant.name}</span>
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

                      <div>
                        <p className="text-sm font-medium mb-1">Growth Cycle</p>
                        <div className="text-xs space-y-1">
                          <div>Germination: {plant.growthCycle.germination} days</div>
                          <div>Maturity: {plant.growthCycle.maturity} days</div>
                          <div>Harvest: {plant.growthCycle.harvest} days</div>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-1">Companion Plants</p>
                        <div className="flex flex-col gap-1">
                          {plant.compatiblePlants && plant.compatiblePlants.length > 0 ? (
                            <>
                              <div className="text-xs font-medium">Plants: {plant.compatiblePlants.join(', ')}</div>
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
                      </div>

                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditPlant(plant)}
                        className="w-full"
                      >
                        Edit
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Table for larger screens */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plant</TableHead>
                      <TableHead>Nutrient Impact</TableHead>
                      <TableHead>Growth Cycle</TableHead>
                      <TableHead>Companion Plants</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlants.map((plant) => (
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
                            <span>{plant.name}</span>
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
                                <div className="text-xs font-medium">Plants: {plant.compatiblePlants.join(', ')}</div>
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
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditPlant(plant)}
                            className="w-full"
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center py-12 border rounded-lg bg-white">
            <div className="w-16 h-16 bg-garden-primary/10 rounded-full mx-auto flex items-center justify-center mb-4">
              <Leaf className="h-8 w-8 text-garden-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Plants Found</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {searchTerm ? "No plants match your search criteria." : "You haven't added any plants to your library yet."}
            </p>
            {!searchTerm && (
              <Button 
                onClick={() => setIsDialogOpen(true)}
                className="bg-garden-primary hover:bg-garden-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Plant
              </Button>
            )}
          </div>
        )}
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
    </Layout>
  );
};

{/* Edit Plant Dialog */}
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="ph">Soil pH Preference</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phMin" className="text-xs">Minimum pH</Label>
                  <Input 
                    id="phMin"
                    type="number" 
                    step="0.1"
                    min="0"
                    max="14"
                    {...register("phMin", { valueAsNumber: true })} 
                  />
                </div>
                <div>
                  <Label htmlFor="phMax" className="text-xs">Maximum pH</Label>
                  <Input 
                    id="phMax"
                    type="number"
                    step="0.1" 
                    min="0"
                    max="14"
                    {...register("phMax", { valueAsNumber: true })} 
                  />
                </div>
              </div>
              {(errors.phMin || errors.phMax) && (
                <p className="text-sm text-destructive">Please enter a valid pH range (0-14)</p>
              )}
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
        
        {/* Delete Confirmation Dialog */}
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
