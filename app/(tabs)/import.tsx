import Button from "@/components/Button";
import { insertRecipe } from "@/lib/db";
import type { RecipeT } from "@/lib/schema";
import { saveRecipeImageFromUri, setDefaultRecipeImage } from "@/services/images";
import { parseRecipe } from "@/services/llm";
import { LiquidGlassView } from "@callstack/liquid-glass";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

import * as Crypto from "expo-crypto";
import * as ImagePicker from "expo-image-picker";
import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    LayoutAnimation,
    PlatformColor,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";


import { GestureHandlerRootView, ScrollView } from "react-native-gesture-handler";
import TextRecognition from "react-native-text-recognition";

type StepState = "idle" | "active" | "done" | "error";

export default function ImportScreen() {
    const [uri, setUri] = useState<string | null>(null);
    const [lines, setLines] = useState<string[] | null>(null);
    const [recipe, setRecipe] = useState<RecipeT | null>(null);
    const [importMode, setImportMode] = useState<"capture" | "text">("capture");

    const [isPicking, setIsPicking] = useState(false);
    const [isOcr, setIsOcr] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    const [showRaw, setShowRaw] = useState(false);

    const step1: StepState = uri ? "done" : isPicking ? "active" : "idle";
    const step2: StepState = lines ? "done" : isOcr ? "active" : uri ? "idle" : "idle";
    const step3: StepState = recipe ? "done" : isParsing ? "active" : lines ? "idle" : "idle";

    const canImport = !!recipe && !isImporting;

    const recognizedText = useMemo(() => (lines ? lines.join("\n") : ""), [lines]);

    const pickFrom = async (source: "camera" | "gallery") => {
        try {
            setIsPicking(true);
            const perm = source === "camera"
                ? await ImagePicker.requestCameraPermissionsAsync()
                : await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!perm.granted) {
                Alert.alert("Permission required", `Access to ${source} is needed to continue.`);
                return;
            }

            const res = source === "camera"
                ? await ImagePicker.launchCameraAsync({ quality: 1 })
                : await ImagePicker.launchImageLibraryAsync({ quality: 1 });

            if (res.canceled) return;

            const u = res.assets?.[0]?.uri;
            if (!u) return;

            // Reset state for a clean run
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setUri(u);
            setLines(null);
            setRecipe(null);

            await runOcrAndParse(u);
        } finally {
            setIsPicking(false);
        }
    };

    const runOcrAndParse = async (u: string, runOcr: boolean = true) => {
        try {
            // OCR
            setIsOcr(true);
            const out = runOcr ? await TextRecognition.recognize(u) : lines || [];
            setLines(out);
            setIsOcr(false);

            // Parse via LLM
            setIsParsing(true);
            const text = out.join("\n");
            const parsed = await parseRecipe(text);
            setRecipe(parsed as RecipeT);
        } catch (e: any) {
            console.error("Capture flow error:", e);
            setRecipe(null);
            Alert.alert("Processing failed", String(e?.message ?? e) || "Please try another photo.");
        } finally {
            setIsParsing(false);
        }
    };

    const onSelect = () => {
        Alert.alert("Select Image Source", "Choose an image from gallery or take a new photo.", [
            { text: "Camera", onPress: () => pickFrom("camera") },
            { text: "Gallery", onPress: () => pickFrom("gallery") },
            { text: "Cancel", style: "cancel" },
        ]);
    };

    const clearAll = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setUri(null);
        setLines(null);
        setRecipe(null);
        setShowRaw(false);
    };

    const handleImportRecipe = async () => {
        if (!recipe) return;
        setIsImporting(true);
        try {
            const now = Date.now();
            const recipeId = Crypto.randomUUID();

            await insertRecipe({
                ...recipe,
                id: recipeId,
                createdAt: now,
                updatedAt: now,
                schemaVersion: 1,
            });

            if (uri) {
                await saveRecipeImageFromUri(recipeId, uri).catch((err) =>
                    console.error("Error saving recipe image:", err)
                );
            } else {
                await setDefaultRecipeImage(recipeId).catch((err) =>
                    console.error("Error setting default image:", err)
                );
            }
            Alert.alert("Imported", `“${recipe.title}” was saved to your recipes.`);
        } catch (e: any) {
            Alert.alert("Import failed", String(e?.message ?? e));
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={styles.root}>

                <Pressable onPress={() => {setImportMode(importMode === "capture" ? "text" : "capture")}}>
                    <LiquidGlassView style={styles.headerBtn}>
                        {importMode === "capture" ?
                            <FontAwesome6 name="file-text" size={18} color={PlatformColor('labelColor')} />
                            :
                            <FontAwesome6 name="camera" size={18} color={PlatformColor('labelColor')} />
                        }
                    </LiquidGlassView>
                </Pressable>

                {/* Stepper */}
                <View style={styles.stepper}>
                    {importMode === "text" ? (<>
                        <StepDot index={1} label="Parse" state={step3} />
                    </>) : (<>
                        <StepDot index={1} label="Select" state={step1} />
                        <Connector />
                        <StepDot index={2} label="OCR" state={step2} />
                        <Connector />
                        <StepDot index={3} label="Parse" state={step3} />
                    </>)}
                </View>

                <ScrollView
                    style={{ flex: 1, alignSelf: "stretch"}}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
                    showsVerticalScrollIndicator={false}
                >
                    {importMode === "capture" ? (<>
                        {/* Actions */}
                        <View style={styles.actionsRow}>
                            <Button label="Select photo" variant="primary" onPress={onSelect} />
                            <Button label="Clear" variant="ghost" onPress={clearAll} />
                        </View>

                        {/* Image card */}
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Image</Text>
                            {!uri ? (
                                <View style={[styles.imageBox, styles.imageEmpty]}>
                                    {isPicking ? (
                                        <ActivityIndicator />
                                    ) : (
                                        <Text style={{ color: "#666" }}>No image selected</Text>
                                    )}
                                </View>
                            ) : (
                                <View style={styles.imageBox}>
                                    <Image
                                        source={{ uri }}
                                        style={{ width: "100%", height: 280, borderRadius: 12 }}
                                        resizeMode="cover"
                                    />
                                    {(isOcr || isParsing) && (
                                        <View style={styles.overlay}>
                                            <ActivityIndicator />
                                            <Text style={{ color: "#fff", marginTop: 8 }}>
                                                {isOcr ? "Running OCR..." : "Parsing recipe..."}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}

                            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                                <Button label="Camera" variant="secondary" onPress={() => pickFrom("camera")} />
                                <Button label="Gallery" variant="outline" onPress={() => pickFrom("gallery")} />
                            </View>
                        </View>

                        {/* Recognized text (collapsible) */}
                        <View style={styles.card}>
                            <View style={styles.cardHead}>
                                <Text style={styles.cardTitle}>Recognized text</Text>
                                <Pressable onPress={() => setShowRaw((v) => !v)} style={styles.toggle}>
                                    <Text style={styles.toggleText}>{showRaw ? "Hide" : "Show"}</Text>
                                </Pressable>
                            </View>
                            {showRaw ? (
                                lines ? (
                                    <View style={styles.rawBox}>
                                        <Text selectable style={styles.rawText}>
                                            {recognizedText}
                                        </Text>
                                    </View>
                                ) : (
                                    <Text style={styles.muted}>
                                        {isOcr ? "Working…" : "Nothing yet. Select an image to start OCR."}
                                    </Text>
                                )
                            ) : (
                                <Text style={styles.muted}>Hidden</Text>
                            )}
                        </View>

                    </>) : (<>
                        {/* Actions */}
                        <View style={styles.actionsRow}>
                            {/* <Button label="Paste text" variant="primary" onPress={async () => {
                                const clipboard = await navigator.clipboard.readText();
                                if (!clipboard) {
                                    Alert.alert("Clipboard empty", "Please copy some recipe text to clipboard first.");
                                    return;
                                }
                                // Reset state for a clean run
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                setLines(clipboard.split('\n'));
                                setRecipe(null);
                                await runOcrAndParse("");
                            }} /> */}
                            <Button label="Clear" variant="ghost" onPress={clearAll} />
                        </View>

                        {/* Text input field */}
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Recipe Text</Text>
                            <View>
                                <TextInput
                                    style={{
                                        minHeight: 120,
                                        maxHeight: 240,
                                        borderWidth: 1,
                                        borderColor: "#e5e7eb",
                                        borderRadius: 8,
                                        padding: 10,
                                        backgroundColor: "#fafafa",
                                        color: "#222",
                                        fontSize: 15,
                                        textAlignVertical: "top",
                                    }}
                                    multiline
                                    placeholder="Paste or type recipe text here…"
                                    value={lines ? lines.join("\n") : ""}
                                    onChangeText={async (text) => {
                                        setLines(text.split('\n'));
                                        setRecipe(null);
                                    }}
                                    editable={!isParsing}
                                    autoCorrect={false}
                                    autoCapitalize="none"
                                />

                                <Button
                                    label={isParsing ? "Parsing…" : "Parse Recipe"}
                                    variant="primary"
                                    style={{ marginTop: 10 }}
                                    onPress={async () => {
                                        if (!lines || lines.length === 0) {
                                            Alert.alert("No text", "Please enter some recipe text first.");
                                            return;
                                        }
                                        await runOcrAndParse("", false);
                                    }}
                                    disabled={isParsing || !lines || lines.length === 0}
                                />
                            </View>
                        </View>
                    </>)}

                    {/* Recipe preview & import */}
                    <View style={{ marginTop: 16, marginBottom: 40 }}>

                        {/* Parsed preview */}
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Preview</Text>
                            {!recipe ? (
                                <Text style={styles.muted}>
                                    {isParsing ? "Parsing with AI…" : "No recipe yet."}
                                </Text>
                            ) : (
                                <View style={{ gap: 10 }}>
                                    <Text style={styles.recipeTitle}>{recipe.title}</Text>
                                    <Text style={styles.recipeMeta}>
                                        {[
                                            recipe.servings ? `${recipe.servings} servings` : null,
                                            recipe.totalTimeMinutes ? `${recipe.totalTimeMinutes} min` : null,
                                        ]
                                            .filter(Boolean)
                                            .join(" • ")}
                                    </Text>

                                    {!!recipe.ingredients?.length && (
                                        <View style={{ gap: 6 }}>
                                            <Text style={styles.sectionTitle}>Ingredients</Text>
                                            {recipe.ingredients.map((ing, i) => (
                                                <Text key={`${i}-${ing.item}`} style={styles.li}>
                                                    •{" "}
                                                    {[ing.qty, ing.unit, ing.item].filter(Boolean).join(" ")}
                                                    {ing.notes ? ` — ${ing.notes}` : ""}
                                                </Text>
                                            ))}
                                        </View>
                                    )}

                                    {!!recipe.steps?.length && (
                                        <View style={{ gap: 6, marginTop: 6 }}>
                                            <Text style={styles.sectionTitle}>Steps</Text>
                                            {recipe.steps.map((st, i) => (
                                                <Text key={`${i}-${st.text.slice(0, 12)}`} style={styles.li}>
                                                    {st.order ?? i + 1}. {st.text}
                                                </Text>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>

                        <View style={{ marginTop: 16 }}>
                            <Button
                                label={isImporting ? "Importing…" : "Import Recipe"}
                                variant="primary"
                                onPress={handleImportRecipe}
                                disabled={!canImport}
                            />
                        </View>
                    </View>
                </ScrollView>
            </View>
        </GestureHandlerRootView>
    );
}

/* ---------- UI bits ---------- */

function StepDot({
    index,
    label,
    state,
}: {
  index: number;
  label: string;
  state: StepState;
}) {
    const bg =
    state === "done" ? "#16a34a" : state === "active" ? "#111" : state === "error" ? "#dc2626" : "#d4d4d8";
    const fg = state === "idle" ? "#111" : "#fff";

    return (
        <View style={styles.stepItem}>
            <View style={[styles.dot, { backgroundColor: bg }]}>
                <Text style={{ color: fg, fontWeight: "700", fontSize: 12 }}>{index}</Text>
            </View>
            <Text style={styles.stepLabel}>{label}</Text>
        </View>
    );
}

function Connector() {
    return <View style={styles.connector} />;
}

/* ---------- styles ---------- */

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#FAFAFA",
        paddingTop: 60,
    },

    headerBtn: {
        position: "absolute",
        top: 0,
        right: 20,
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
    },

    stepper: {
        flexDirection: "row",
        alignSelf: "center",
        alignItems: "center",
        gap: 8,
        marginBottom: 10,
    },
    stepItem: { alignItems: "center" },
    dot: {
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: "center",
        justifyContent: "center",
    },
    stepLabel: { marginTop: 6, fontSize: 12, color: "#444" },
    connector: { width: 40, height: 2, backgroundColor: "#e5e7eb", marginHorizontal: 6 },

    actionsRow: {
        flexDirection: "row",
        gap: 12,
        justifyContent: "center",
        marginBottom: 12,
    },

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
        marginBottom: 12,
    },
    cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },

    imageBox: {
        width: "100%",
        height: 280,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "#f3f4f6",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
    },
    imageEmpty: { borderWidth: StyleSheet.hairlineWidth, borderColor: "#e5e7eb" },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.35)",
        alignItems: "center",
        justifyContent: "center",
    },

    toggle: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: "#f3f4f6",
    },
    toggleText: { color: "#111", fontWeight: "600" },

    rawBox: {
        maxHeight: 200,
        borderRadius: 10,
        padding: 10,
        backgroundColor: "#FAFAFA",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "#eee",
    },
    rawText: { color: "#333" },
    muted: { color: "#666" },

    recipeTitle: { fontSize: 18, fontWeight: "700" },
    recipeMeta: { color: "#666" },
    sectionTitle: { fontWeight: "700", marginTop: 8, marginBottom: 2 },
    li: { color: "#111" },
});
