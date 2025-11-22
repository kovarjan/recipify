import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

export type LlmProvider = "openrouter" | "openai";

export type LlmSettings = {
  provider: LlmProvider;
  apiKey: string | null;
  model: string | null;
  baseUrl?: string | null; // optional override
};

const K_PROVIDER = "llm_provider";
const K_MODEL = "llm_model";
const K_BASEURL = "llm_baseurl";
const APIKEY = "llm_apikey"; // secure

export async function getLlmSettings(): Promise<LlmSettings> {
    const provider = ((await AsyncStorage.getItem(K_PROVIDER)) as LlmProvider) || "openrouter";
    const model =
    (await AsyncStorage.getItem(K_MODEL)) ||
    process.env.EXPO_PUBLIC_OPENROUTER_MODEL ||
    "meta-llama/llama-3.3-8b-instruct:free";
    const baseUrl =
    (await AsyncStorage.getItem(K_BASEURL)) ||
    process.env.EXPO_PUBLIC_OPENROUTER_API_URL ||
    "https://openrouter.ai/api/v1/chat/completions";
    const apiKey =
    (await SecureStore.getItemAsync(APIKEY)) ||
    process.env.EXPO_PUBLIC_OPENROUTER_API_KEY ||
    null;

    return { provider, apiKey, model, baseUrl };
}

export async function saveLlmSettings(next: Partial<LlmSettings>): Promise<void> {
    if (next.provider) await AsyncStorage.setItem(K_PROVIDER, next.provider);
    if (next.model !== undefined && next.model !== null)
        await AsyncStorage.setItem(K_MODEL, next.model);
    if (next.baseUrl !== undefined && next.baseUrl !== null)
        await AsyncStorage.setItem(K_BASEURL, next.baseUrl);
    if (next.apiKey !== undefined) {
        if (next.apiKey === null) {
            await SecureStore.deleteItemAsync(APIKEY);
        } else {
            await SecureStore.setItemAsync(APIKEY, next.apiKey);
        }
    }
}

export async function clearLlmSettings(): Promise<void> {
    await AsyncStorage.multiRemove([K_PROVIDER, K_MODEL, K_BASEURL]);
    await SecureStore.deleteItemAsync(APIKEY);
}
