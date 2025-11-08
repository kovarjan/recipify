export async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
    const base = process.env.EXPO_PUBLIC_API_BASE!;
    const res = await fetch(`${base}${path}`, {
        ...opts,
        headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    });
    if (!res.ok) {
        throw new Error(`API ${res.status}`)
    };
    
    return res.json() as Promise<T>;
}
