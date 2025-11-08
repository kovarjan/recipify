import * as SQLite from "expo-sqlite";

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
}

export async function insertRecipe(r) {
    const tags = r.tags?.join(",") ?? null;
    await db.runAsync(
        `INSERT INTO recipes (id,title,description,servings,total_time_minutes,tags,source_kind,source_uri,created_at,updated_at,schema_version)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        r.id, r.title, r.description ?? null, r.servings ?? null, r.totalTimeMinutes ?? null,
        tags, r.source?.kind ?? null, r.source?.uri ?? null, r.createdAt, r.updatedAt, 1
    );
    for (const ing of r.ingredients) {
        await db.runAsync(
            `INSERT INTO ingredients (recipe_id,qty,unit,item,notes) VALUES (?,?,?,?,?)`,
            r.id, ing.qty ?? null, ing.unit ?? null, ing.item, ing.notes ?? null
        );
    }
    for (const s of r.steps) {
        await db.runAsync(
            `INSERT INTO steps (recipe_id,step_order,text,time_minutes) VALUES (?,?,?,?)`,
            r.id, s.order, s.text, s.timeMinutes ?? null
        );
    }
}

export async function listRecipes(search?: string) {
    if (!search) {
        return db.getAllAsync(`SELECT id,title,tags,updated_at FROM recipes ORDER BY updated_at DESC`);
    }
    return db.getAllAsync(
        `SELECT id,title,tags,updated_at FROM recipes WHERE title LIKE ? ORDER BY updated_at DESC`,
        `%${search}%`
    );
}

export async function getRecipe(id: string) {
    const recipe = await db.getFirstAsync(`SELECT * FROM recipes WHERE id=?`, id);
    const ingredients = await db.getAllAsync(`SELECT * FROM ingredients WHERE recipe_id=? ORDER BY id`, id);
    const steps = await db.getAllAsync(`SELECT * FROM steps WHERE recipe_id=? ORDER BY step_order`, id);
    return { recipe, ingredients, steps };
}

export async function deleteRecipe(id: string) {
    await db.runAsync(`DELETE FROM recipes WHERE id=?`, id);
    await db.runAsync(`DELETE FROM ingredients WHERE recipe_id=?`, id);
    await db.runAsync(`DELETE FROM steps WHERE recipe_id=?`, id);
}

export async function clearAllData() {
    await db.runAsync(`DELETE FROM recipes`);
    await db.runAsync(`DELETE FROM ingredients`);
    await db.runAsync(`DELETE FROM steps`);
}