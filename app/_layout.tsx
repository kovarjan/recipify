import { initDB } from "@/lib/db";
import { Stack } from 'expo-router';
import { useEffect } from 'react';

export default function RootLayout() {
    useEffect(() => { 
        initDB(); 
    }, []);

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
        </Stack>
    );
}