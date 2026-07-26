import type { CSSProperties } from 'react';
import type { CardElement, CardElementStyle, CardTemplate } from '@/types/card-template';

/**
 * Flat bag of resolved values an element's `binding` can point at.
 * Not every subject type populates every field — renderer just shows blank when missing.
 */
export type IdCardData = Record<string, string | undefined | null>;

/** JSON from the API can hand back `[]` (empty PHP array) or null instead of an object. */
export function safeStyle(element: CardElement): CardElementStyle {
    const { style } = element;

    return !style || Array.isArray(style) ? {} : style;
}

export function elementBoxStyle(element: CardElement): CSSProperties {
    return {
        position: 'absolute',
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
        zIndex: element.zIndex ?? 1,
        display: element.hidden ? 'none' : undefined,
    };
}

export function elementContentStyle(element: CardElement): CSSProperties {
    const style = safeStyle(element);

    return {
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        fontFamily: style.fontFamily,
        fontStyle: style.fontStyle,
        letterSpacing: style.letterSpacing ? `${style.letterSpacing}px` : undefined,
        lineHeight: style.lineHeight ?? 1.2,
        textTransform: style.textTransform,
        textAlign: style.textAlign,
        color: style.color,
        background: style.background,
        borderRadius: style.borderRadius,
        borderColor: style.borderColor,
        borderWidth: style.borderWidth,
        borderStyle: style.borderWidth ? 'solid' : undefined,
        objectFit: style.objectFit,
        opacity: style.opacity,
        width: '100%',
        height: '100%',
    };
}

export function resolveElementValue(element: CardElement, data: IdCardData): string {
    if (element.binding) {
        return data[element.binding] ?? '';
    }

    return element.staticText ?? '';
}

/**
 * Just the visual content of an element (no absolute positioning) — reused
 * by both the read-only renderer below and the builder's draggable wrapper.
 */
export function ElementContent({ element, data }: { element: CardElement; data: IdCardData }) {
    const contentStyle = elementContentStyle(element);
    const style = safeStyle(element);

    if (element.kind === 'image' || element.kind === 'qr') {
        const src = element.binding ? (data[element.binding] ?? undefined) : element.staticImageUrl;

        return src ? (
            <img src={src} alt="" draggable={false} style={contentStyle} />
        ) : (
            <div style={{ ...contentStyle, background: style.background ?? '#f1f5f9' }} />
        );
    }

    if (element.kind === 'shape') {
        return <div style={contentStyle} />;
    }

    const justify =
        style.textAlign === 'left' ? 'flex-start'
        : style.textAlign === 'right' ? 'flex-end'
        : 'center';

    const align =
        style.verticalAlign === 'top' ? 'flex-start'
        : style.verticalAlign === 'bottom' ? 'flex-end'
        : 'center';

    return (
        <div
            style={{
                ...contentStyle,
                display: 'flex',
                alignItems: align,
                justifyContent: justify,
                overflow: 'hidden',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
            }}
        >
            {resolveElementValue(element, data)}
        </div>
    );
}

function CardElementView({ element, data }: { element: CardElement; data: IdCardData }) {
    if (element.hidden) {
        return null;
    }

    return (
        <div style={elementBoxStyle(element)}>
            <ElementContent element={element} data={data} />
        </div>
    );
}

interface IdCardRendererProps {
    template: Pick<CardTemplate, 'canvas' | 'elements'>;
    data: IdCardData;
    className?: string;
    /** Uniform scale applied around the top-left corner — used for thumbnails. */
    scale?: number;
}

export function IdCardRenderer({ template, data, className, scale }: IdCardRendererProps) {
    const { canvas } = template;

    const card = (
        <div
            className={scale ? undefined : className}
            style={{
                position: 'relative',
                width: canvas.width,
                height: canvas.height,
                background: canvas.background || '#ffffff',
                overflow: 'hidden',
                transform: scale ? `scale(${scale})` : undefined,
                transformOrigin: 'top left',
            }}
        >
            {template.elements.map((element) => (
                <CardElementView key={element.id} element={element} data={data} />
            ))}
        </div>
    );

    if (!scale) {
        return card;
    }

    // Wrapper reserves the scaled footprint, since `transform` doesn't affect layout.
    return (
        <div className={className} style={{ width: canvas.width * scale, height: canvas.height * scale, overflow: 'hidden' }}>
            {card}
        </div>
    );
}
