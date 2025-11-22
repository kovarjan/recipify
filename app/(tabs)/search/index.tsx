import { useSearch } from "@/contexts/SearchContext";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

export default function SearchScreen() {
    const router = useRouter();
    const { query, setQuery, results, loading, error, clear } = useSearch();

    return (
        <View style={styles.container}>
            {/* Status row */}
            <View style={styles.statusRow}>
                {loading ? <ActivityIndicator /> : null}
                {error ? <Text style={styles.error}>Error: {error}</Text> : null}
                {!loading && !error ? (
                    <Text style={styles.hint}>{query ? `${results.length} results` : "Type to search"}</Text>
                ) : null}
            </View>

            {/* Results */}
            <FlatList
                data={results}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 40 }}
                renderItem={({ item }) => (
                    <Pressable
                        onPress={() => router.push(`/recipe/${encodeURIComponent(item.id)}`)}
                        style={styles.card}
                    >
                        <View style={{ width: 72, height: 72, borderRadius: 10, overflow: "hidden", backgroundColor: "#eee" }}>
                            {item.image_uri || item.imageUri ? (
                                <Image source={{ uri: item.image_uri || item.imageUri }} style={{ width: "100%", height: "100%", resizeMode: "cover" }} />
                            ) : (
                                <Image
                                    source={{ uri: 'https://images.unsplash.com/photo-1638329313670-0ef6cf95a3ab?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1335' }} 
                                    style={{ width: "100%", height: "100%", resizeMode: "cover" }} 
                                />
                            )}
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text numberOfLines={1} style={styles.title}>{item.title}</Text>
                            {item.tags ? (
                                <Text numberOfLines={1} style={styles.tags}>
                                    {String(item.tags)}
                                </Text>
                            ) : null}
                            {item.updated_at ? (
                                <Text style={styles.meta}>{new Date(item.updated_at).toLocaleDateString()}</Text>
                            ) : null}
                        </View>
                    </Pressable>
                )}
                ListEmptyComponent={
                    !loading && query.length > 0 ? (
                        <Text style={{ textAlign: "center", color: "#666", marginTop: 20 }}>No results.</Text>
                    ) : null
                }
            />
        </View>
    );
}

/* ---- styles ---- */
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#FAFAFA", padding: 16, paddingTop: 115 },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "#e6e6e6",
        paddingHorizontal: 12,
        paddingVertical: 8,
        top: 120,
        position: "absolute",
        zIndex: 10,
    },
    input: { flex: 1, color: "#111", paddingVertical: 6 },
    clearBtn: {
        marginLeft: 6,
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f3f4f6",
    },
    statusRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10, marginBottom: 6 },
    error: { color: "#b91c1c" },
    hint: { color: "#777" },

    card: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "#eaeaea",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
        marginBottom: 10,
    },
    title: { fontSize: 16, fontWeight: "700", color: "#111" },
    tags: { color: "#666", marginTop: 2 },
    meta: { color: "#999", marginTop: 2, fontSize: 12 },
});
