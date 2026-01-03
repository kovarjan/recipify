import Button from "@/components/Button";
import { clearAllData, insertRecipe } from "@/lib/db";
import { generateInitData } from "@/lib/seedRecipes";
import { getLlmSettings, LlmProvider, saveLlmSettings } from "@/services/settings";
import React, { useEffect, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

export default function SettingsScreen() {
    const [loading, setLoading] = useState(true);

    const [provider, setProvider] = useState<LlmProvider>("openrouter");
    const [apiKey, setApiKey] = useState<string>("");
    const [model, setModel] = useState<string>("meta-llama/llama-3.3-8b-instruct:free");
    const [baseUrl, setBaseUrl] = useState<string>("https://openrouter.ai/api/v1/chat/completions");

    const [testing, setTesting] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            const s = await getLlmSettings();
            setProvider(s.provider);
            setApiKey(s.apiKey ?? "");
            setModel(s.model ?? "");
            setBaseUrl(s.baseUrl ?? "");
            setLoading(false);
        })();
    }, []);

    const handleGenerateInitData = async () => {
        await generateInitData(insertRecipe);
        Alert.alert("Done", "20 sample recipes were generated.");
    };

    const clearData = () => {
        Alert.alert(
            "Confirm Clear Data",
            "Are you sure you want to clear all recipe data? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Clear",
                    style: "destructive",
                    onPress: async () => {
                        await clearAllData();
                        Alert.alert("Cleared", "All recipes removed.");
                    },
                },
            ]
        );
    };

    const saveSettings = async () => {
        setSaving(true);
        try {
            if (!model.trim()) {
                Alert.alert("Model required", "Please enter a model id.");
                return;
            }
            if (!apiKey.trim()) {
                Alert.alert("API Key required", "Please paste your API key.");
                return;
            }

            // sensible defaults per provider
            const url =
        baseUrl.trim() ||
        (provider === "openai"
            ? "https://api.openai.com/v1/chat/completions"
            : "https://openrouter.ai/api/v1/chat/completions");

            await saveLlmSettings({
                provider,
                apiKey: apiKey.trim(),
                model: model.trim(),
                baseUrl: url,
            });
            Alert.alert("Saved", "LLM settings updated.");
        } finally {
            setSaving(false);
        }
    };

    const testSettings = async () => {
        setTesting(true);
        try {
            // lightweight probe
            const body =
        provider === "openai"
            ? {
                model: model.trim(),
                messages: [{ role: "user", content: "ping" }],
                // temperature: 0.2,
                // max_tokens: 5, // Do not add max_tokens for OpenAI does not support it
            }
            : {
                model: model.trim(),
                messages: [{ role: "user", content: "ping" }],
                max_tokens: 5,
                temperature: 0,
            };

            const url = baseUrl.trim();
            const headers =
                provider === "openai"
                    ? {
                        Authorization: `Bearer ${apiKey.trim()}`,
                        "Content-Type": "application/json",
                    }
                    : {
                        Authorization: `Bearer ${apiKey.trim()}`,
                        "Content-Type": "application/json",
                        // Optional niceties for OpenRouter ranking:
                        "HTTP-Referer": "http://localhost",
                        "X-Title": "Recipify",
                    };

            const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
            const text = await res.text();
            if (!res.ok) {
                throw new Error(text || res.statusText);
            }
            Alert.alert("Success", "Connection OK.");
        } catch (e: any) {
            Alert.alert("Test failed", String(e?.message ?? e));
        } finally {
            setTesting(false);
        }
    };

    if (loading) return null;

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.select({ ios: "padding", android: undefined })}
        >
            <View style={styles.container}>
                <Text style={styles.title}>Settings</Text>

                {/* LLM Provider */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>AI Provider</Text>

                    <Text style={styles.label}>Provider</Text>
                    <View style={styles.pillRow}>
                        <Pill
                            label="OpenRouter"
                            selected={provider === "openrouter"}
                            onPress={() => setProvider("openrouter")}
                        />
                        <Pill
                            label="OpenAI"
                            selected={provider === "openai"}
                            onPress={() => setProvider("openai")}
                        />
                    </View>

                    <Text style={styles.label}>API Key</Text>
                    <TextInput
                        value={apiKey}
                        onChangeText={setApiKey}
                        secureTextEntry
                        autoCapitalize="none"
                        placeholder="sk-..."
                        placeholderTextColor="#999"
                        style={styles.input}
                    />

                    <Text style={styles.label}>Model</Text>
                    <TextInput
                        value={model}
                        onChangeText={setModel}
                        autoCapitalize="none"
                        placeholder={
                            provider === "openai"
                                ? "gpt-4o-mini"
                                : "meta-llama/llama-3.3-8b-instruct:free"
                        }
                        placeholderTextColor="#999"
                        style={styles.input}
                    />

                    <Text style={styles.label}>Base URL</Text>
                    <TextInput
                        value={baseUrl}
                        onChangeText={setBaseUrl}
                        autoCapitalize="none"
                        placeholder={
                            provider === "openai"
                                ? "https://api.openai.com/v1/chat/completions"
                                : "https://openrouter.ai/api/v1/chat/completions"
                        }
                        placeholderTextColor="#999"
                        style={styles.input}
                    />

                    <View style={styles.row}>
                        <Button label={saving ? "Saving..." : "Save"} variant="primary" onPress={saveSettings} />
                        <Button label={testing ? "Testing..." : "Test"} variant="secondary" onPress={testSettings} />
                    </View>
                </View>

                {/* Data actions */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Data</Text>
                    <View style={styles.row}>
                        <Button label="Generate Data" variant="outline" onPress={handleGenerateInitData} />
                        <Button label="Clear Data" variant="destructive" onPress={clearData} />
                    </View>
                </View>

                <Text style={styles.helper}>
                    Note: If you don’t set anything, the app will fall back to default values.
                </Text>
            </View>
        </KeyboardAvoidingView>
    );
}

function Pill({
    label,
    selected,
    onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            style={[
                {
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: selected ? "#111" : "#f3f4f6",
                },
            ]}
        >
            <Text style={{ color: selected ? "#fff" : "#111", fontWeight: "600" }}>{label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FAFAFA",
        padding: 16,
        gap: 14,
        paddingTop: 60,
    },
    title: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
    card: {
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 14,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "#eaeaea",
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
        gap: 8,
    },
    cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
    label: { color: "#555", marginTop: 4, fontWeight: "600" },
    input: {
        backgroundColor: "#fff",
        borderColor: "#e6e6e6",
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        color: "#111",
    },
    pillRow: { flexDirection: "row", gap: 8, marginTop: 6 },
    row: { flexDirection: "row", gap: 12, marginTop: 10, flexWrap: "wrap" },
    helper: { color: "#777", marginTop: 6, fontSize: 12, textAlign: "center" },
});
