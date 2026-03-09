import React from "react";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlantFormValues } from "@/lib/plantSchema";

interface PlantFormFieldsProps {
  register: UseFormRegister<PlantFormValues>;
  errors: FieldErrors<PlantFormValues>;
  /** Prefix applied to each field id to avoid duplicate ids when both dialogs are mounted */
  idPrefix?: string;
}

/**
 * Shared form fields for adding or editing a plant.
 * Accepts register/errors from a react-hook-form instance.
 */
const PlantFormFields: React.FC<PlantFormFieldsProps> = ({ register, errors, idPrefix = "" }) => {
  const id = (name: string) => `${idPrefix}${name}`;
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={id("name")}>Plant Name</Label>
        <Input id={id("name")} placeholder="Tomato" {...register("name")} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor={id("imageUrl")}>Image URL (optional)</Label>
        <Input id={id("imageUrl")} placeholder="https://example.com/image.jpg" {...register("imageUrl")} />
        {errors.imageUrl && <p className="text-sm text-destructive">{errors.imageUrl.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor={id("description")}>Description</Label>
        <Textarea id={id("description")} placeholder="A brief description of the plant..." rows={3} {...register("description")} />
        {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor={id("nitrogenImpact")}>Nitrogen Impact</Label>
          <Input id={id("nitrogenImpact")} type="number" min={-10} max={10} step={1} {...register("nitrogenImpact", { valueAsNumber: true })} />
          {errors.nitrogenImpact && <p className="text-sm text-destructive">{errors.nitrogenImpact.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor={id("phosphorusImpact")}>Phosphorus Impact</Label>
          <Input id={id("phosphorusImpact")} type="number" min={-10} max={10} step={1} {...register("phosphorusImpact", { valueAsNumber: true })} />
          {errors.phosphorusImpact && <p className="text-sm text-destructive">{errors.phosphorusImpact.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor={id("potassiumImpact")}>Potassium Impact</Label>
          <Input id={id("potassiumImpact")} type="number" min={-10} max={10} step={1} {...register("potassiumImpact", { valueAsNumber: true })} />
          {errors.potassiumImpact && <p className="text-sm text-destructive">{errors.potassiumImpact.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor={id("germinationDays")}>Germination (days)</Label>
          <Input id={id("germinationDays")} type="number" min={1} {...register("germinationDays", { valueAsNumber: true })} />
          {errors.germinationDays && <p className="text-sm text-destructive">{errors.germinationDays.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor={id("maturityDays")}>Maturity (days)</Label>
          <Input id={id("maturityDays")} type="number" min={1} {...register("maturityDays", { valueAsNumber: true })} />
          {errors.maturityDays && <p className="text-sm text-destructive">{errors.maturityDays.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor={id("harvestDays")}>Harvest (days)</Label>
          <Input id={id("harvestDays")} type="number" min={1} {...register("harvestDays", { valueAsNumber: true })} />
          {errors.harvestDays && <p className="text-sm text-destructive">{errors.harvestDays.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={id("widthM")}>Plant Width (m)</Label>
          <Input id={id("widthM")} type="number" min={0.1} max={10} step={0.1} {...register("widthM", { valueAsNumber: true })} />
          {errors.widthM && <p className="text-sm text-destructive">{errors.widthM.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor={id("heightM")}>Plant Height (m)</Label>
          <Input id={id("heightM")} type="number" min={0.1} max={10} step={0.1} {...register("heightM", { valueAsNumber: true })} />
          {errors.heightM && <p className="text-sm text-destructive">{errors.heightM.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={id("compatiblePlants")}>Compatible Plants (comma-separated)</Label>
        <Textarea id={id("compatiblePlants")} placeholder="Basil, Marigold, Carrots" rows={2} {...register("compatiblePlants")} />
        <p className="text-xs text-muted-foreground">Enter plant names separated by commas</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={id("companionBenefits")}>Companion Benefits</Label>
        <Textarea id={id("companionBenefits")} placeholder="Describe the mutual benefits of companion planting..." rows={2} {...register("companionBenefits")} />
        <p className="text-xs text-muted-foreground">Describe how these plants benefit each other when planted together</p>
      </div>
    </div>
  );
};

export default PlantFormFields;
