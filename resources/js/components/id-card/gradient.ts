import { clamp, parseColor, rgbaToHex } from '@/components/id-card/color-math';

export type GradientType = 'linear' | 'radial';

export interface GradientStop {
    id: string;
    color: string;
    /** Position along the gradient, 0-100. */
    offset: number;
}

export interface GradientValue {
    type: GradientType;
    /** Degrees, linear only. */
    angle: number;
    stops: GradientStop[];
}

export type ColorValue =
    { mode: 'solid'; color: string } | ({ mode: GradientType } & GradientValue);

let stopSeq = 0;

function makeStopId(): string {
    stopSeq += 1;

    return `stop_${stopSeq}_${Date.now().toString(36)}`;
}

export function defaultGradient(
    type: GradientType,
    baseColor: string,
): GradientValue {
    return {
        type,
        angle: 90,
        stops: [
            { id: makeStopId(), color: baseColor, offset: 0 },
            { id: makeStopId(), color: '#ffffff', offset: 100 },
        ],
    };
}

/** Splits a CSS argument list on top-level commas, ignoring commas nested inside parens (e.g. rgba(...)). */
function splitTopLevel(input: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = '';

    for (const char of input) {
        if (char === '(') {
            depth += 1;
        } else if (char === ')') {
            depth -= 1;
        }

        if (char === ',' && depth === 0) {
            parts.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    if (current.trim()) {
        parts.push(current.trim());
    }

    return parts;
}

function parseStopToken(
    token: string,
    index: number,
    total: number,
): GradientStop | null {
    const match = token.match(/^(.+?)\s+(-?\d+(?:\.\d+)?)%$/);

    if (match) {
        return {
            id: makeStopId(),
            color: match[1].trim(),
            offset: clamp(Number(match[2]), 0, 100),
        };
    }

    // No explicit offset — spread evenly, matching CSS's own default behavior.
    if (token.trim()) {
        return {
            id: makeStopId(),
            color: token.trim(),
            offset: total > 1 ? (index / (total - 1)) * 100 : 0,
        };
    }

    return null;
}

/** Best-effort parse of a `linear-gradient(...)` / `radial-gradient(...)` CSS string. Null if it isn't one. */
export function parseGradient(input: string): GradientValue | null {
    const value = input.trim();
    const match = value.match(/^(linear|radial)-gradient\((.*)\)$/is);

    if (!match) {
        return null;
    }

    const type = match[1] as GradientType;
    const tokens = splitTopLevel(match[2]);

    let angle = 90;
    let stopTokens = tokens;

    if (type === 'linear') {
        const angleMatch = tokens[0]?.match(/^(-?\d+(?:\.\d+)?)deg$/);

        if (angleMatch) {
            angle = Number(angleMatch[1]);
            stopTokens = tokens.slice(1);
        } else if (/^to\s+/i.test(tokens[0] ?? '')) {
            // "to right" etc. — approximate with the closest cardinal angle.
            const dir = tokens[0].toLowerCase();
            angle = dir.includes('right')
                ? 90
                : dir.includes('left')
                  ? 270
                  : dir.includes('top')
                    ? 0
                    : 180;
            stopTokens = tokens.slice(1);
        }
    } else if (/^(circle|ellipse)/i.test(tokens[0] ?? '')) {
        stopTokens = tokens.slice(1);
    }

    const stops = stopTokens
        .map((token, i) => parseStopToken(token, i, stopTokens.length))
        .filter((s): s is GradientStop => s !== null);

    if (stops.length < 2) {
        return null;
    }

    return { type, angle, stops: stops.sort((a, b) => a.offset - b.offset) };
}

/**
 * The color the gradient would show at `offset` — used to seed a sensibly-blended
 * color when the user clicks the bar to insert a new stop, rather than a copy of
 * whichever stop happens to be nearest.
 */
export function colorAtOffset(stops: GradientStop[], offset: number): string {
    const sorted = [...stops].sort((a, b) => a.offset - b.offset);
    const clamped = clamp(offset, 0, 100);

    const next = sorted.find((s) => s.offset >= clamped);
    const prev = [...sorted].reverse().find((s) => s.offset <= clamped);

    if (!prev) {
        return next?.color ?? '#000000';
    }

    if (!next || next.offset === prev.offset) {
        return prev.color;
    }

    const t = (clamped - prev.offset) / (next.offset - prev.offset);
    const rgbaA = parseColor(prev.color) ?? { r: 0, g: 0, b: 0, a: 1 };
    const rgbaB = parseColor(next.color) ?? { r: 0, g: 0, b: 0, a: 1 };

    return rgbaToHex({
        r: rgbaA.r + (rgbaB.r - rgbaA.r) * t,
        g: rgbaA.g + (rgbaB.g - rgbaA.g) * t,
        b: rgbaA.b + (rgbaB.b - rgbaA.b) * t,
        a: rgbaA.a + (rgbaB.a - rgbaA.a) * t,
    });
}

export function serializeGradient(gradient: GradientValue): string {
    const stops = [...gradient.stops]
        .sort((a, b) => a.offset - b.offset)
        .map((s) => `${s.color} ${Math.round(s.offset * 10) / 10}%`)
        .join(', ');

    if (gradient.type === 'radial') {
        return `radial-gradient(circle, ${stops})`;
    }

    return `linear-gradient(${Math.round(gradient.angle)}deg, ${stops})`;
}

/** Parses any style `background` value into a discriminated color/gradient shape for the picker UI. */
export function parseColorValue(
    input: string | undefined | null,
    fallback = '#000000',
): ColorValue {
    if (!input) {
        return { mode: 'solid', color: fallback };
    }

    const gradient = parseGradient(input);

    if (gradient) {
        return { mode: gradient.type, ...gradient };
    }

    return { mode: 'solid', color: input };
}

export function serializeColorValue(value: ColorValue): string {
    if (value.mode === 'solid') {
        return value.color;
    }

    return serializeGradient(value);
}
