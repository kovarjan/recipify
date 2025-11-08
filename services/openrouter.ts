// services/openrouter.ts
const OR_API = "https://openrouter.ai/api/v1/chat/completions";

// Dev only — don't ship real keys in production clients.
const OR_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY!;
const MODEL =
  process.env.EXPO_PUBLIC_OPENROUTER_MODEL ||
  "meta-llama/llama-3.3-8b-instruct:free";

export async function openRouterChat(prompt: string): Promise<string> {
    if (!OR_KEY) throw new Error("Missing OPENROUTER API key");

    const res = await fetch(OR_API, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${OR_KEY}`,
            "Content-Type": "application/json",
            // optional but recommended:
            "HTTP-Referer": process.env.EXPO_PUBLIC_APP_URL || "http://localhost",
            "X-Title": "Recipify",
        },
        body: JSON.stringify({
            model: MODEL,
            messages: [{ role: "user", content: prompt }],
            // keep minimal; some models 400 on extra fields
        }),
    });

    const bodyText = await res.text(); // read once
    let payload: any;
    try {
        payload = JSON.parse(bodyText);
    } catch {
        throw new Error(`OpenRouter returned non-JSON: ${bodyText.slice(0, 200)}…`);
    }

    if (!res.ok) {
        const msg = payload?.error?.message || payload?.message || bodyText;
        throw new Error(`OpenRouter ${res.status}: ${msg}`);
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
        throw new Error(`No content in OpenRouter response: ${bodyText.slice(0, 200)}…`);
    }
    return content;
}
