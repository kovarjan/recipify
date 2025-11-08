import Button from "@/components/Button";
import { insertRecipe } from "@/lib/db";
import { parseRecipe } from "@/services/llm";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import { Alert, Image, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView, ScrollView } from "react-native-gesture-handler";
import TextRecognition from 'react-native-text-recognition';


export default function CaptureScreen() {
    const [uri, setUri] = useState<string | null>(null);
    const [lines, setLines] = useState<string[] | null>(null);
    const [recipe, setRecipe] = useState<any | null>(null);

    const pickAndOcr = async () => {
        const res = await ImagePicker.launchImageLibraryAsync({ quality: 1 });
        if (res.canceled) return;
        const u = res.assets[0].uri;
        setUri(u);

        console.log("Running OCR...", u);

        const out = await TextRecognition.recognize(u); // on-device OCR
        setLines(out);

        console.log("OCR result:", out);

        const text = out.join("\n");
        console.log("Parsing recipe...");

        try {

            const recipe = await parseRecipe(text);
            
            console.log("Parsed recipe:", recipe);
            console.log(recipe.title, recipe.ingredients.length);

            setRecipe(recipe);

        } catch (e) {
            console.error("Error parsing recipe:", e);

            Alert.alert("Error", "Failed to parse recipe. Please try again.");
        }
    };

    const handleImportRecipe = () => {
        const now = Date.now();

        if (recipe) {
            insertRecipe({
                ...recipe, id: `${now}-${Math.floor(Math.random() * 10000)}`,
                createdAt: now,
                updatedAt: now,
                schemaVersion: 1
            });
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
