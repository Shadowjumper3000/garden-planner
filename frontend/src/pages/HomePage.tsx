
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Garden } from "@/types";
import { gardenAPI, getMockGardens } from "@/api";
import { useAuth } from "@/contexts/AuthContext";
import { Folder, FolderPlus, Leaf } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const createGardenSchema = z.object({
  name: z.string().min(2, "Garden name must be at least 2 characters"),
  rows: z.number().min(1, "Must have at least 1 row").max(20, "Maximum 20 rows"),
  columns: z.number().min(1, "Must have at least 1 column").max(20, "Maximum 20 columns"),
});

type CreateGardenFormValues = z.infer<typeof createGardenSchema>;

const HomePage = () => {
  const { isAuthenticated } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  
  // Fetch gardens or use mock data
  const { data: gardens = [], isLoading, refetch } = useQuery({
    queryKey: ["gardens"],
    queryFn: async () => {
      try {
        if (!isAuthenticated) {
          return [];
        }
        
        // In a real app, this would call gardenAPI.getAll()
        // For demo, we'll use mock data
        return getMockGardens();
      } catch (error) {
        console.error("Error fetching gardens:", error);
        return [];
      }
    },
  });
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<CreateGardenFormValues>({
    resolver: zodResolver(createGardenSchema),
    defaultValues: {
      name: "",
      rows: 8,
      columns: 10,
    },
  });
  
  const onCreateGarden = async (data: CreateGardenFormValues) => {
    try {
      // In a real app, this would call gardenAPI.create()
      console.log("Creating garden:", data);
      
      toast({
        title: "Garden Created",
        description: `${data.name} has been created successfully.`,
      });
      
      setIsDialogOpen(false);
      reset();
      refetch(); // Refetch gardens to update the list
    } catch (error) {
      console.error("Error creating garden:", error);
      toast({
        title: "Error",
        description: "Failed to create garden. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Layout>
      <div className="bg-garden-primary text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-6">Welcome to Garden Planner</h1>
          <p className="text-xl max-w-2xl mx-auto mb-8">
            Plan, design and manage your garden with our easy-to-use tools. Track soil nutrients, 
            plant companions, and optimize your growing space.
          </p>
          {!isAuthenticated && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/login">
                <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10">
                  Login
                </Button>
              </Link>
              <Link to="/register">
                <Button size="lg" className="bg-white text-garden-primary hover:bg-garden-light">
                  Create Account
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-12">
        {isAuthenticated ? (
          <>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-serif font-semibold text-garden-primary">Your Gardens</h2>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-garden-primary hover:bg-garden-primary/90">
                    <FolderPlus className="h-4 w-4 mr-2" />
                    New Garden
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleSubmit(onCreateGarden)}>
                    <DialogHeader>
                      <DialogTitle>Create New Garden</DialogTitle>
                      <DialogDescription>
                        Enter details for your new garden space.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Garden Name</Label>
                        <Input 
                          id="name"
                          placeholder="Vegetable Patch"
                          {...register("name")} 
                        />
                        {errors.name && (
                          <p className="text-sm text-destructive">{errors.name.message}</p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="rows">Rows</Label>
                          <Input 
                            id="rows"
                            type="number" 
                            min={1}
                            max={20}
                            {...register("rows", { valueAsNumber: true })} 
                          />
                          {errors.rows && (
                            <p className="text-sm text-destructive">{errors.rows.message}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="columns">Columns</Label>
                          <Input 
                            id="columns"
                            type="number" 
                            min={1}
                            max={20}
                            {...register("columns", { valueAsNumber: true })} 
                          />
                          {errors.columns && (
                            <p className="text-sm text-destructive">{errors.columns.message}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" className="bg-garden-primary hover:bg-garden-primary/90">
                        Create Garden
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div 
                    key={i}
                    className="h-64 rounded-lg bg-gray-200 animate-pulse"
                  ></div>
                ))}
              </div>
            ) : gardens.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {gardens.map((garden) => (
                  <Link to={`/gardens/${garden.id}`} key={garden.id}>
                    <Card className="h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xl font-serif text-garden-primary">
                            {garden.name}
                          </CardTitle>
                          <div className="w-10 h-10 bg-garden-secondary/10 rounded-full flex items-center justify-center">
                            <Folder className="h-5 w-5 text-garden-secondary" />
                          </div>
                        </div>
                        <CardDescription>
                          {garden.rows}×{garden.columns} grid
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div 
                          className="soil-grid w-full h-32 grid"
                          style={{ 
                            gridTemplateRows: `repeat(${Math.min(garden.rows, 8)}, 1fr)`,
                            gridTemplateColumns: `repeat(${Math.min(garden.columns, 10)}, 1fr)`
                          }}
                        >
                          {Array.from({ length: Math.min(garden.rows, 8) }).map((_, rowIndex) => (
                            Array.from({ length: Math.min(garden.columns, 10) }).map((_, colIndex) => (
                              <div 
                                key={`${rowIndex}-${colIndex}`}
                                className="soil-cell"
                                style={{
                                  backgroundColor: `rgba(94, 75, 62, ${0.1 + Math.random() * 0.3})`
                                }}
                              />
                            ))
                          ))}
                        </div>
                      </CardContent>
                      <CardFooter className="pt-2">
                        <p className="text-sm text-muted-foreground">
                          Created {new Date(garden.createdAt).toLocaleDateString()}
                        </p>
                      </CardFooter>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-garden-primary/10 rounded-full mx-auto flex items-center justify-center mb-4">
                  <FolderPlus className="h-8 w-8 text-garden-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">No Gardens Yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Create your first garden to start planning your plants and tracking soil nutrients.
                </p>
                <Button 
                  onClick={() => setIsDialogOpen(true)}
                  className="bg-garden-primary hover:bg-garden-primary/90"
                >
                  Create Your First Garden
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-serif font-semibold text-garden-primary mb-6">Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-garden-primary/10 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-garden-primary">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M3 9h18" />
                      <path d="M9 21V9" />
                    </svg>
                  </div>
                  <CardTitle className="font-serif text-garden-primary">Garden Planning</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Design your garden layout with our interactive grid system. Arrange plants optimally based on space and sunlight needs.</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-garden-primary/10 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-garden-primary">
                      <path d="M2 22c1.25-1 2.5-1 5-1 2 0 3 1 5 1s3-1 5-1c2.5 0 3.75 0 5 1" />
                      <path d="M2 17c1.25-1 2.5-1 5-1 2 0 3 1 5 1s3-1 5-1c2.5 0 3.75 0 5 1" />
                      <path d="M2 12c1.25-1 2.5-1 5-1 2 0 3 1 5 1s3-1 5-1c2.5 0 3.75 0 5 1" />
                      <path d="M15 5V2" />
                      <path d="M18 8V5" />
                      <path d="M15 11V8" />
                    </svg>
                  </div>
                  <CardTitle className="font-serif text-garden-primary">Soil Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Track and monitor soil nutrient levels. Get alerts when soil needs amendments and view historical soil health data.</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <div className="w-12 h-12 bg-garden-primary/10 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-garden-primary">
                      <path d="M12 2L3 9h4v11h10V9h4z" />
                      <path d="M12 3v10" />
                      <path d="M6 13h12" />
                      <path d="M10 17v-4" />
                      <path d="M14 17v-4" />
                    </svg>
                  </div>
                  <CardTitle className="font-serif text-garden-primary">Plant Library</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Access a comprehensive database of plants with growing information, companion planting suggestions, and seasonal planting guides.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default HomePage;
