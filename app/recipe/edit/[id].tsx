import Button from "@/components/Button";
import { getRecipe } from "@/lib/db";
import { RecipeT } from "@/lib/schema";
import {
    pickAndSaveRecipeImage,
    removeRecipeImage,
    setDefaultRecipeImage,
} from "@/services/images";
import { LiquidGlassView } from "@callstack/liquid-glass";
import Entypo from "@expo/vector-icons/Entypo";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    PlatformColor,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

type Step = { order: number; text: string; timeMinutes?: number; time_minutes?: number };
type Ingredient = { qty?: number; unit?: string; item: string; notes?: string };

export default function RecipeEdit() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [imageUri, setImageUri] = useState<string | undefined>(undefined);

    // form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState<string>("");
    const [servings, setServings] = useState<string>("");
    const [totalTime, setTotalTime] = useState<string>("");
    const [tags, setTags] = useState<string>("");

    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [steps, setSteps] = useState<Step[]>([]);

    const reload = async () => {
        setLoading(true);
        const r = await getRecipe(String(id));
        const rec: RecipeT = r.recipe;
        setTitle(rec.title ?? "");
        setDescription(rec.description ?? "");
        setServings(rec.servings != null ? String(rec.servings) : "");
        const tt = rec.total_time_minutes ?? rec.totalTimeMinutes;
        setTotalTime(tt != null ? String(tt) : "");
        // tags stored as CSV in DB
        setTags(rec.tags ?? "");
        setIngredients(r.ingredients ?? []);
        setSteps((r.steps ?? []).sort((a: Step, b: Step) => a.order - b.order));
        const img = rec.image_uri ?? rec.imageUri;
        setImageUri(img);
        setLoading(false);
    };

    useEffect(() => {
        reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const totalTimeText = useMemo(() => {
        if (!totalTime) return undefined;
        const mins = Number(totalTime);
        if (!isFinite(mins) || mins <= 0) return undefined;
        if (mins < 60) return `${mins} min`;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return m ? `${h} h ${m} min` : `${h} h`;
    }, [totalTime]);

    /* ---------- Photo actions ---------- */
    const onChangePhoto = async () => {
        try {
            await pickAndSaveRecipeImage(String(id));
            await reload();
        } catch (e: any) {
            Alert.alert("Photo error", String(e?.message ?? e));
        }
    };

    const onRemovePhoto = async () => {
        try {
            await removeRecipeImage(String(id));
            await reload();
        } catch (e: any) {
            Alert.alert("Photo error", String(e?.message ?? e));
        }
    };

    const onUseDefault = async () => {
        try {
            await setDefaultRecipeImage(String(id));
            await reload();
        } catch (e: any) {
            Alert.alert("Image error", String(e?.message ?? e));
        }
    };

    /* ---------- Ingredient handlers ---------- */
    const addIngredient = () =>
        setIngredients((prev) => [...prev, { item: "", qty: undefined, unit: "", notes: "" }]);

    const removeIngredient = (idx: number) =>
        setIngredients((prev) => prev.filter((_, i) => i !== idx));

    const moveIng = (idx: number, dir: -1 | 1) =>
        setIngredients((prev) => {
            const arr = [...prev];
            const ni = idx + dir;
            if (ni < 0 || ni >= arr.length) return arr;
            const tmp = arr[idx];
            arr[idx] = arr[ni];
            arr[ni] = tmp;
            return arr;
        });

    const patchIng = (idx: number, patch: Partial<Ingredient>) =>
        setIngredients((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

    /* ---------- Step handlers ---------- */
    const addStep = () =>
        setSteps((prev) => [
            ...prev,
            { order: prev.length + 1, text: "", timeMinutes: undefined },
        ]);

    const removeStep = (idx: number) =>
        setSteps((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })));

    const moveStep = (idx: number, dir: -1 | 1) =>
        setSteps((prev) => {
            const arr = [...prev];
            const ni = idx + dir;
            if (ni < 0 || ni >= arr.length) return arr;
            const tmp = arr[idx];
            arr[idx] = arr[ni];
            arr[ni] = tmp;
            return arr.map((s, i) => ({ ...s, order: i + 1 }));
        });

    const patchStep = (idx: number, patch: Partial<Step>) =>
        setSteps((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

    /* ---------- Save ---------- */
    const onSave = async () => {
        try {
            if (!title.trim()) {
                Alert.alert("Title required", "Please enter a recipe title.");
                return;
            }
            const parsedServings = servings ? Number(servings) : null;
            const parsedTime = totalTime ? Number(totalTime) : null;
            if (servings && (!isFinite(parsedServings!) || parsedServings! < 0)) {
                Alert.alert("Invalid servings", "Servings must be a positive number.");
                return;
            }
            if (totalTime && (!isFinite(parsedTime!) || parsedTime! < 0)) {
                Alert.alert("Invalid total time", "Total time must be a positive number.");
                return;
            }

            // Normalize data for DB
            const payload = {
                id: String(id),
                title: title.trim(),
                description: description.trim() || null,
                servings: parsedServings ?? null,
                total_time_minutes: parsedTime ?? null,
                // tags stored as CSV in DB
                tags: tags
                    ? tags
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean)
                        .join(",")
                    : null,
                updated_at: Date.now(),
            };

            // Save (see DB helpers below)
            const { updateRecipeFields, replaceIngredients, replaceSteps } = await import("@/lib/db");
            await updateRecipeFields(payload);
            await replaceIngredients(String(id), ingredients);
            await replaceSteps(String(id), steps);

            Alert.alert("Saved", "Recipe updated successfully.");
            router.replace(`/recipe/${encodeURIComponent(String(id))}`);
        } catch (e: any) {
            Alert.alert("Save failed", String(e?.message ?? e));
        }
    };

    if (loading) return null;

    const heroUri =
    imageUri ??
    "https://images.unsplash.com/photo-1638329313670-0ef6cf95a3ab?auto=format&fit=crop&q=80&w=1335";

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: "#fafafa" }}
            behavior={Platform.select({ ios: "padding", android: undefined })}
            keyboardVerticalOffset={Platform.select({ ios: 70, android: 0 })}
        >
            <View style={styles.container}>
                {/* Top bar */}
                <View style={styles.headerBar}>
                    <Pressable onPress={() => router.back()}>
                        <LiquidGlassView style={styles.headerBtnCircle}>
                            <Entypo name="chevron-left" size={24} color={PlatformColor('labelColor')} />
                        </LiquidGlassView>
                    </Pressable>

                    <View style={styles.headerBtnGroup}>
                        {/* Photo actions */}
                        <Pressable onPress={onChangePhoto}>
                            <LiquidGlassView style={styles.headerBtn}>
                                <MaterialCommunityIcons name="image-edit-outline" size={22} color={PlatformColor('labelColor')} />
                            </LiquidGlassView>
                        </Pressable>
                        {imageUri ? (
                            <Pressable onPress={onRemovePhoto}>
                                <LiquidGlassView style={styles.headerBtn}>
                                    <MaterialCommunityIcons name="image-remove-outline" size={22} color={PlatformColor('labelColor')} />
                                </LiquidGlassView>
                            </Pressable>
                        ) : (
                            null
                            // <Pressable onPress={onUseDefault}>
                            //     <LiquidGlassView style={styles.headerBtn}>
                            //         <Text style={[{ color: PlatformColor('labelColor') }]}>Use default</Text>
                            //     </LiquidGlassView>
                            // </Pressable>
                        )}

                        <Pressable onPress={onSave}>
                            <LiquidGlassView style={styles.headerBtn}>
                                <Text style={[{ color: PlatformColor('labelColor') }]}>Save</Text>
                            </LiquidGlassView>
                        </Pressable>
                    </View>
                </View>

                <ScrollView>
                    {/* Hero */}
                    <View style={styles.header}>
                        <Image
                            source={{ uri: heroUri }}
                            style={styles.headerImage}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            transition={200}
                        />
                        <View style={styles.overlay} pointerEvents="none">
                            <LinearGradient
                                colors={["rgba(0,0,0,0.9)", "rgba(0,0,0,0)"]}
                                style={{ flex: 1 }}
                                start={{ x: 0.5, y: 0 }}
                                end={{ x: 0.5, y: 1 }}
                            />
                        </View>

                        
                    </View>

                    {/* Form */}
                    <View style={[styles.sectionCardWrapper, { padding: 16, paddingBottom: 48 }]}>
                        <Text style={styles.title}>Edit Recipe</Text>

                        {/* Basics */}
                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>Basics</Text>
                            <LabeledInput label="Title" value={title} onChangeText={setTitle} placeholder="Recipe title" />

                            <LabeledInput
                                label="Description"
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Short description"
                                multiline
                            />

                            <View style={{ flexDirection: "row", gap: 12 }}>
                                <LabeledInput
                                    label="Servings"
                                    value={servings}
                                    onChangeText={setServings}
                                    placeholder="e.g., 4"
                                    keyboardType="numeric"
                                    style={{ flex: 1 }}
                                />
                                <LabeledInput
                                    label="Total time (min)"
                                    value={totalTime}
                                    onChangeText={setTotalTime}
                                    placeholder="e.g., 45"
                                    keyboardType="numeric"
                                    style={{ flex: 1 }}
                                    helperText={totalTimeText ? `≈ ${totalTimeText}` : undefined}
                                />
                            </View>

                            <LabeledInput
                                label="Tags (comma-separated)"
                                value={tags}
                                onChangeText={setTags}
                                placeholder="e.g., dinner, pasta, quick"
                            />
                        </View>

                        {/* Ingredients */}
                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>Ingredients</Text>

                            {ingredients.map((ing, idx) => (
                                <View key={`${idx}-${ing.item}-${ing.unit}`} style={styles.rowCard}>
                                    <View style={{ flexDirection: "row", gap: 8 }}>
                                        <LabeledInput
                                            label="Qty"
                                            value={ing.qty != null ? String(ing.qty) : ""}
                                            onChangeText={(v) =>
                                                patchIng(idx, {
                                                    qty: v ? Number(v) : undefined,
                                                })
                                            }
                                            keyboardType="numeric"
                                            style={{ width: 90 }}
                                        />
                                        <LabeledInput
                                            label="Unit"
                                            value={ing.unit ?? ""}
                                            onChangeText={(v) => patchIng(idx, { unit: v })}
                                            style={{ width: 100 }}
                                        />
                                        <LabeledInput
                                            label="Item"
                                            value={ing.item}
                                            onChangeText={(v) => patchIng(idx, { item: v })}
                                            style={{ flex: 1 }}
                                        />
                                    </View>
                                    <LabeledInput
                                        label="Notes"
                                        value={ing.notes ?? ""}
                                        onChangeText={(v) => patchIng(idx, { notes: v })}
                                        placeholder="Optional"
                                    />

                                    <View style={styles.rowActions}>
                                        <Pressable onPress={() => moveIng(idx, -1)} style={styles.rowBtn}>
                                            <Entypo name="chevron-up" size={18} color="#111" />
                                        </Pressable>
                                        <Pressable onPress={() => moveIng(idx, +1)} style={styles.rowBtn}>
                                            <Entypo name="chevron-down" size={18} color="#111" />
                                        </Pressable>
                                        <Pressable onPress={() => removeIngredient(idx)} style={[styles.rowBtn, { backgroundColor: "#fee2e2" }]}>
                                            <Entypo name="trash" size={18} color="#7f1d1d" />
                                        </Pressable>
                                    </View>
                                </View>
                            ))}

                            <Button label="Add ingredient" variant="secondary" onPress={addIngredient} fullWidth />
                        </View>

                        {/* Steps */}
                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>Steps</Text>

                            {steps.map((s, idx) => (
                                <View key={`${idx}-${s.text.slice(0, 12)}`} style={styles.rowCard}>
                                    <LabeledInput
                                        label="Step"
                                        value={s.text}
                                        onChangeText={(v) => patchStep(idx, { text: v })}
                                        placeholder={`Describe step #${idx + 1}`}
                                        multiline
                                    />
                                    <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
                                        <LabeledInput
                                            label="Time (min)"
                                            value={s.timeMinutes != null ? String(s.timeMinutes) : s.time_minutes != null ? String(s.time_minutes) : ""}
                                            onChangeText={(v) =>
                                                patchStep(idx, {
                                                    timeMinutes: v ? Number(v) : undefined,
                                                    time_minutes: undefined,
                                                })
                                            }
                                            keyboardType="numeric"
                                            style={{ width: 120 }}
                                        />
                                        <View style={{ flex: 1 }} />
                                        <View style={styles.rowActions}>
                                            <Pressable onPress={() => moveStep(idx, -1)} style={styles.rowBtn}>
                                                <Entypo name="chevron-up" size={18} color="#111" />
                                            </Pressable>
                                            <Pressable onPress={() => moveStep(idx, +1)} style={styles.rowBtn}>
                                                <Entypo name="chevron-down" size={18} color="#111" />
                                            </Pressable>
                                            <Pressable onPress={() => removeStep(idx)} style={[styles.rowBtn, { backgroundColor: "#fee2e2" }]}>
                                                <Entypo name="trash" size={18} color="#7f1d1d" />
                                            </Pressable>
                                        </View>
                                    </View>
                                </View>
                            ))}

                            <Button label="Add step" variant="secondary" onPress={addStep} fullWidth />
                        </View>

                        <View style={{ marginTop: 24, gap: 12, flexDirection: "row", justifyContent: "center" }}>
                            <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
                            <Button label="Save changes" variant="primary" onPress={onSave} />
                        </View>
                    </View>
                </ScrollView>
            </View>
        </KeyboardAvoidingView>
    );
}

function LabeledInput({
    label,
    helperText,
    style,
    ...props
}: {
  label: string;
  helperText?: string;
  style?: any;
} & React.ComponentProps<typeof TextInput>) {
    return (
        <View style={[{ marginBottom: 12 }, style]}>
            <Text style={{ color: "#555", marginBottom: 6, fontWeight: "600" }}>{label}</Text>
            <TextInput
                placeholderTextColor="#999"
                style={{
                    backgroundColor: "#fff",
                    borderColor: "#e6e6e6",
                    borderWidth: StyleSheet.hairlineWidth,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 12,
                    color: "#111",
                    minHeight: props.multiline ? 80 : 44,
                }}
                {...props}
            />
            {!!helperText && <Text style={{ color: "#777", marginTop: 6, fontSize: 12 }}>{helperText}</Text>}
        </View>
    );
}

/* ---------- styles (follow your detail page) ---------- */

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fafafa",
        paddingTop: 0,
    },
    header: {
        width: "100%",
        height: 360,
        position: "relative",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 0,
    },
    headerImage: {
        width: "100%",
        height: "100%",
        zIndex: 0,
    },
    headerBtnGroup: {
        flexDirection: "row",
        gap: 8,
        paddingRight: 20
    },
    headerPlaceholder: {
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#eee",
    },
    headerBar: {
        position: "absolute",
        top: 45,
        left: 10,
        right: 0,
        paddingHorizontal: 12,
        paddingTop: 12,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 50,
    },
    headerBtnCircle: {
        borderRadius: 40,
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        top: 0,
        zIndex: 50,
    },
    headerBtn: {
        borderRadius: 60,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        top: 0,
        left: 12,
        zIndex: 50,
        paddingHorizontal: 14,
    },
    backBtnText: {
        color: "#fff",
        fontSize: 16,
    },
    overlay: {
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        height: "80%",
    },
    sectionCardWrapper: {
        position: "relative",
        borderRadius: 16,
        marginTop: -16,
        zIndex: 5,
        backgroundColor: "#FAFAFA",
    },
    sectionCard: {
        marginTop: 16,
        padding: 14,
        borderRadius: 14,
        backgroundColor: "#fff",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "#eaeaea",
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { 
            width: 0, 
            height: 2 
        },
        elevation: 1
    },
    sectionTitle: { 
        fontSize: 16, 
        fontWeight: "700", 
        marginBottom: 8 
    },

    photoActions: {
        position: "absolute",
        right: 16,
        top: 16,
        zIndex: 60,
        flexDirection: "row",
        gap: 8
    },

    rowCard: {
        marginBottom: 12,
        padding: 12,
        borderRadius: 12,
        backgroundColor: "#fafafa",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "#eee"
    },
    rowActions: { 
        flexDirection: "row", 
        gap: 8, 
        marginTop: 8 
    },
    rowBtn: {
        backgroundColor: "#f3f4f6",
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8
    },

    title: { 
        fontSize: 22, 
        fontWeight: "700", 
        marginBottom: 8 
    }
});
