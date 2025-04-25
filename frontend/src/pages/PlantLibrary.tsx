
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
import { plantAPI, getMockPlants } from "@/api";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Leaf, Plus, Search } from "lucide-react";
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
});

type AddPlantFormValues = z.infer<typeof addPlantSchema>;

const PlantLibrary = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Fetch plants or use mock data
  const { data: plants = [], isLoading, refetch } = useQuery({
    queryKey: ["plants"],
    queryFn: async () => {
      try {
        if (!isAuthenticated) {
          navigate('/login');
          return [];
        }
        
        // In a real app, this would call plantAPI.getAll()
        // For demo, we'll use mock data
        return getMockPlants();
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
    },
  });
  
  const onAddPlant = async (data: AddPlantFormValues) => {
    try {
      // In a real app, this would call plantAPI.create()
      console.log("Creating plant:", data);
      
      const newPlant: Plant = {
        id: `plant-${Date.now()}`,
        name: data.name,
        imageUrl: data.imageUrl || undefined,
        description: data.description,
        nutrients: {
          nitrogenImpact: data.nitrogenImpact,
          phosphorusImpact: data.phosphorusImpact,
          potassiumImpact: data.potassiumImpact,
        },
        compatiblePlants: [],
        growthCycle: {
          germination: data.germinationDays,
          maturity: data.maturityDays,
          harvest: data.harvestDays,
        }
      };
      
      toast({
        title: "Plant Added",
        description: `${data.name} has been added to your plant library.`,
      });
      
      setIsDialogOpen(false);
      reset();
      refetch(); // In a real app, this would update the plants list
    } catch (error) {
      console.error("Error creating plant:", error);
      toast({
        title: "Error",
        description: "Failed to create plant. Please try again.",
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
            <DialogContent className="max-w-md">
              <form onSubmit={handleSubmit(onAddPlant)}>
                <DialogHeader>
                  <DialogTitle>Add New Plant</DialogTitle>
                  <DialogDescription>
                    Enter details about the plant and how it affects soil nutrients.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
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
                  
                  <div className="grid grid-cols-3 gap-4">
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
                  
                  <div className="grid grid-cols-3 gap-4">
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
                </div>
                <DialogFooter>
                  <Button type="submit" className="bg-garden-primary hover:bg-garden-primary/90">
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
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plant</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Nutrient Impact</TableHead>
                    <TableHead>Growth Cycle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlants.map((plant) => (
                    <TableRow key={plant.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-garden-secondary/10">
                            {plant.imageUrl ? (
                              <img src={plant.imageUrl} alt={plant.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Leaf className="h-5 w-5 text-garden-secondary" />
                              </div>
                            )}
                          </div>
                          <span>{plant.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {plant.description}
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
    </Layout>
  );
};

export default PlantLibrary;
