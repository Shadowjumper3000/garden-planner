import { z } from "zod";

export const plantSchema = z.object({
  name: z.string().min(2, "Plant name must be at least 2 characters"),
  imageUrl: z.string().url("Must be a valid URL").or(z.string().length(0)),
  description: z.string().min(10, "Description must be at least 10 characters"),
  nitrogenImpact: z.number().min(-10).max(10),
  phosphorusImpact: z.number().min(-10).max(10),
  potassiumImpact: z.number().min(-10).max(10),
  germinationDays: z.number().min(1),
  maturityDays: z.number().min(1),
  harvestDays: z.number().min(1),
  widthM: z.number().min(0.1, "Min 0.1m").max(10, "Max 10m"),
  heightM: z.number().min(0.1, "Min 0.1m").max(10, "Max 10m"),
  compatiblePlants: z.string().default(""),
  companionBenefits: z.string().default(""),
});

export type PlantFormValues = z.infer<typeof plantSchema>;

export const defaultPlantFormValues: PlantFormValues = {
  name: "",
  imageUrl: "",
  description: "",
  nitrogenImpact: 0,
  phosphorusImpact: 0,
  potassiumImpact: 0,
  germinationDays: 7,
  maturityDays: 60,
  harvestDays: 90,
  widthM: 0.5,
  heightM: 0.5,
  compatiblePlants: "",
  companionBenefits: "",
};
