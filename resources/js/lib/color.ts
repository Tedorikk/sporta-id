const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function isValidHexColor(value: string | null | undefined): value is string {
    return typeof value === 'string' && HEX_COLOR_PATTERN.test(value);
}

function clampChannel(value: number) {
    return Math.max(0, Math.min(255, value));
}

/**
 * Lighten (`percent` > 0) or darken (`percent` < 0) a hex color by roughly
 * `percent`%. Used to derive hover/gradient shades from a single organizer-
 * picked accent color instead of asking them to pick several.
 */
export function shadeColor(hex: string, percent: number): string {
    const normalized = hex.replace('#', '');
    const num = parseInt(normalized, 16);
    const amount = Math.round(2.55 * percent);

    const r = clampChannel((num >> 16) + amount);
    const g = clampChannel(((num >> 8) & 0xff) + amount);
    const b = clampChannel((num & 0xff) + amount);

    return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * The default red (Tailwind's red-600/red-700) exactly, so pages with no
 * event accent color render pixel-identical to before this was configurable.
 */
export function accentColors(hex: string | null | undefined): { accent: string; accentDark: string } {
    if (isValidHexColor(hex)) {
        return { accent: hex, accentDark: shadeColor(hex, -12) };
    }

    return { accent: '#dc2626', accentDark: '#b91c1c' };
}
