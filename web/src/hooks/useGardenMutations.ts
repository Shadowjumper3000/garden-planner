import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gardenAPI } from "@/api";
import { useToast } from "@/hooks/use-toast";
import type { CreateGardenFormValues } from "@/lib/gardenSchema";

export function useGardenMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: (data: CreateGardenFormValues) => gardenAPI.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["gardens"] });
      toast({
        title: "Garden Created",
        description: `${variables.name} has been created successfully.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create garden. Please try again.",
        variant: "destructive",
      });
    },
  });

  return { createMutation };
}
