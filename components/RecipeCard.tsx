import { RecipeT } from "@/lib/schema";
import { LiquidGlassView } from '@callstack/liquid-glass';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { PlatformColor, StyleSheet, Text, View } from 'react-native';

interface RecipeCardProps {
    recipe: RecipeT;
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
    console.log("RecipeCard props:", recipe);
    const { title, tags, id } = recipe;
    console.log("Rendering RecipeCard:", { title, tags, id });
    let imageUri = recipe.imageUri || recipe.image_uri;


    if (!imageUri) {
        console.warn(`Recipe ${id} is missing an imageUri`);
        imageUri = `https://images.unsplash.com/photo-1638329313670-0ef6cf95a3ab?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1335`;
    }

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

    const generateTags = () => {
        let tags: string[] | string = recipe.tags;
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
                <LiquidGlassView key={index} style={[styles.tag]}>
                    <Text style={{ color: PlatformColor('labelColor') }}>
                        {index === 0 && primaryTagIcons[tag] ? primaryTagIcons[tag] : ""} {tag}
                    </Text>
                </LiquidGlassView>
            ));
        }

        return null;
    }
    

    return (
        <View style={styles.card}>
            {imageUri && (
                <Image
                    source={{ uri: imageUri }}
                    style={[StyleSheet.absoluteFill, { borderRadius: 8, opacity: 0.9 }]}
                    contentFit="cover"
                />
            )}

            <View style={styles.textBox}>
                <Text style={[styles.text, styles.title]}>{title}</Text>
                <View style={styles.tagsContainer}>
                    {generateTags()}
                </View>
                {/* <Text style={styles.text}>{id}</Text> */}
            </View>

            <View style={styles.overlay} pointerEvents="none">
                <LinearGradient
                    colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.76)']}
                    style={{ flex: 1 }}
                    start={{ x: 0.2, y: 0 }}
                    end={{ x: 0.2, y: 1 }}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        padding: 16,
        marginVertical: 8,
        marginHorizontal: 16,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        minHeight: 200,
        overflow: 'hidden',
    },

    tag: {
        // backgroundColor: '#eee',
        borderRadius: 40,
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginRight: 4,
        marginTop: 4,
        fontSize: 12,
    },

    textBox: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        padding: 14,
        color: '#fff',
        zIndex: 5,
    },

    overlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '100%',
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
        overflow: 'hidden',
        zIndex: 1,
    },

    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 2,
        marginBottom: 4,
    },

    text: {
        color: '#fff',
    },

    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
});