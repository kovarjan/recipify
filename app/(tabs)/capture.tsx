import Button from "@/components/Button";
import { insertRecipe } from "@/lib/db";
import type { RecipeT } from "@/lib/schema";
import { saveRecipeImageFromUri, setDefaultRecipeImage } from "@/services/images";
import { parseRecipe } from "@/services/llm";
import * as Crypto from 'expo-crypto';
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import { Alert, Image, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView, ScrollView } from "react-native-gesture-handler";
import TextRecognition from 'react-native-text-recognition';

export default function CaptureScreen() {
    const [uri, setUri] = useState<string | null>(null);
    const [lines, setLines] = useState<string[] | null>(null);
    const [recipe, setRecipe] = useState<RecipeT | null>(null);

    const pickAndOcr = async () => {
        // Ask user to choose between camera or gallery
        Alert.alert(
            "Select Image Source",
            "Choose an image from gallery or take a new photo.",
            [
                {
                    text: "Camera",
                    onPress: async () => {
                        const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
                        if (!cameraPerm.granted) {
                            Alert.alert("Permission required", "Camera permission is required.");
                            return;
                        }
                        const res = await ImagePicker.launchCameraAsync({ quality: 1 });
                        if (res.canceled) return;
                        const u = res.assets[0].uri;

                        processImage(u);
                    }
                },
                {
                    text: "Gallery",
                    onPress: async () => {
                        const mediaPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (!mediaPerm.granted) {
                            Alert.alert("Permission required", "Media library permission is required.");
                            return;
                        }
                        const res = await ImagePicker.launchImageLibraryAsync({ quality: 1 });
                        if (res.canceled) return;
                        const u = res.assets[0].uri;

                        processImage(u);
                    }
                },
                { text: "Cancel", style: "cancel" }
            ]
        );
        return;
    };

    const processImage = async (u: string) => {
        setUri(null);
        setLines(null);
        setRecipe(null);

        setUri(u);

        // Continue with OCR
        console.log("Running OCR...", u);

        const out = await TextRecognition.recognize(u); // on-device OCR
        setLines(out);

        console.log("OCR result:", out);

        const text = out.join("\n");
        console.log("Parsing recipe...");

        try {
            const recipe: RecipeT | null = await parseRecipe(text);
            console.log("Parsed recipe:", recipe);
            setRecipe(recipe);
        } catch (e) {
            console.error("Error parsing recipe:", e);
            Alert.alert("Error", "Failed to parse recipe. Please try again.");
        }
    }

    const handleImportRecipe = async() => {
        const now = Date.now();

        if (recipe) {
            const recipeId = Crypto.randomUUID();
            insertRecipe({
                ...recipe,
                id: recipeId,
                createdAt: now,
                updatedAt: now,
                schemaVersion: 1
            });

            console.log("Inserted recipe into DB:", recipe, uri);

            // Save image associated with recipe
            if (uri) {
                const ret = await saveRecipeImageFromUri(recipeId, uri).catch(err => {
                    console.error("Error saving recipe image:", err);
                });

                console.log("Saving recipe image, promise:", ret);
            } else {
                console.warn("No image URI to save for recipe.");
                await setDefaultRecipeImage(recipeId).catch(err => {
                    console.error("Error setting default recipe image:", err);
                });
            }
            Alert.alert("Import Recipe", `Recipe "${recipe.title}" imported successfully!`);
        } else {
            Alert.alert("No Recipe", "No recipe to import. Please capture an image first.");
        }
    };

    return (
        <GestureHandlerRootView style={styles.container}>
        
            <View style={styles.container}>
                <ScrollView>

                    {/* <Pressable onPress={pickAndOcr}><Text>Select photo</Text></Pressable> */}
                    <Button label="Select photo" theme="secondary" onPress={pickAndOcr} style={{ marginBottom: 20 }} />

                    {uri && <Image source={{ uri }} style={{ width: 240, height: 320 }} />}
                    {lines && (
                        <View style={styles.textContainer}>
                            <Text selectable style={styles.text}>
                                <Text style={{ fontWeight: "bold" }}>Recognized text:</Text>
                            </Text>
                            <ScrollView>
                                <Text selectable style={styles.text}>{lines.join("\n")}</Text>
                            </ScrollView>
                        </View>
                    )}

                    {recipe && (
                        <View style={[styles.textContainer, { borderColor: '#ffd33d', borderWidth: 2 }]}>
                            <Text selectable style={styles.text}>
                                <Text style={{ fontWeight: "bold", fontSize: 18 }}>{recipe.title}</Text>
                            </Text>
                            <ScrollView>
                                <Text selectable style={styles.text}>
                                    <Text style={{ fontWeight: "bold" }}>Ingredients:</Text>{"\n"}
                                    {recipe.ingredients.map((ing: any, idx: number) => (
                                        <Text key={idx}>
                                        - {ing.qty} {ing.unit} {ing.item}{"\n"}
                                        </Text>
                                    ))}
                                    {"\n"}
                                    <Text style={{ fontWeight: "bold" }}>Instructions:</Text>{"\n"}
                                    {recipe.steps.map((step: any, idx: number) => (
                                        <Text key={idx}>
                                            {step.order ?? idx + 1}. {step.text}{"\n"}
                                        </Text>
                                    ))}
                                </Text>
                            </ScrollView>
                        </View>
                    )}


                    {recipe && (
                        <View style={styles.textContainer}>
                            <Text selectable style={styles.text}>
                                <Text style={{ fontWeight: "bold" }}>Recipe:</Text>{"\n"}
                                {recipe.title}
                            </Text>

                            <Button label="Import Recipe" theme="primary" onPress={handleImportRecipe} />
                        </View>
                    )}

                </ScrollView>
            </View>
        </GestureHandlerRootView>
    );
}


const styles = StyleSheet.create({
    container: {
        paddingTop: 60,
        paddingBottom: 60,
        flex: 1,
        backgroundColor: '#FAFAFA',
        justifyContent: 'center',
        alignItems: 'center',
        maxHeight: '100%',
    },

    text: {
        color: '#333',
        marginBottom: 10,
    },

    textContainer: {
        marginTop: 20,
        padding: 10,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        maxHeight: 300,
        width: '80%',
    },
});
