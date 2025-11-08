import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { updateRecipeImage } from "../lib/db";


// services/images.ts
import * as Crypto from "expo-crypto";

const DIR = FileSystem.documentDirectory + "recipes/";

async function ensureDir() {
    await FileSystem.makeDirectoryAsync(DIR, { intermediates: true }).catch(() => {});
}
const destPath = (id: string) => `${DIR}${id}.jpg`;

// Saves and resizes the image from the given URI, returns the new local URI.
export async function saveRecipeImageFromUri(recipeId: string, srcUri: string) {
    await ensureDir();

    const manipulated = await ImageManipulator.manipulateAsync(
        srcUri,
        [{ resize: { width: 1200 } }],
        { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );

    if (!manipulated.base64) {
        throw new Error("Image pipeline failed: no base64 output");
    }

    await deleteExistingRecipeImages(recipeId);

    const uuidName = await genImageName();
    const filename = `${recipeId}-${uuidName}`;
    const dst = `${DIR}${filename}`;
    await FileSystem.writeAsStringAsync(dst, manipulated.base64, {
        encoding: FileSystem.EncodingType.Base64,
    });
    await updateRecipeImage(recipeId, dst);

    return dst;
}


export async function saveRecipeImageFromUrl(recipeId: string, url: string) {
    await ensureDir();

    const tmp = `${DIR}${recipeId}.tmp`;
    try { await FileSystem.deleteAsync(tmp, { idempotent: true }); } catch {}

    const dl = await FileSystem.downloadAsync(url, tmp);
    if (dl.status !== 200) throw new Error(`Download failed: ${dl.status}`);

    const path = await saveRecipeImageFromUri(recipeId, dl.uri);
    try { await FileSystem.deleteAsync(tmp, { idempotent: true }); } catch {}
    return path;
}

export async function setDefaultRecipeImage(recipeId: string) {
    const placeholder = `https://picsum.photos/seed/${encodeURIComponent(recipeId)}/1200/800`;
    return saveRecipeImageFromUrl(recipeId, placeholder);
}

export async function pickAndSaveRecipeImage(recipeId: string) {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) throw new Error("Media library permission denied");

    const mediaPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!mediaPerm.granted) {
        // You may want to use Alert.alert here if you have access to it in your environment
        throw new Error("Media library permission is required.");
    }
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 1 });
    if (res.canceled) return null;
    const srcUri = res.assets[0].uri;

    // Use the existing saveRecipeImageFromUri function
    return await saveRecipeImageFromUri(recipeId, srcUri);
}


export async function preprocess(uri: string) { 
    // normalize orientation compression
    const result = await ImageManipulator.manipulateAsync(uri, [{ rotate: 0 }], { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG });
   
    return result.uri;
}

export async function removeRecipeImage(recipeId: string) {
    const path = destPath(recipeId);
    try {
        await FileSystem.deleteAsync(path, { idempotent: true });
        await updateRecipeImage(recipeId, null);
    } catch (e) {
        console.error("Error deleting recipe image:", e);
    }
}

export async function getRecipeImageUri(recipeId: string) {
    const path = destPath(recipeId);
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
        return path;
    }
    return null;
}


function uuidV4FromBytes(bytes: Uint8Array) {
    // RFC 4122 v4 formatting
    const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        "4" + hex.slice(13, 16), // set version 4
        ((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, "0") + hex.slice(18, 20), // set variant
        hex.slice(20, 32),
    ].join("-");
}

async function genImageName() {
    const rnd = await Crypto.getRandomBytesAsync(16);
    const uuid = uuidV4FromBytes(rnd);
    return `${uuid}.jpg`;
}

/** Delete any previous images for this recipe (we keep storage tidy). */
async function deleteExistingRecipeImages(recipeId: string) {
    try {
        const entries = await FileSystem.readDirectoryAsync(DIR);
        const prefix = `${recipeId}-`;
        const mine = entries.filter((n) => n.startsWith(prefix) || n.endsWith(`-${recipeId}.jpg`));
        await Promise.all(mine.map((name) => FileSystem.deleteAsync(DIR + name, { idempotent: true })));
    } catch { /* ignore */ }
}
