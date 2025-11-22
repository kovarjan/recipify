import { SearchProvider } from '@/contexts/SearchContext';
import { initDB } from "@/lib/db";
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

export default function RootLayout() {
    const params = useLocalSearchParams<{ q?: string }>();
    const initialQuery = (params?.q as string) || "";

    useEffect(() => { 
        initDB(); 
    }, []);

    return (
        <SearchProvider initialQuery={initialQuery}>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
            </Stack>
        </SearchProvider>
    );
}