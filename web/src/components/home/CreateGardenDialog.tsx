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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createGardenSchema, defaultCreateGardenValues, type CreateGardenFormValues } from "@/lib/gardenSchema";
import { useGardenMutations } from "@/hooks/useGardenMutations";

interface CreateGardenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateGardenDialog = ({ open, onOpenChange }: CreateGardenDialogProps) => {
  const { createMutation } = useGardenMutations();

  const { register, handleSubmit, formState: { errors }, reset } = useForm<CreateGardenFormValues>({
    resolver: zodResolver(createGardenSchema),
    defaultValues: defaultCreateGardenValues,
  });

  const onSubmit = async (data: CreateGardenFormValues) => {
    await createMutation.mutateAsync(data);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Create New Garden</DialogTitle>
            <DialogDescription>Enter details for your new garden space.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cg-name">Garden Name</Label>
              <Input id="cg-name" placeholder="Vegetable Patch" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cg-widthM">Width (m)</Label>
                <Input
                  id="cg-widthM"
                  type="number"
                  min={0.5}
                  max={50}
                  step={0.5}
                  {...register("widthM", { valueAsNumber: true })}
                />
                {errors.widthM && <p className="text-sm text-destructive">{errors.widthM.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cg-heightM">Height (m)</Label>
                <Input
                  id="cg-heightM"
                  type="number"
                  min={0.5}
                  max={50}
                  step={0.5}
                  {...register("heightM", { valueAsNumber: true })}
                />
                {errors.heightM && <p className="text-sm text-destructive">{errors.heightM.message}</p>}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              className="bg-garden-primary hover:bg-garden-primary/90"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Garden"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGardenDialog;
