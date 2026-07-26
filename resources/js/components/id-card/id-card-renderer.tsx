import type { CSSProperties } from 'react';
import type { CardElement, CardTemplate } from '@/types/card-template';

/**
 * Flat bag of resolved values an element's `binding` can point at.
 * Not every subject type populates every field — renderer just shows blank when missing.
 */
export type IdCardData = Record<string, string | undefined | null>;

export function elementBoxStyle(element: CardElement): CSSProperties {
    return {
        position: 'absolute',
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
        zIndex: element.zIndex ?? 1,
    };
}

export function elementContentStyle(element: CardElement): CSSProperties {
    const { style } = element;

    return {
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
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

    if (element.kind === 'image' || element.kind === 'qr') {
        const src = element.binding ? (data[element.binding] ?? undefined) : element.staticImageUrl;

        return src ? (
            <img src={src} alt="" style={contentStyle} />
        ) : (
            <div style={{ ...contentStyle, background: contentStyle.background ?? '#f1f5f9' }} />
        );
    }

    if (element.kind === 'shape') {
        return <div style={contentStyle} />;
    }

    return (
        <div
            style={{
                ...contentStyle,
                display: 'flex',
                alignItems: 'center',
                justifyContent: contentStyle.textAlign === 'left' ? 'flex-start' : contentStyle.textAlign === 'right' ? 'flex-end' : 'center',
            }}
        >
            {resolveElementValue(element, data)}
        </div>
    );
}

function CardElementView({ element, data }: { element: CardElement; data: IdCardData }) {
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
}

export function IdCardRenderer({ template, data, className }: IdCardRendererProps) {
    return (
        <div
            className={className}
            style={{
                position: 'relative',
                width: template.canvas.width,
                height: template.canvas.height,
                background: template.canvas.background || '#ffffff',
                overflow: 'hidden',
            }}
        >
            {template.elements.map((element) => (
                <CardElementView key={element.id} element={element} data={data} />
            ))}
        </div>
    );
}
