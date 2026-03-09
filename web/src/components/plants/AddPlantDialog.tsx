import React from "react";
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

interface AddPlantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AddPlantDialog: React.FC<AddPlantDialogProps> = ({ open, onOpenChange }) => {
  const { addMutation } = usePlantMutations();
  const { register, handleSubmit, formState: { errors }, reset } = useForm<PlantFormValues>({
    resolver: zodResolver(plantSchema),
    defaultValues: defaultPlantFormValues,
  });

  const onSubmit = async (data: PlantFormValues) => {
    await addMutation.mutateAsync(data);
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent
        className="max-w-[95vw] sm:max-w-md md:max-w-lg overflow-y-auto max-h-[90vh]"
        style={{ resize: "none" }}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Add New Plant</DialogTitle>
            <DialogDescription>Create a new plant for your garden library.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <PlantFormFields register={register} errors={errors} idPrefix="add-" />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => { onOpenChange(false); reset(); }}>
              Cancel
            </Button>
            <Button type="submit" className="bg-garden-primary hover:bg-garden-primary/90" disabled={addMutation.isPending}>
              {addMutation.isPending ? "Adding..." : "Add Plant"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddPlantDialog;
