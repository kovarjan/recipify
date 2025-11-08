// services/llm.ts
import { Alert } from "react-native";
import { Recipe } from "../lib/schema";
import { openRouterChat } from "./openrouter";

// ---- helpers: sanitize + qty parsing ----
const UNICODE_FRACTIONS: Record<string, number> = {
    "¼": 0.25, "½": 0.5, "¾": 0.75,
    "⅐": 1/7, "⅑": 1/9, "⅒": 0.1,
    "⅓": 1/3, "⅔": 2/3, "⅕": 0.2, "⅖": 0.4, "⅗": 0.6, "⅘": 0.8,
    "⅙": 1/6, "⅚": 5/6, "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875,
};

function unicodeToDecimal(str: string): string {
    return str.replace(/[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/g, ch => String(UNICODE_FRACTIONS[ch]));
}

/** Parses "1 3/4", "3/4", "⅛", "1.5" -> number; returns NaN if not a number. */
function parseQty(input: unknown): number | undefined {
    if (typeof input === "number") return input;
    if (typeof input !== "string") return undefined;
    const s = unicodeToDecimal(input).trim();

    // Mixed number "1 3/4"
    const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (mixed) {
        const whole = parseFloat(mixed[1]);
        const num = parseFloat(mixed[2]);
        const den = parseFloat(mixed[3]);
        return whole + (den ? num / den : 0);
    }
    // Simple fraction "3/4"
    const frac = s.match(/^(\d+)\/(\d+)$/);
    if (frac) {
        const num = parseFloat(frac[1]);
        const den = parseFloat(frac[2]);
        return den ? num / den : undefined;
    }
    // Decimal or integer
    const n = Number(s);
    return Number.isFinite(n) ? n : undefined;
}

/** Deeply removes keys with null values and trims empty strings; converts qty strings to numbers. */
function sanitizeRecipeJSON(draft: any) {
    const deep = (val: any): any => {
        if (Array.isArray(val)) return val.map(deep).filter(v => v !== undefined);
        if (val && typeof val === "object") {
            const out: any = {};
            for (const [k, v] of Object.entries(val)) {
                if (v === null) continue; // drop nulls
                const cleaned = deep(v);
                if (cleaned === undefined) continue;
                out[k] = cleaned;
            }
            return out;
        }
        if (typeof val === "string") {
            const t = val.trim();
            // normalize typos like "sól" -> leave as-is (you can add a fixer here if you want)
            return t.length ? t : undefined; // drop empty strings
        }
        return val;
    };

    const out = deep(draft);

    // Ingredient-specific normalization
    if (out?.ingredients && Array.isArray(out.ingredients)) {
        out.ingredients = out.ingredients.map((ing: any) => {
            if (!ing || typeof ing !== "object") return ing;
            const normalized: any = { ...ing };

            // qty: convert strings/fractions -> number; if fails, omit
            if (normalized.qty !== undefined) {
                const q = parseQty(normalized.qty);
                if (q === undefined || Number.isNaN(q)) delete normalized.qty;
                else normalized.qty = q;
            }

            // unit: if empty after trim it was removed; okay
            // item: ensure present
            if (!normalized.item) return undefined;

            return normalized;
        }).filter(Boolean);
    }

    // Steps: ensure order is number
    if (out?.steps && Array.isArray(out.steps)) {
        out.steps = out.steps.map((s: any, i: number) => {
            if (!s || typeof s !== "object") return undefined;
            const ns: any = { ...s };
            if (typeof ns.order !== "number") ns.order = i + 1;
            return ns.text ? ns : undefined;
        }).filter(Boolean);
    }

    return out;
}


export async function parseRecipe(ocrText: string) {
    // Build your prompt (system rules + OCR text)
    const systemRules = `
You extract structured recipe data as JSON ONLY (no prose).
Return an object matching this shape (omit fields if unknown):
{
  "title": string,
  "description"?: string,
  "servings"?: number,
  "totalTimeMinutes"?: number,
  "categories"?: string[],
  "tags"?: string[],
  "ingredients": Array<{ "qty"?: number, "unit"?: string, "item": string, "notes"?: string }>,
  "steps": Array<{ "order": number, "text": string, "timeMinutes"?: number }>
}
Rules:
- Output valid JSON with double quotes, no comments, no markdown fences.
- Convert unicode fractions (½, ¼) to decimals.
- Prefer SI units (g, ml) or common cooking units (tsp, tbsp, cup).
- Keep section context in 'notes' (e.g., "for the sauce").
- Tags should be single words, lowercase based on recipe content.
- Never invent data: if unknown, omit the key.
`.trim();

    const prompt = `${systemRules}\n\nOCR_TEXT:\n${ocrText}\n\nRespond with JSON only.`;

    let content;
    // 1) Call OpenRouter and get the assistant message content (string)
    try {
        content = await openRouterChat(prompt);
    } catch (e) {
        console.error("Error calling OpenRouter:", e);
        Alert.alert("Error", "Failed to process recipe. Please try again.");
        return null;
    }

    // 2) Clean any accidental code fences and extract the first JSON object
    const cleaned1 = content
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/i, "")
        .trim();

    const match = cleaned1.match(/\{[\s\S]*\}/);
    if (!match) {
        throw new Error(`Model did not return JSON. Got: ${cleaned1.slice(0, 200)}…`);
    }

    // 3) Parse JSON -> object
    let draft: unknown;
    try {
        draft = JSON.parse(match[0]);
    } catch (e) {
        throw new Error(`Failed to parse JSON from model: ${String(e)}`);
    }

    // // 4) Validate leniently with Zod (you add id/timestamps later)
    // const validated = Recipe.partial().parse(draft);
    // if (!validated.ingredients) validated.ingredients = [];
    // if (!validated.steps) validated.steps = [];


    // 3) Parse JSON -> object (you already have `draft`)
    const cleaned = sanitizeRecipeJSON(draft);

    // 4) Validate leniently with Zod
    const validated = Recipe.partial().parse(cleaned);
    if (!validated.ingredients) validated.ingredients = [];
    if (!validated.steps) validated.steps = [];
    return validated;

}
