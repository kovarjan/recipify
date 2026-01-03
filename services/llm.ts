// services/llm.ts
import { getLlmSettings } from "@/services/settings";
import { Alert } from "react-native";
import { Recipe } from "../lib/schema";

/* ---------------- LLM call (provider-aware) ---------------- */

async function callLlmRaw(prompt: string): Promise<string> {
    const s = await getLlmSettings();

    const provider = s.provider; // "openrouter" | "openai"
    const apiKey = s.apiKey || "";
    const model =
    s.model ||
    (provider === "openai" ? "gpt-4o-mini" : "meta-llama/llama-3.3-8b-instruct:free");
    const url =
    s.baseUrl ||
    (provider === "openai"
        ? "https://api.openai.com/v1/chat/completions"
        : "https://openrouter.ai/api/v1/chat/completions");

    if (!apiKey) {
        throw new Error(
            "Missing API key. Open Settings and set your provider and API key."
        );
    }

    const body =
        provider === "openai"
            ? {
                model,
                messages: [{ role: "user", content: prompt }],
                // temperature: 0.2,
                // Do not add max_tokens for OpenAI
            }
            : {
                model,
                messages: [{ role: "user", content: prompt }],
                temperature: 0,
                max_tokens: 1200,
            };

    const headers: Record<string, string> =
    provider === "openai"
        ? {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        }
        : {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            // Optional niceties for OpenRouter rankings (safe to keep):
            "HTTP-Referer": "http://localhost",
            "X-Title": "Recipify",
        };

    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    const text = await res.text();

    // Try to parse once; if it fails, surface raw text in error.
    let data: any = null;
    try {
        data = JSON.parse(text);
    } catch {
    /* keep text */
    }

    if (!res.ok) {
        const msg = data?.error?.message || data?.message || text || res.statusText;
        throw new Error(msg);
    }

    // Both OpenAI & OpenRouter respond with choices[0].message.content
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    return content;
}

/* ---------------- helpers: sanitize + qty parsing ---------------- */

const UNICODE_FRACTIONS: Record<string, number> = {
    "¼": 0.25, "½": 0.5, "¾": 0.75,
    "⅐": 1 / 7, "⅑": 1 / 9, "⅒": 0.1,
    "⅓": 1 / 3, "⅔": 2 / 3, "⅕": 0.2, "⅖": 0.4, "⅗": 0.6, "⅘": 0.8,
    "⅙": 1 / 6, "⅚": 5 / 6, "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875,
};

function unicodeToDecimal(str: string): string {
    return str.replace(/[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/g, (ch) =>
        String(UNICODE_FRACTIONS[ch])
    );
}

// Parses number - or returns undefined
function parseQty(input: unknown): number | undefined {
    if (typeof input === "number") return input;
    if (typeof input !== "string") return undefined;
    const s = unicodeToDecimal(input).trim();

    const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (mixed) {
        const whole = parseFloat(mixed[1]);
        const num = parseFloat(mixed[2]);
        const den = parseFloat(mixed[3]);
        return whole + (den ? num / den : 0);
    }

    const frac = s.match(/^(\d+)\/(\d+)$/);
    if (frac) {
        const num = parseFloat(frac[1]);
        const den = parseFloat(frac[2]);
        return den ? num / den : undefined;
    }

    const n = Number(s);
    return Number.isFinite(n) ? n : undefined;
}

function sanitizeRecipeJSON(draft: any) {
    const deep = (val: any): any => {
        if (Array.isArray(val)) return val.map(deep).filter((v) => v !== undefined);
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
            return t.length ? t : undefined; // drop empty strings
        }
        return val;
    };

    const out = deep(draft);

    // Ingredient-specific normalization
    if (out?.ingredients && Array.isArray(out.ingredients)) {
        out.ingredients = out.ingredients
            .map((ing: any) => {
                if (!ing || typeof ing !== "object") return ing;
                const normalized: any = { ...ing };

                // qty: convert strings/fractions -> number - remove if invalid
                if (normalized.qty !== undefined) {
                    const q = parseQty(normalized.qty);
                    if (q === undefined || Number.isNaN(q)) delete normalized.qty;
                    else normalized.qty = q;
                }

                if (!normalized.item) return undefined;
                return normalized;
            })
            .filter(Boolean);
    }

    // Steps ordered
    if (out?.steps && Array.isArray(out.steps)) {
        out.steps = out.steps
            .map((s: any, i: number) => {
                if (!s || typeof s !== "object") return undefined;
                const ns: any = { ...s };
                if (typeof ns.order !== "number") ns.order = i + 1;
                return ns.text ? ns : undefined;
            })
            .filter(Boolean);
    }

    return out;
}

/* ---------------- main function ---------------- */

export async function parseRecipe(ocrText: string) {
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
- Prefer SI units (g, ml) or common cooking units (tsp, tbsp, cup) (PL = tbsp).
- Keep section context in 'notes' (e.g., "for the sauce").
- Tags should be single words, lowercase based on recipe content.
- First tag is the main category of the recipe. (one of: breakfast, lunch, dinner, dessert, snack, beverage, salad, soup, baking)
- Fix grammar/typos in recipe text.
- Never invent data: if unknown, omit the key.
- Try to preserve recipe language do not translate
`.trim();

    const prompt = `${systemRules}\n\nOCR_TEXT:\n${ocrText}\n\nRespond with JSON only.`;

    let content: string;
    try {
        content = await callLlmRaw(prompt);
    } catch (e) {
        console.error("Error calling LLM:", e);
        Alert.alert(
            "Error",
            "Failed to process recipe. Please check Settings and try again.\n" +
        String(e)
        );
        return null;
    }

    const cleaned1 = content
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/i, "")
        .trim();

    const match = cleaned1.match(/\{[\s\S]*\}/);
    if (!match) {
        throw new Error(
            `Model did not return JSON. Got: ${cleaned1.slice(0, 200)}…`
        );
    }

    let draft: unknown;
    try {
        draft = JSON.parse(match[0]);
    } catch (e) {
        throw new Error(`Failed to parse JSON from model: ${String(e)}`);
    }

    const cleaned = sanitizeRecipeJSON(draft);
    const validated = Recipe.partial().parse(cleaned);
    if (!validated.ingredients) validated.ingredients = [];
    if (!validated.steps) validated.steps = [];

    return validated;
}
