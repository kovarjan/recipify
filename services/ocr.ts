import { apiFetch } from "./api";

// server returns { text: string, blocks?: {text:string, bbox:number[]}[] }

export async function runOCR(base64Image: string) {
    return apiFetch<{ text: string; blocks?: any[] }>("/ocr", {
        method: "POST",
        body: JSON.stringify({ imageBase64: base64Image }),
    });
}
