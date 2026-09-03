export interface HSVA {
    h: number; // 0-360
    s: number; // 0-100
    v: number; // 0-100
    a: number; // 0-1
}

export interface RGBA {
    r: number;
    g: number;
    b: number;
    a: number;
}

export function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

export function rgbaToHsva({ r, g, b, a }: RGBA): HSVA {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const delta = max - min;

    let h = 0;

    if (delta !== 0) {
        if (max === rn) {
            h = ((gn - bn) / delta) % 6;
        } else if (max === gn) {
            h = (bn - rn) / delta + 2;
        } else {
            h = (rn - gn) / delta + 4;
        }

        h *= 60;

        if (h < 0) {
            h += 360;
        }
    }

    const v = max;
    const s = max === 0 ? 0 : delta / max;

    return { h, s: s * 100, v: v * 100, a };
}

export function hsvaToRgba({ h, s, v, a }: HSVA): RGBA {
    const sn = s / 100;
    const vn = v / 100;
    const c = vn * sn;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = vn - c;

    let [r, g, b] = [0, 0, 0];

    if (h < 60) {
        [r, g, b] = [c, x, 0];
    } else if (h < 120) {
        [r, g, b] = [x, c, 0];
    } else if (h < 180) {
        [r, g, b] = [0, c, x];
    } else if (h < 240) {
        [r, g, b] = [0, x, c];
    } else if (h < 300) {
        [r, g, b] = [x, 0, c];
    } else {
        [r, g, b] = [c, 0, x];
    }

    return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255),
        a,
    };
}

function hexPair(value: number): string {
    return clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');
}

export function rgbaToHex({ r, g, b, a }: RGBA): string {
    const base = `#${hexPair(r)}${hexPair(g)}${hexPair(b)}`;

    return a < 1 ? `${base}${hexPair(a * 255)}` : base;
}

/** Parses #rgb, #rgba, #rrggbb, #rrggbbaa, rgb(...), and rgba(...). Returns null if unparseable. */
export function parseColor(input: string): RGBA | null {
    const value = input.trim();

    const rgbMatch = value.match(
        /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i,
    );

    if (rgbMatch) {
        return {
            r: clamp(Number(rgbMatch[1]), 0, 255),
            g: clamp(Number(rgbMatch[2]), 0, 255),
            b: clamp(Number(rgbMatch[3]), 0, 255),
            a: rgbMatch[4] !== undefined ? clamp(Number(rgbMatch[4]), 0, 1) : 1,
        };
    }

    let hex = value.startsWith('#') ? value.slice(1) : null;

    if (!hex) {
        return null;
    }

    if (hex.length === 3 || hex.length === 4) {
        hex = hex
            .split('')
            .map((c) => c + c)
            .join('');
    }

    if (hex.length !== 6 && hex.length !== 8) {
        return null;
    }

    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;

    if ([r, g, b].some(Number.isNaN)) {
        return null;
    }

    return { r, g, b, a };
}

export function rgbaToCss({ r, g, b, a }: RGBA): string {
    return a < 1
        ? `rgba(${r}, ${g}, ${b}, ${Math.round(a * 100) / 100})`
        : rgbaToHex({ r, g, b, a: 1 });
}
