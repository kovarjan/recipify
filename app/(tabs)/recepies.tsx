import Button from "@/components/Button";
import RecipeCard from "@/components/RecipeCard";
import { clearAllData, insertRecipe, listRecipes } from "@/lib/db";
import { generateInitData } from "@/lib/seedRecipes";
import { Link } from "expo-router";
import { Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import React, { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';


export default function RecipesScreen() {
    const [items, setItems] = useState<any[]>([]);
    useEffect(() => { listRecipes().then(setItems); }, []);

    const handleGenerateInitData = async () => {
        const data = await generateInitData(insertRecipe);
        setItems(data);

        return data;
    };

    const clearData = () => {
        clearAllData().then(() => setItems([]));
    }

    return (
        <View style={styles.container}>
            <Button label="Generate Data" theme="secondary" onPress={handleGenerateInitData} />
            <Button label="Clear Data" theme="secondary" onPress={clearData} />
            <Link href="/capture" asChild><Pressable><Text>+ Import recipe</Text></Pressable></Link>
            <FlatList data={items} keyExtractor={i => i.id}
                renderItem={({item}) => <RecipeCard title={item.title} tags={item.tags} id={item.id} />} />

            <NativeTabs>
                <NativeTabs.Trigger name="index">
                    <Label>Home</Label>
                </NativeTabs.Trigger>
                <NativeTabs.Trigger name="search" role="search">
                    <Label>Search</Label>
                </NativeTabs.Trigger>
            </NativeTabs>
        </View>
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
    },
    text: {
        color: '#000',
    },
});
