import RecipeCard from "@/components/RecipeCard";
import { listRecipes } from "@/lib/db";
import { RecipeT } from "@/lib/schema";
import { LiquidGlassView } from '@callstack/liquid-glass';
import { useNavigation } from '@react-navigation/native';
import { Link } from "expo-router";
import React, { useEffect, useState } from "react";
import { FlatList, PlatformColor, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RecipesScreen() {
    const navigation = useNavigation();
    const [items, setItems] = useState<RecipeT[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    useEffect(() => {
        console.log("LOAD Loading recipes from DB...");
        listRecipes().then(setItems);
        const unsubscribe = navigation.addListener('focus', () => {
            console.log("LOAD Screen focused, reloading recipes...");
            listRecipes().then(setItems);
        });
        return unsubscribe;
    }, [navigation]);

    const handleFilter = (data: RecipeT[], selectedCategory: string) => {
        console.log("FILTER Filtering recipes by category:", selectedCategory, data);
        setItems(
            data.filter(item => {
                if (Array.isArray(item.tags)) {
                    return item.tags.some(tag => tag.toLowerCase() === selectedCategory.toLowerCase());
                } else if (typeof item.tags === 'string') {
                    return item.tags.toLowerCase().includes(selectedCategory.toLowerCase());
                }
                return false;
            })
        );
    }


    return (
        <GestureHandlerRootView style={styles.container}>
            <View style={styles.container}>
                <ScrollView>

                    <View style={styles.tagContainer}>
                        {['All', 'Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snack', 'Baking'].map((category) => (
                            <Pressable
                                key={category}
                                onPress={() => {
                                    setSelectedCategory(category);
                                    if (category === 'All') {
                                        listRecipes().then(setItems);
                                    } else {
                                        listRecipes().then(data => handleFilter(data, category));
                                    }
                                }}
                            >
                                <LiquidGlassView style={styles.tagBtn} tintColor={selectedCategory === category ? 'rgba(0, 122, 255, 0.4)' : ''} interactive={true}>
                                    <Text style={{color: PlatformColor('labelColor')}}>{category}</Text>
                                </LiquidGlassView>
                            </Pressable>
                        ))}
                    </View>

                    <FlatList
                        data={items}
                        keyExtractor={i => i.id}
                        style={styles.list}
                        renderItem={({item}) =>
                            <Link href={`/recipe/${encodeURIComponent(String(item.id))}`} asChild>
                                <Pressable>
                                    <RecipeCard recipe={item} />
                                </Pressable>
                            </Link>
                        }
                        contentContainerStyle={{ paddingBottom: 100, paddingTop: 60 }}
                    />

                </ScrollView>
            </View>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingTop: 0,
        paddingBottom: 0,
        flex: 1,
        backgroundColor: '#FAFAFA',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        borderBlockColor: '#000',
        borderStyle: 'solid',
        borderWidth: 1,
    },
    text: {
        color: '#000',
    },
    list: {
        width: '100%',
    },
    tagContainer: {
        position: 'relative',
        top: 60,
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 16,
        zIndex: 40,
        marginBottom: 16, 
        flexWrap: 'wrap', 
    },
    tagBtn: {
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 16,
    },
});
