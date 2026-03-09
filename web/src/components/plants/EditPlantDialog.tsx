import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PlantFormFields from "./PlantFormFields";
import { plantSchema, PlantFormValues, defaultPlantFormValues } from "@/lib/plantSchema";
import { usePlantMutations } from "@/hooks/usePlantMutations";
import { Plant } from "@/types";

interface EditPlantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plant: Plant | null;
}

const EditPlantDialog: React.FC<EditPlantDialogProps> = ({ open, onOpenChange, plant }) => {
  const { updateMutation, deleteMutation } = usePlantMutations();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<PlantFormValues>({
    resolver: zodResolver(plantSchema),
    defaultValues: defaultPlantFormValues,
  });

  useEffect(() => {
    if (plant) {
      setValue("name", plant.name);
      setValue("imageUrl", plant.imageUrl ?? "");
      setValue("description", plant.description);
      setValue("nitrogenImpact", plant.nutrients.nitrogenImpact);
      setValue("phosphorusImpact", plant.nutrients.phosphorusImpact);
      setValue("potassiumImpact", plant.nutrients.potassiumImpact);
      setValue("germinationDays", plant.growthCycle.germination);
      setValue("maturityDays", plant.growthCycle.maturity);
      setValue("harvestDays", plant.growthCycle.harvest);
      setValue("widthM", plant.size?.widthM ?? 0.5);
      setValue("heightM", plant.size?.heightM ?? 0.5);
      setValue("compatiblePlants", plant.compatiblePlants?.join(", ") ?? "");
      setValue("companionBenefits", plant.companionBenefits ?? "");
    }
  }, [plant, setValue]);

  if (!plant) return null;

  const onSubmit = async (data: PlantFormValues) => {
    await updateMutation.mutateAsync({ id: plant.id, data });
    onOpenChange(false);
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(plant);
    setDeleteConfirmOpen(false);
    onOpenChange(false);
    reset();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-[95vw] sm:max-w-md md:max-w-lg overflow-y-auto max-h-[90vh]"
          style={{ resize: "none" }}
        >
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Edit Plant: {plant.name}</DialogTitle>
              <DialogDescription>Update the details of this plant and its soil impact.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <PlantFormFields register={register} errors={errors} idPrefix="edit-" />
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
              <Button
                type="submit"
                className="bg-garden-primary hover:bg-garden-primary/90 w-full sm:w-auto"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm delete nested dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm" style={{ resize: "none" }}>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {plant.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} className="sm:flex-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} className="sm:flex-1" disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Delete Plant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EditPlantDialog;
