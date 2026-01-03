import Button from "@/components/Button";
import { getRecipe } from "@/lib/db";
import { clampScale, fmtDate, formatQtyUnit, round2 } from '@/utils/common';
import { LiquidGlassView } from '@callstack/liquid-glass';
import Entypo from '@expo/vector-icons/Entypo';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { LinearGradient } from "expo-linear-gradient";
import * as Print from 'expo-print';
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    PlatformColor,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

type Step = { order: number; text: string; time_minutes?: number; timeMinutes?: number };
type Ingredient = { qty?: number; unit?: string; item: string; notes?: string };

export default function RecipeDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    const [rec, setRec] = useState<any | null>(null);
    const [scale, setScale] = useState<number>(1); // servings multiplier
    const [unitPref, setUnitPref] = useState<"metric" | "us">("metric"); // simple label
    const [showNotes, setShowNotes] = useState<boolean>(true);
    const [customServings, setCustomServings] = useState<string>("");

    const reload = async () => {
        const r = await getRecipe(String(id));
        setRec({
            ...r.recipe,
            ingredients: r.ingredients,
            steps: r.steps,
            imCooking: false,
        });
    };

    useEffect(() => {
        const tag = "recipe-detail-cooking";

        if (rec?.imCooking) {
            activateKeepAwakeAsync(tag).catch((err) => {
                console.warn("Failed to activate keep awake", err);
            });
        } else {
            deactivateKeepAwake(tag).catch(() => {
                // ignore
            });
        }

        return () => {
            deactivateKeepAwake(tag).catch(() => {});
        };
    }, [rec?.imCooking]);

    useEffect(() => {
        reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // Sync customServings text when recipe loads or scale changes from chips
    useEffect(() => {
        const timeoutRef = { current: null as null | ReturnType<typeof setTimeout> };

        if (rec?.servings) {
            if (customServings === "") {
                const calculatedValue = rec.servings * scale;
                const roundedValue = Math.round(calculatedValue * 100) / 100;
                setCustomServings(String(roundedValue));
            } else {
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }
                timeoutRef.current = setTimeout(() => {
                    const calculatedValue = rec.servings * scale;
                    const roundedValue = Math.round(calculatedValue * 100) / 100;
                    if (Math.abs(parseFloat(customServings) - roundedValue) > 0.01) {
                        setCustomServings(String(roundedValue));
                    }
                }, 800); // 800ms cooldown
            }
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [scale, rec?.servings, customServings]);
        
    const handleCustomServingsChange = (val: string) => {
        setCustomServings(val);
        
        const num = parseFloat(val);
        if (!isNaN(num) && num > 0 && rec?.servings) {
            const newScale = num / rec.servings;
            setScale(clampScale(newScale));
        }
    };

    const primaryTagIcons: Record<string, string> = {
        breakfast: "🥞",
        lunch: "🥪",
        dinner: "🍽️",
        dessert: "🍰",
        snack: "🍪",
        beverage: "🥤",
        salad: "🥗",
        soup: "🍲",
        baking: "🧁",
    }

    const generateTags = (tags: string | string[]) => {
        if (typeof tags === 'string') {
            tags = tags.split(',').map((t) => t.trim());
        }
        console.log("Generating tags for:", tags);

        // Ensure the first tag is a primary tag if possible
        if (Array.isArray(tags) && tags.length > 1) {
            const firstPrimaryIdx = tags.findIndex(tag => primaryTagIcons.hasOwnProperty(tag));
            if (firstPrimaryIdx > 0) {
            // Move the first found primary tag to the front
                const [primaryTag] = tags.splice(firstPrimaryIdx, 1);
                tags.unshift(primaryTag);
            }
        }
        
        if (Array.isArray(tags)) {
            return tags.map((tag, index) => (
                // <Text key={index} style={styles.tag}>
                //     {index === 0 && primaryTagIcons[tag] ? primaryTagIcons[tag] : ""} {tag}
                // </Text>
                <LiquidGlassView key={index} style={[styles.tag]}>
                    <Text style={{ color: PlatformColor('labelColor') }}>
                        {index === 0 && primaryTagIcons[tag] ? primaryTagIcons[tag] : ""} {tag}
                    </Text>
                </LiquidGlassView>
                
            ));
        }

        return null;
    }
    

    // helpers
    let imageUri: string | undefined =
    rec?.image_uri || rec?.imageUri || undefined;

    if (!imageUri) {
        console.warn(`Recipe ${id} is missing an imageUri`);
        imageUri = `https://images.unsplash.com/photo-1638329313670-0ef6cf95a3ab?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1335`;
    }


    const totalTimeText = useMemo(() => {
        const mins: number | undefined = rec?.total_time_minutes ?? rec?.totalTimeMinutes ?? undefined;
        if (!mins || mins <= 0) return undefined;
        if (mins < 60) return `${mins} min`;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return m ? `${h} h ${m} min` : `${h} h`;
    }, [rec]);

    const servingsText = useMemo(() => {
        const s: number | undefined = rec?.servings ?? undefined;
        if (!s) return undefined;
        const scaled = Math.max(0.25, Math.round(s * scale * 100) / 100);
        return `${scaled}`;
    }, [rec, scale]);

    const ingredientsScaled: Ingredient[] = useMemo(() => {
        const arr: Ingredient[] = rec?.ingredients ?? [];
        if (!arr.length) return arr;
        return arr.map((ing) => {
            if (typeof ing.qty !== "number") return ing;
            return { ...ing, qty: round2(ing.qty * scale) };
        });
    }, [rec, scale]);

    const handleEdit = () => {
        router.push(`/recipe/edit/${encodeURIComponent(String(id))}`);
    };

    const handleCopy = () => {
        if (!rec) return;
        const recipeText = [
            `Recipe: ${rec.title}`,
            rec.description ? `\n${rec.description}` : "",
            "\nIngredients:",
            ingredientsScaled.map(item =>
                `- ${formatQtyUnit(item.qty, item.unit, unitPref)} ${item.item}${showNotes && item.notes ? ` — ${item.notes}` : ""}`
            ).join("\n"),
            "\nSteps:",
            Array.isArray(rec.steps)
                ? rec.steps
                    .slice()
                    .sort((a: Step, b: Step) => a.order - b.order)
                    .map((s: Step, idx: number) => {
                        const t = s.timeMinutes ?? s.time_minutes;
                        return `${idx + 1}. ${s.text}${typeof t === "number" && t > 0 ? ` (${t} min)` : ""}`;
                    }).join("\n")
                : "No steps provided.",
        ].filter(Boolean).join("\n\n");

        Clipboard.setStringAsync(recipeText);
        Alert.alert("Copied", "Recipe copied to clipboard.");
    };

    const handlePrint = async () => {
        if (!rec) return;

        const ingredientsHtml = ingredientsScaled.map(item => `
        <li style="margin-bottom: 8px;">
            <strong>${formatQtyUnit(item.qty, item.unit, unitPref)}</strong> ${item.item}
            ${showNotes && item.notes ? `<i style="color: #666;"> — ${item.notes}</i>` : ""}
        </li>
    `).join("");

        const stepsHtml = rec.steps
            .slice()
            .sort((a: Step, b: Step) => a.order - b.order)
            .map((s: Step, index: number) => `
            <div style="margin-bottom: 15px;">
                <div style="font-weight: bold;">Step ${s.order ?? index + 1}</div>
                <div>${s.text}</div>
            </div>
        `).join("");

        const htmlContent = `
        <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                <style>
                    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #111; }
                    h1 { margin-bottom: 5px; }
                    .meta { color: #666; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
                    h2 { border-bottom: 2px solid #111; padding-bottom: 5px; margin-top: 30px; }
                    ul { padding-left: 20px; }
                </style>
            </head>
            <body>
                <h1>${rec.title}</h1>
                <div class="meta">
                    ${rec.description ? `<p>${rec.description}</p>` : ""}
                    <p>
                        <strong>Servings:</strong> ${servingsText} | 
                        <strong>Total Time:</strong> ${totalTimeText ?? "N/A"}
                    </p>
                </div>
                
                <h2>Ingredients</h2>
                <ul>${ingredientsHtml}</ul>
                
                <h2>Instructions</h2>
                <div>${stepsHtml}</div>
            </body>
            <footer>
                <p style="font-size: 12px; color: #999; text-align: center; margin-top: 40px;">
                    Printed from recipify app - ${new Date().toLocaleDateString()}
                </p>
            </footer>
        </html>
    `;

        try {
            await Print.printAsync({
                html: htmlContent,
            });
        } catch (error) {
            Alert.alert("Print Error", "Could not open print dialog.");
        }
    };
            
    const handleDelete = () => {
        Alert.alert(
            "Delete Recipe",
            "Are you sure you want to delete this recipe? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        const { deleteRecipe } = await import("@/lib/db");
                        await deleteRecipe(String(id));
                        router.replace("/(tabs)/recipes");
                    },
                },
            ]
        );
    };

    if (!rec) return null;

    return (
        <GestureHandlerRootView style={styles.container}>
            <View style={styles.container}>
                <View style={styles.headerBar}>
                    <Pressable
                        accessibilityRole="button"
                        onPress={() => router.back()}
                    >
                        <LiquidGlassView style={styles.headerBtnCircle}>
                            <Entypo
                                name="chevron-left"
                                size={24}
                                color={PlatformColor('labelColor')}
                            />
                        </LiquidGlassView>

                    </Pressable>

                    <View style={styles.photoActions}>
                        <Pressable onPress={handleEdit}>
                            <LiquidGlassView style={styles.headerBtn}>
                                <FontAwesome6 name="pencil" size={18} color={PlatformColor('labelColor')} />
                            </LiquidGlassView>
                        </Pressable>
                    </View>
                </View>

                <ScrollView>
                    <View style={styles.header}>
                        {imageUri ? (
                            <Image
                                source={{ uri: imageUri }}
                                style={styles.headerImage}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                                transition={200}
                            />
                        ) : (
                            <View style={[styles.headerImage, styles.headerPlaceholder]}>
                                <Text style={{ color: "#666" }}>No photo yet</Text>
                            </View>
                        )}

                        <View style={styles.overlay} pointerEvents="none">
                            <LinearGradient
                                colors={['rgba(0,0,0,0.9)', 'rgba(0,0,0,0)']}
                                style={{ flex: 1 }}
                                start={{ x: 0.5, y: 0 }}
                                end={{ x: 0.5, y: 1 }}
                            />
                        </View>

                    </View>

                    <View style={[styles.sectionCardWrapper, { padding: 16, paddingBottom: 48 }]}>
                        {/* Title & description */}
                        <Text style={styles.title}>{rec.title}</Text>
                        {!!rec.description && (
                            <Text style={styles.desc}>{rec.description}</Text>
                        )}

                        <View style={styles.tagsRow}>
                            {!!(rec.tags?.length) && (
                                generateTags(rec.tags)
                            )}
                        </View>

                        {/* Meta row */}
                        <View style={styles.metaRow}>
                            {!!rec.servings && (
                                <MetaPill label="Servings" value={String(rec.servings)} />
                            )}
                            {!!totalTimeText && (
                                <MetaPill label="Total time" value={totalTimeText} />
                            )}
                            {!!(rec.categories?.length) && (
                                <MetaPill label="Categories" value={rec.categories.join(", ")} />
                            )}
                            {!!rec.source?.kind && (
                                <MetaPill label="Source" value={rec.source.kind} />
                            )}
                        </View>

                        {/* Config section */}
                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>View Options</Text>
                            <View style={styles.configRow}>
                                <View style={styles.configGroup}>
                                    <Text style={styles.configLabel}>Servings</Text>
                                    <View style={styles.configControls}>
                                        {/* The numeric input for specific portions */}
                                        {rec?.servings && (
                                            <TextInput
                                                keyboardType="numeric"
                                                value={customServings}
                                                onChangeText={handleCustomServingsChange}
                                                style={styles.servingsInput}
                                                selectTextOnFocus={true}
                                                placeholder="Qty"
                                            />
                                        )}

                                        <Chip onPress={() => setScale((s) => clampScale(s / 2))} selected={scale === 0.5}>½×</Chip>
                                        <Chip onPress={() => setScale(1)} selected={scale === 1}>1×</Chip>
                                        <Chip onPress={() => setScale((s) => clampScale(s * 2))} selected={scale === 2}>2×</Chip>
                                    </View>
                                </View>

                                <View style={styles.configGroup}>
                                    <Text style={styles.configLabel}>Units</Text>
                                    <View style={styles.configControls}>
                                        <Chip
                                            onPress={() => setUnitPref("metric")}
                                            selected={unitPref === "metric"}
                                        >
                                            Metric
                                        </Chip>
                                        <Chip
                                            onPress={() => setUnitPref("us")}
                                            selected={unitPref === "us"}
                                        >
                                            US
                                        </Chip>
                                    </View>
                                </View>

                                <View style={styles.configGroup}>
                                    <Text style={styles.configLabel}>Notes</Text>
                                    <View style={styles.configControls}>
                                        <Chip onPress={() => setShowNotes((v) => !v)} selected={showNotes}>
                                            {showNotes ? "Shown" : "Hidden"}
                                        </Chip>
                                    </View>
                                </View>
                                
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                    <Pressable
                                        accessibilityRole="checkbox"
                                        accessibilityState={{ checked: rec.imCooking ?? false }}
                                        onPress={() => {
                                            setRec((prev: any) => ({
                                                ...prev,
                                                imCooking: !prev?.imCooking,
                                            }));
                                        }}
                                        style={{
                                            width: 22,
                                            height: 22,
                                            borderRadius: 6,
                                            borderWidth: 2,
                                            borderColor: "#111",
                                            backgroundColor: rec.imCooking ? "#111" : "#fff",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        {rec.imCooking ? (
                                            <Entypo name="check" size={16} color="#fff" />
                                        ) : null}
                                    </Pressable>
                                    <Text style={{ color: "#111", fontSize: 13 }}>
                                    I'm cooking (do not turn off screen)
                                    </Text>
                                </View>
                            </View>
                            {!!rec.servings && (
                                <Text style={styles.configHint}>
                                    Base servings: {rec.servings} • Displaying: {servingsText}
                                </Text>
                            )}
                        </View>

                        {/* Ingredients section */}
                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>Ingredients</Text>
                            {ingredientsScaled.map((item, idx) => (
                                <View key={`${idx}-${item.item}`} style={styles.ingRow}>
                                    <View style={styles.bullet} />
                                    <Text style={styles.ingText}>
                                        {formatQtyUnit(item.qty, item.unit, unitPref)} {item.item}
                                        {showNotes && item.notes ? (
                                            <Text style={styles.ingNotes}> — {item.notes}</Text>
                                        ) : null}
                                    </Text>
                                </View>
                            ))}
                            <Text style={styles.smallNote}>
                                Units shown: {unitPref === "metric" ? "Metric (g, ml)" : "US (tsp, tbsp, cup)"} — toggle above (no conversion yet).
                            </Text>
                        </View>

                        {/* Steps section */}
                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>Steps</Text>
                            {Array.isArray(rec.steps) && rec.steps.length > 0 ? (
                                rec.steps
                                    .slice()
                                    .sort((a: Step, b: Step) => a.order - b.order)
                                    .map((s: Step, index: number) => {
                                        const t =
                                            (s as any).timeMinutes ??
                                            (s as any).time_minutes ??
                                            undefined;
                                        return (
                                            <View
                                                key={`${s.order}-${s.text.slice(0, 16)}`}
                                                style={styles.stepRow}
                                            >
                                                <View style={styles.stepBadge}>
                                                    <Text style={styles.stepBadgeText}>{s.order || index + 1}</Text>
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.stepText}>{s.text}</Text>
                                                    {typeof t === "number" && t > 0 && (
                                                        <Text style={styles.stepTime}>{t} min</Text>
                                                    )}
                                                </View>
                                            </View>
                                        );
                                    })
                            ) : (
                                <Text style={{ color: "#666" }}>No steps provided.</Text>
                            )}
                        </View>

                        <View style={styles.buttonsContainer}>
                            <Button 
                                label="Copy" 
                                variant="outline" 
                                onPress={handleCopy} 
                                fullWidth={true}
                                iconLeft={<Entypo name="copy" size={20} color="#000" />}
                            />
                            <Button 
                                label="Print" 
                                variant="outline" 
                                onPress={handlePrint} 
                                fullWidth={true}
                                iconLeft={<Entypo name="print" size={20} color="#000" />}
                            />
                            <Button 
                                label="Edit" 
                                variant="primary" 
                                onPress={handleEdit} 
                                fullWidth={true}
                                iconLeft={<Entypo name="edit" size={20} color="#fff" />}
                            />
                            <Button 
                                label="Delete" 
                                variant="destructive" 
                                onPress={handleDelete} 
                                fullWidth={true}
                                iconLeft={<Entypo name="trash" size={20} color="#fff" />}
                            />
                        </View>

                        {/* Timestamps */}
                        <Text style={styles.timestamps}>
                            Created {fmtDate(rec.created_at ?? rec.createdAt)} • Updated{" "}
                            {fmtDate(rec.updated_at ?? rec.updatedAt)}
                        </Text>
                    </View>

                </ScrollView>
                
            </View>
        </GestureHandlerRootView>
    );
}

/* ---------- helpers ---------- */

function MetaPill({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.metaPill}>
            <Text style={styles.metaPillLabel}>{label}</Text>
            <Text style={styles.metaPillValue} numberOfLines={1}>
                {value}
            </Text>
        </View>
    );
}

function Chip({
    children,
    onPress,
    selected,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  selected?: boolean;
}) {
    return (
        <Pressable
            onPress={onPress}
            style={[
                styles.chip2,
                selected ? styles.chip2Selected : undefined,
            ]}
        >
            <Text style={[styles.chip2Text, selected ? styles.chip2TextSel : undefined]}>
                {children}
            </Text>
        </Pressable>
    );
}

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
        borderRadius: 40,
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
    photoActions: {
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 20,
    },
    chip: {
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: "#ffffffcc",
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "#ddd",
    },
    chipText: {
        color: "#111",
    },
    chipPrimary: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: "#111",
        borderRadius: 10,
    },
    chipPrimaryText: {
        color: "#fff",
        fontWeight: "600",
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        marginTop: 12,
    },
    desc: {
        marginTop: 6,
        color: "#444",
    },
    tagsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 12,
        borderBottomColor: "#AAA",
        borderBottomWidth: StyleSheet.hairlineWidth,
        paddingBottom: 12,
    },
    metaRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 12,
    },
    metaPill: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: "#f0f0f0",
        flexDirection: "row",
        gap: 6,
        alignItems: "center",
    },
    metaPillLabel: {
        color: "#666",
        fontSize: 12,
    },
    metaPillValue: {
        color: "#111",
        fontSize: 12,
        fontWeight: "600",
        maxWidth: 200,
    },
    tag: {
        backgroundColor: "#eee",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        marginRight: 4,
        marginTop: 4,
        fontSize: 12,
        color: "#111",
        fontWeight: "600",
        maxWidth: 200,
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
            height: 2,
        },
        elevation: 1,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 8,
    },
    configRow: {
        gap: 12,
    },
    configGroup: {},
    configLabel: {
        color: "#555",
        marginBottom: 6,
        fontWeight: "600",
    },
    configControls: {
        flexDirection: "row",
        gap: 8,
    },
    chip2: {
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: "#f2f2f2",
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "#e0e0e0",
    },
    chip2Selected: {
        backgroundColor: "#111",
        borderColor: "#111",
    },
    chip2Text: {
        color: "#111",
    },
    chip2TextSel: {
        color: "#fff",
        fontWeight: "600",
    },
    configHint: {
        color: "#666",
        marginTop: 8,
        fontSize: 12,
    },
    ingRow: {
        flexDirection: "row",
        gap: 8,
        paddingVertical: 6,
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#111",
        marginTop: 9,
    },
    ingText: {
        flex: 1,
        color: "#111",
    },
    ingNotes: {
        color: "#666",
    },
    smallNote: {
        color: "#777",
        marginTop: 8,
        fontSize: 12,
    },
    stepRow: {
        flexDirection: "row",
        gap: 12,
        paddingVertical: 10,
    },
    stepBadge: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: "#EEE",
        alignItems: "center",
        justifyContent: "center",
        color: "#111",
        borderWidth: 1,
        borderColor: "#EEE",
    },
    stepBadgeText: {
        color: "#111",
        fontWeight: "700",
    },
    stepText: {
        color: "#111",
    },
    stepTime: {
        color: "#666",
        marginTop: 4,
        fontSize: 12,
    },
    timestamps: {
        color: "#777",
        textAlign: "center",
        marginTop: 24,
        fontSize: 12,
    },
    buttonsContainer: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 12,
        flexWrap: "wrap",
        marginTop: 24,
    },
    servingsInput: {
        backgroundColor: "#f2f2f2",
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "#e0e0e0",
        paddingHorizontal: 12,
        height: 40, // Match chip height
        fontSize: 14,
        fontWeight: "700",
        color: "#111",
        minWidth: 50,
        textAlign: "center",
    },
});
