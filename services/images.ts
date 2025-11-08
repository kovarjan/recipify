import * as ImageManipulator from "expo-image-manipulator";

export async function preprocess(uri: string) { 
    // normalize orientation compression
    const result = await ImageManipulator.manipulateAsync(uri, [{ rotate: 0 }], { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG });
   
    return result.uri;
}
