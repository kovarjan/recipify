
export function round2(num: number) {
    return Math.round(num * 100) / 100;
}

export function roundN(num: number, decimalPlaces: number) {
    return parseFloat(num.toFixed(decimalPlaces));
}

export function formatQtyUnit(quantity?: number, unit?: string, unitPref: "metric" | "us" = "metric") {
    const qty = typeof quantity === "number" ? quantity : undefined;
    const unitTrimmed = (unit ?? "").trim();
    if (qty == null && !unitTrimmed) return "";
    if (qty == null) return unitTrimmed;
    if (!unitTrimmed) return String(qty);

    // Simple conversion logic for common units
    const conversions: Record<string, { metric: string; us: string; toMetric: (n: number) => number; toUS: (n: number) => number }> = {
        // volume
        "tsp": {
            metric: "ml",
            us: "tsp",
            toMetric: (n) => roundN(n * 4.92892, 1),
            toUS: (n) => n,
        },
        "tbsp": {
            metric: "ml",
            us: "tbsp",
            toMetric: (n) => roundN(n * 14.7868, 0),
            toUS: (n) => n,
        },
        "cup": {
            metric: "ml",
            us: "cup",
            toMetric: (n) => roundN(n * 236.588, 0),
            toUS: (n) => n,
        },
        "ml": {
            metric: "ml",
            us: "tsp",
            toMetric: (n) => n,
            toUS: (n) => roundN(n / 4.92892, 2),
        },
        "l": {
            metric: "l",
            us: "cup",
            toMetric: (n) => n,
            toUS: (n) => roundN(n * 4.22675, 2),
        },
        // weight
        "g": {
            metric: "g",
            us: "oz",
            toMetric: (n) => n,
            toUS: (n) => roundN(n / 28.3495, 2),
        },
        "kg": {
            metric: "kg",
            us: "lb",
            toMetric: (n) => n,
            toUS: (n) => roundN(n * 2.20462, 2),
        },
        "oz": {
            metric: "g",
            us: "oz",
            toMetric: (n) => roundN(n * 28.3495, 0),
            toUS: (n) => n,
        },
        "lb": {
            metric: "kg",
            us: "lb",
            toMetric: (n) => roundN(n / 2.20462, 2),
            toUS: (n) => n,
        },
    };

    const unitKey = unitTrimmed.toLowerCase();
    let unitKeySingular = unitKey.endsWith('s') ? unitKey.slice(0, -1) : unitKey;
    const conv = conversions[unitKeySingular];

    if (conv) {
        if (unitPref === "metric") {
            return `${conv.toMetric(qty)} ${conv.metric}`;
        } else {
            return `${conv.toUS(qty)} ${conv.us}`;
        }
    }
    return `${qty} ${unitTrimmed}`;
}

export function clampScale(n: number) {
    const v = Math.max(0.25, Math.min(4, n));
    return Math.round(v * 100) / 100;
}

export function fmtDate(ts?: number) {
    if (!ts) return "—";
    try {
        const d = new Date(ts);
        return d.toLocaleDateString();
    } catch {
        return "—";
    }
}
