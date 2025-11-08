import { z } from "zod";

export const Ingredient = z.object({
    qty: z.number().optional(),
    unit: z.string().optional(),
    item: z.string(),
    notes: z.string().optional(),
});

export const Step = z.object({
    order: z.number(),
    text: z.string(),
    timeMinutes: z.number().optional(),
});

export const Recipe = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    servings: z.number().optional(),
    totalTimeMinutes: z.number().optional(),
    categories: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    ingredients: z.array(Ingredient),
    steps: z.array(Step),
    source: z.object({
        kind: z.enum(["photo", "import", "manual"]),
        uri: z.string().optional(),
    }).optional(),
    nutrition: z.object({
        kcal: z.number().optional(),
        proteinG: z.number().optional(),
        carbsG: z.number().optional(),
        fatG: z.number().optional(),
    }).optional(),
    createdAt: z.number(),
    updatedAt: z.number(),
    schemaVersion: z.literal(1),
});

export type RecipeT = z.infer<typeof Recipe>;
