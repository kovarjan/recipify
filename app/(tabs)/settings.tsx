import Button from "@/components/Button";
import { clearAllData, insertRecipe } from "@/lib/db";
import { generateInitData } from "@/lib/seedRecipes";
import React from "react";
import { Alert, StyleSheet, Text, View } from 'react-native';

export default function SettingsScreen() {

    const handleGenerateInitData = async () => {
        return await generateInitData(insertRecipe);
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
                    onPress: () => {
                        clearAllData();
                    }
                }
            ]
        );
    }

    return (
        <View style={styles.container}>

            <Button label="Generate Data" variant="outline" onPress={handleGenerateInitData} />
            <Button label="Clear Data" variant="outline" onPress={clearData} />

            <Text style={styles.text}>Settings screen</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        color: '#222',
    },
});
