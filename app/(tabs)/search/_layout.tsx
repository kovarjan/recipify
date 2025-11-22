import { useSearch } from '@/contexts/SearchContext';
import { Stack } from 'expo-router';
import React from "react";

export default function SearchLayout() {
    const { setQuery, loading, clear } = useSearch();

    return (
        <Stack>
            <Stack.Screen
                name="index"
                options={{
                    title: 'Search',
                    headerSearchBarOptions: {
                        placement: 'automatic',
                        placeholder: 'Search',
                        onChangeText: (e) => {
                            console.log('Search query:', e.nativeEvent.text);
                            setQuery(e.nativeEvent.text);
                        },
                        autoCapitalize: 'none',
                        // onCancelButtonPress: () => {
                        //     clear();
                        // }
                    },
                }}
            />
        </Stack>
    );
}
