import { z } from "zod";

export const createGardenSchema = z.object({
  name: z.string().min(2, "Garden name must be at least 2 characters"),
  widthM: z.number().min(0.5, "Width must be at least 0.5 m").max(50, "Maximum 50 m"),
  heightM: z.number().min(0.5, "Height must be at least 0.5 m").max(50, "Maximum 50 m"),
});

export type CreateGardenFormValues = z.infer<typeof createGardenSchema>;

export const defaultCreateGardenValues: CreateGardenFormValues = {
  name: "",
  widthM: 5,
  heightM: 5,
};
