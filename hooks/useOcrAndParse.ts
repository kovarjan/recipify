import * as ImagePicker from "expo-image-picker";
import { preprocess } from "../services/images";
import { parseRecipe } from "../services/llm";
import { runOCR } from "../services/ocr";

export function useOcrAndParse() {
    const pick = async () => {
        const res = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 1 });
        if (res.canceled) return null;
        const asset = res.assets[0];
        const preUri = await preprocess(asset.uri);
        // ensure base64 (re-read if needed)
        if (!asset.base64) {
            const again = await ImagePicker.getMediaLibraryPermissionsAsync(); // placeholder; in practice, read file as base64
        }
        const ocr = await runOCR(asset.base64!);
        const recipe = await parseRecipe(ocr.text);
        return { recipe, sourceUri: preUri };
    };
    return { pick };
}
