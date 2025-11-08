import * as SQLite from "expo-sqlite";
import type { RecipeT } from "./schema";

const db = SQLite.openDatabaseSync("recipes.db");

export async function initDB() {
    await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      servings INTEGER,
      total_time_minutes INTEGER,
      tags TEXT,
      source_kind TEXT,
      source_uri TEXT,
      image_uri TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      schema_version INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id TEXT NOT NULL,
      qty REAL,
      unit TEXT,
      item TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id TEXT NOT NULL,
      step_order INTEGER NOT NULL,
      text TEXT NOT NULL,
      time_minutes INTEGER,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_recipes_title ON recipes(title);
  `);

    // Safe no-op if column already exists
    await migrateAddImageUri();
}

export async function migrateAddImageUri() {
    // Only alter if missing
    const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(recipes)`);
    if (!cols.some(c => c.name === "image_uri")) {
        await db.execAsync(`ALTER TABLE recipes ADD COLUMN image_uri TEXT;`);
    }

    // Add category column if missing
    if (!cols.some(c => c.name === "category")) {
        await db.execAsync(`ALTER TABLE recipes ADD COLUMN category TEXT;`);
    }
}

export async function insertRecipe(r: RecipeT) {
    const mainTag = r.tags && r.tags.length > 0 ? r.tags[0] : null;
    const tags = r.tags?.join(",") ?? null;

    await db.runAsync(
        `INSERT INTO recipes (
       id, title, description, servings, total_time_minutes,
       tags, source_kind, source_uri, image_uri,
       created_at, updated_at, schema_version, category
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        r.id,
        r.title,
        r.description ?? null,
        r.servings ?? null,
        r.totalTimeMinutes ?? null,
        tags,
        r.source?.kind ?? null,
        r.source?.uri ?? null,
        (r as any).image_uri ?? (r as any).imageUri ?? null, // accept either key
        r.createdAt,
        r.updatedAt,
        r.schemaVersion ?? 1,
        r.category ?? mainTag,
    );

    // Ingredients
    for (const ing of r.ingredients) {
        await db.runAsync(
            `INSERT INTO ingredients (recipe_id, qty, unit, item, notes)
       VALUES (?,?,?,?,?)`,
            r.id,
            ing.qty ?? null,
            ing.unit ?? null,
            ing.item,
            ing.notes ?? null
        );
    }

    // Steps
    for (const s of r.steps) {
        await db.runAsync(
            `INSERT INTO steps (recipe_id, step_order, text, time_minutes)
       VALUES (?,?,?,?)`,
            r.id,
            s.order,
            s.text,
            s.timeMinutes ?? null
        );
    }
}

export async function listRecipes(search?: string) {
    if (!search) {
        return db.getAllAsync(
            `SELECT id, title, tags, updated_at, image_uri
       FROM recipes ORDER BY updated_at DESC`
        );
    }
    const rows = await db.getAllAsync(
        `SELECT id, title, tags, updated_at, image_uri
         FROM recipes
         WHERE title LIKE ?
         ORDER BY updated_at DESC`,
        `%${search}%`
    );
    // Map DB fields to JS schema (camelCase)
    return rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        tags: row.tags ? row.tags.split(",") : [],
        updatedAt: row.updated_at,
        imageUri: row.image_uri ?? null,
    }));
}

export async function getRecipe(id: string) {
    const recipe = await db.getFirstAsync(`SELECT * FROM recipes WHERE id=?`, id);
    const ingredients = await db.getAllAsync(
        `SELECT * FROM ingredients WHERE recipe_id=? ORDER BY id`,
        id
    );
    const steps = await db.getAllAsync(
        `SELECT * FROM steps WHERE recipe_id=? ORDER BY step_order`,
        id
    );
    return { recipe, ingredients, steps };
}

export async function deleteRecipe(id: string) {
    // With ON DELETE CASCADE you could just delete from recipes,
    // but keeping explicit deletes is okay too.
    await db.runAsync(`DELETE FROM recipes WHERE id=?`, id);
    await db.runAsync(`DELETE FROM ingredients WHERE recipe_id=?`, id);
    await db.runAsync(`DELETE FROM steps WHERE recipe_id=?`, id);
}

export async function clearAllData() {
    await db.runAsync(`DELETE FROM recipes`);
    await db.runAsync(`DELETE FROM ingredients`);
    await db.runAsync(`DELETE FROM steps`);
}

export async function updateRecipeImage(id: string, imageUri: string | null) {
    await db.runAsync(
        `UPDATE recipes SET image_uri = ?, updated_at = ? WHERE id = ?`,
        imageUri,
        Date.now(),
        id
    );
}

// Update core fields on recipes
export async function updateRecipeFields(p: {
  id: string;
  title?: string | null;
  description?: string | null;
  servings?: number | null;
  total_time_minutes?: number | null;
  tags?: string | null; // CSV
  updated_at: number;
}) {
    const sets: string[] = [];
    const vals: any[] = [];
    for (const [k, v] of Object.entries(p)) {
        if (k === "id") continue;
        sets.push(`${k} = ?`);
        vals.push(v);
    }
    vals.push(p.id);
    await db.runAsync(
        `UPDATE recipes SET ${sets.join(", ")} WHERE id = ?`,
        ...vals
    );
}

// Replace ingredients list
export async function replaceIngredients(recipeId: string, items: any[]) {
    await db.runAsync(`DELETE FROM ingredients WHERE recipe_id = ?`, recipeId);
    for (const ing of items) {
        await db.runAsync(
            `INSERT INTO ingredients (recipe_id, qty, unit, item, notes)
       VALUES (?,?,?,?,?)`,
            recipeId,
            ing.qty ?? null,
            ing.unit ?? null,
            ing.item ?? "",
            ing.notes ?? null
        );
    }
}

// Replace steps list
export async function replaceSteps(recipeId: string, list: any[]) {
    await db.runAsync(`DELETE FROM steps WHERE recipe_id = ?`, recipeId);
    const sorted = (list ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    for (const s of sorted) {
        await db.runAsync(
            `INSERT INTO steps (recipe_id, step_order, text, time_minutes)
       VALUES (?,?,?,?)`,
            recipeId,
            s.order ?? 0,
            s.text ?? "",
            s.timeMinutes ?? s.time_minutes ?? null
        );
    }
}
