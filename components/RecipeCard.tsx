import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function RecipeCard({ title, tags, id }: { title: string; tags: string[]; id: string }) {
    console.log("Rendering RecipeCard:", { title, tags, id });
    return (
        <View style={styles.card}>
            <Text>Recipe Card</Text>
            <Text>{title}</Text>
            <View style={styles.tagsContainer}>
                {tags ? tags.split(',').map(tag => <Text key={tag} style={styles.tag}>{tag}</Text>) : null}
            </View>
            <Text>{id}</Text>
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
    },

    tag: {
        backgroundColor: '#eee',
        borderRadius: 40,
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginRight: 4,
        marginTop: 4,
        fontSize: 12,
    },

    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 8,
    },
});