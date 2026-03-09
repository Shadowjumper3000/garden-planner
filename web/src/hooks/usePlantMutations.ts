import { useMutation, useQueryClient } from "@tanstack/react-query";
import { plantAPI } from "@/api";
import { Plant } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { PlantFormValues } from "@/lib/plantSchema";

const PLANT_QUERY_KEYS = ["plants", "my-plants", "recent-plants"] as const;

function parseCompanionPlants(raw: string): string[] {
  return raw
    ? raw.split(",").map((p) => p.trim()).filter((p) => p.length > 0)
    : [];
}

function buildPlantPayload(data: PlantFormValues): Omit<Plant, "id"> {
  return {
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
    compatiblePlants: parseCompanionPlants(data.compatiblePlants),
    companionBenefits: data.companionBenefits || undefined,
    growthCycle: {
      germination: data.germinationDays,
      maturity: data.maturityDays,
      harvest: data.harvestDays,
    },
  };
}

export function usePlantMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidateAll = () =>
    PLANT_QUERY_KEYS.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));

  const addMutation = useMutation({
    mutationFn: (data: PlantFormValues) =>
      plantAPI.create(buildPlantPayload(data)),
    onSuccess: (_, data) => {
      invalidateAll();
      toast({ title: "Plant Added", description: `${data.name} has been added to your plant library.` });
    },
    onError: () =>
      toast({ title: "Error", description: "Failed to create plant. Please try again.", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PlantFormValues }) =>
      plantAPI.update(id, buildPlantPayload(data)),
    onSuccess: (_, { data }) => {
      invalidateAll();
      toast({ title: "Plant Updated", description: `${data.name} has been updated in your plant library.` });
    },
    onError: () =>
      toast({ title: "Error", description: "Failed to update plant. Please try again.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (plant: Plant) => plantAPI.delete(plant.id),
    onSuccess: (_, plant) => {
      invalidateAll();
      toast({ title: "Plant Deleted", description: `${plant.name} has been removed from your plant library.` });
    },
    onError: () =>
      toast({ title: "Error", description: "Failed to delete plant. Please try again.", variant: "destructive" }),
  });

  const copyMutation = useMutation({
    mutationFn: (plant: Plant) => {
      const copy: Omit<Plant, "id"> = {
        name: `${plant.name} (My Version)`,
        imageUrl: plant.imageUrl,
        description: plant.description,
        nutrients: { ...plant.nutrients },
        size: plant.size ? { ...plant.size } : { widthM: 0.5, heightM: 0.5 },
        compatiblePlants: [...(plant.compatiblePlants ?? [])],
        companionBenefits: plant.companionBenefits,
        growthCycle: { ...plant.growthCycle },
      };
      return plantAPI.create(copy);
    },
    onSuccess: (_, plant) => {
      invalidateAll();
      toast({ title: "Plant Created", description: `A copy of ${plant.name} has been added to your library.` });
    },
    onError: () =>
      toast({ title: "Error", description: "Failed to copy plant. Please try again.", variant: "destructive" }),
  });

  return { addMutation, updateMutation, deleteMutation, copyMutation };
}
