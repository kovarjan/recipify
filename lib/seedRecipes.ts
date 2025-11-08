// seedRecipes.ts

type Ingredient = { qty?: number; unit?: string; item: string; notes?: string };
type Step = { order: number; text: string; timeMinutes?: number };

type Recipe = {
  id: string;
  title: string;
  description?: string;
  servings?: number;
  totalTimeMinutes?: number;
  categories?: string[];
  tags?: string[];
  ingredients: Ingredient[];
  steps: Step[];
  source?: { kind: "photo" | "import" | "manual"; uri?: string };
  nutrition?: { kcal?: number; proteinG?: number; carbsG?: number; fatG?: number };
  createdAt: number;
  updatedAt: number;
  schemaVersion: 1;
};

/**
 * Generate 4 example recipes in your structure.
 * If you pass an insert function, each recipe will be inserted as well.
 */
export const generateInitData = (insertRecipe?: (r: Recipe) => unknown): Recipe[] => {
    const now = Date.now();

    const base: Omit<Recipe, "id" | "createdAt" | "updatedAt" | "schemaVersion">[] = [
    // 1) Classic Pancakes
        {
            title: "Classic Pancakes",
            description: "Fluffy, quick breakfast pancakes.",
            servings: 2,
            totalTimeMinutes: 20,
            categories: ["Breakfast", "Quick"],
            tags: ["easy", "sweet", "stovetop"],
            ingredients: [
                { qty: 150, unit: "g", item: "All-purpose flour" },
                { qty: 1, unit: "tbsp", item: "Sugar" },
                { qty: 1, unit: "tsp", item: "Baking powder" },
                { qty: 1, unit: "pinch", item: "Salt" },
                { qty: 1, unit: "pcs", item: "Egg" },
                { qty: 220, unit: "ml", item: "Milk", notes: "Whole milk preferred" },
                { qty: 1, unit: "tbsp", item: "Butter", notes: "Melted" }
            ],
            steps: [
                { order: 1, text: "Whisk dry ingredients in a bowl." },
                { order: 2, text: "Add egg, milk, and melted butter; mix until just combined." },
                { order: 3, text: "Cook batter on medium heat until bubbles form; flip and finish.", timeMinutes: 10 }
            ],
            source: { kind: "manual" },
            nutrition: { kcal: 420, proteinG: 14, carbsG: 60, fatG: 14 }
        },

        // 2) Garlic Butter Shrimp Pasta
        {
            title: "Garlic Butter Shrimp Pasta",
            description: "Weeknight pasta with garlicky shrimp and parsley.",
            servings: 2,
            totalTimeMinutes: 25,
            categories: ["Main", "Pasta"],
            tags: ["dinner", "seafood", "quick"],
            ingredients: [
                { qty: 180, unit: "g", item: "Spaghetti" },
                { qty: 250, unit: "g", item: "Shrimp", notes: "Peeled & deveined" },
                { qty: 2, unit: "tbsp", item: "Butter" },
                { qty: 2, unit: "tbsp", item: "Olive oil" },
                { qty: 3, unit: "cloves", item: "Garlic", notes: "Minced" },
                { qty: 1, unit: "pinch", item: "Chili flakes" },
                { qty: 1, unit: "tbsp", item: "Lemon juice" },
                { qty: 2, unit: "tbsp", item: "Parsley", notes: "Chopped" },
                { qty: 1, unit: "pinch", item: "Salt" },
                { qty: 1, unit: "pinch", item: "Black pepper" }
            ],
            steps: [
                { order: 1, text: "Cook spaghetti in salted water until al dente.", timeMinutes: 8 },
                { order: 2, text: "Sauté garlic in butter and olive oil; add chili flakes." },
                { order: 3, text: "Add shrimp and cook until pink; deglaze with lemon juice." , timeMinutes: 4},
                { order: 4, text: "Toss pasta with shrimp, add parsley, season, and serve." }
            ],
            source: { kind: "manual" },
            nutrition: { kcal: 610, proteinG: 33, carbsG: 70, fatG: 22 }
        },

        // 3) Hearty Veggie Chili
        {
            title: "Hearty Veggie Chili",
            description: "Bean-forward chili with peppers and tomatoes.",
            servings: 4,
            totalTimeMinutes: 40,
            categories: ["Main", "One-Pot"],
            tags: ["vegetarian", "gluten-free", "stew"],
            ingredients: [
                { qty: 1, unit: "tbsp", item: "Olive oil" },
                { qty: 1, unit: "pcs", item: "Onion", notes: "Diced" },
                { qty: 2, unit: "pcs", item: "Bell peppers", notes: "Diced" },
                { qty: 2, unit: "cloves", item: "Garlic", notes: "Minced" },
                { qty: 400, unit: "g", item: "Canned tomatoes" },
                { qty: 400, unit: "g", item: "Kidney beans", notes: "Drained" },
                { qty: 400, unit: "g", item: "Black beans", notes: "Drained" },
                { qty: 1, unit: "tbsp", item: "Chili powder" },
                { qty: 1, unit: "tsp", item: "Cumin" },
                { qty: 1, unit: "pinch", item: "Salt" },
                { qty: 1, unit: "pinch", item: "Black pepper" }
            ],
            steps: [
                { order: 1, text: "Sauté onion, peppers, and garlic in oil until softened.", timeMinutes: 6 },
                { order: 2, text: "Add tomatoes, beans, and spices; stir to combine." },
                { order: 3, text: "Simmer uncovered, stirring occasionally, until thickened.", timeMinutes: 25 }
            ],
            source: { kind: "manual" },
            nutrition: { kcal: 320, proteinG: 17, carbsG: 48, fatG: 7 }
        },

        // 4) Banana Oat Cookies
        {
            title: "Banana Oat Cookies",
            description: "3-ingredient style soft cookies; great for snacks.",
            servings: 8,
            totalTimeMinutes: 18,
            categories: ["Snack", "Baking"],
            tags: ["healthy", "no-refined-sugar", "quick"],
            ingredients: [
                { qty: 2, unit: "pcs", item: "Bananas", notes: "Ripe, mashed" },
                { qty: 140, unit: "g", item: "Rolled oats" },
                { qty: 50, unit: "g", item: "Dark chocolate chips", notes: "Optional" }
            ],
            steps: [
                { order: 1, text: "Preheat oven to 180°C (356°F). Line tray with parchment.", timeMinutes: 5 },
                { order: 2, text: "Mix mashed bananas with oats; fold in chocolate chips." },
                { order: 3, text: "Scoop onto tray and bake until set and lightly golden.", timeMinutes: 12 }
            ],
            source: { kind: "manual" },
            nutrition: { kcal: 120, proteinG: 3, carbsG: 22, fatG: 3 }
        }
    ];

    const data: Recipe[] = base.map((r, i) => {
        const rec: Recipe = {
            ...r,
            id: `${now}-${i}`,
            createdAt: now,
            updatedAt: now,
            schemaVersion: 1
        };
        if (insertRecipe) insertRecipe(rec);
        return rec;
    });

    return data;
};

// Example usage:
// const seeded = generateInitData(insertRecipe);
// or just:
// const seeded = generateInitData();
