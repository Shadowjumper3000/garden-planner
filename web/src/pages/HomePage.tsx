import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Garden } from "@/types";
import { gardenAPI } from "@/api";
import { useAuth } from "@/contexts/AuthContext";
import { FolderPlus } from "lucide-react";
import CreateGardenDialog from "@/components/home/CreateGardenDialog";
import GardenCard from "@/components/home/GardenCard";
import FeaturesSection from "@/components/home/FeaturesSection";

const HomePage = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data = [], isLoading: gardensLoading } = useQuery({
    queryKey: ["gardens", isAuthenticated],
    queryFn: async () => {
      if (!isAuthenticated) return [];
      try {
        const response = await gardenAPI.getAll();
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error("Error fetching gardens:", error);
        return [];
      }
    },
    enabled: isAuthenticated && !authLoading,
    retry: 2,
    retryDelay: 1000,
  });

  const gardens: Garden[] = Array.isArray(data) ? data : [];
  const isLoading = authLoading || gardensLoading;

  return (
    <Layout>
      {/* Hero */}
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

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        {isAuthenticated ? (
          <>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-serif font-semibold text-garden-primary">Your Gardens</h2>
              <Button className="bg-garden-primary hover:bg-garden-primary/90" onClick={() => setIsDialogOpen(true)}>
                <FolderPlus className="h-4 w-4 mr-2" />
                New Garden
              </Button>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-64 rounded-lg bg-gray-200 animate-pulse" />
                ))}
              </div>
            ) : gardens.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {gardens.map((garden) => (
                  <GardenCard key={garden.id} garden={garden} />
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
                <Button onClick={() => setIsDialogOpen(true)} className="bg-garden-primary hover:bg-garden-primary/90">
                  Create Your First Garden
                </Button>
              </div>
            )}

            <CreateGardenDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
          </>
        ) : (
          <FeaturesSection />
        )}
      </div>
    </Layout>
  );
};

export default HomePage;
