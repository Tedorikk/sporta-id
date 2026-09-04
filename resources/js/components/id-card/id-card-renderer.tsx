import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type {
    CardElement,
    CardElementStyle,
    CardTemplate,
} from '@/types/card-template';

/**
 * Flat bag of resolved values an element's `binding` can point at.
 * Not every subject type populates every field — renderer just shows blank when missing.
 */
export type IdCardData = Record<string, string | undefined | null>;

/**
 * Flattens a registration's custom `form_data` answers into `IdCardData`
 * entries under `form_data.<key>`, so a card element can bind to them the
 * same way it binds to any fixed field — see `bindableFieldsFor`'s use of
 * this same key convention in the builder.
 */
export function formDataBindings(
    formData: Record<string, unknown> | null | undefined,
): IdCardData {
    if (!formData) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(formData).map(([key, value]) => [
            `form_data.${key}`,
            value == null ? undefined : String(value),
        ]),
    );
}

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
        transform: element.rotation
            ? `rotate(${element.rotation}deg)`
            : undefined,
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
        letterSpacing: style.letterSpacing
            ? `${style.letterSpacing}px`
            : undefined,
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

export function resolveElementValue(
    element: CardElement,
    data: IdCardData,
): string {
    if (element.binding) {
        return data[element.binding] ?? '';
    }

    return element.staticText ?? '';
}

/**
 * Just the visual content of an element (no absolute positioning) — reused
 * by both the read-only renderer below and the builder's draggable wrapper.
 */
export function ElementContent({
    element,
    data,
}: {
    element: CardElement;
    data: IdCardData;
}) {
    const contentStyle = elementContentStyle(element);
    const style = safeStyle(element);

    if (element.kind === 'image' || element.kind === 'qr') {
        const src = element.binding
            ? (data[element.binding] ?? undefined)
            : element.staticImageUrl;

        return src ? (
            <img src={src} alt="" draggable={false} style={contentStyle} />
        ) : (
            <div
                style={{
                    ...contentStyle,
                    background: style.background ?? '#f1f5f9',
                }}
            />
        );
    }

    if (element.kind === 'shape') {
        return <div style={contentStyle} />;
    }

    const justify =
        style.textAlign === 'left'
            ? 'flex-start'
            : style.textAlign === 'right'
              ? 'flex-end'
              : 'center';

    const align =
        style.verticalAlign === 'top'
            ? 'flex-start'
            : style.verticalAlign === 'bottom'
              ? 'flex-end'
              : 'center';

    return (
        <FitText
            boxStyle={{
                ...contentStyle,
                display: 'flex',
                alignItems: align,
                justifyContent: justify,
                overflow: 'hidden',
            }}
            fontSize={style.fontSize}
        >
            {resolveElementValue(element, data)}
        </FitText>
    );
}

/** Nothing is legible below this, so a very long value clips rather than vanish. */
const MIN_FONT_SIZE = 6;

/** Enough halvings to land within ~0.1px of the largest size that fits. */
const FIT_STEPS = 8;

/**
 * Text that shrinks to stay inside its element box.
 *
 * A card element is a fixed pixel rectangle, so an unusually long value — a
 * three-word name in a box drawn for one — used to wrap past the bottom edge
 * and print with its last line sliced in half. Now it steps the font size down
 * until the whole value fits, re-wrapping as it goes, which reads far better
 * than a clean single line with its descenders cut off.
 *
 * The search runs against the DOM inside one layout effect rather than across
 * renders, so it settles before paint and can't oscillate.
 */
function FitText({
    boxStyle,
    fontSize,
    children,
}: {
    boxStyle: CSSProperties;
    fontSize: number | undefined;
    children: string;
}) {
    const boxRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLSpanElement>(null);
    const [fittedSize, setFittedSize] = useState(fontSize);

    useLayoutEffect(() => {
        const box = boxRef.current;
        const text = textRef.current;

        if (!box || !text) {
            return;
        }

        const base = fontSize ?? 16;

        // Measured with offset*, not getBoundingClientRect, so a scaled
        // ancestor (a thumbnail, or a card scaled into a print slot) doesn't
        // skew the comparison against the box's untransformed client box.
        const fits = (size: number) => {
            text.style.fontSize = `${size}px`;

            return (
                text.offsetHeight <= box.clientHeight + 0.5 &&
                text.offsetWidth <= box.clientWidth + 0.5
            );
        };

        const solve = () => {
            // Returns the element's own size untouched when it already fits, so
            // an element with no explicit size keeps inheriting one.
            if (fits(base)) {
                return fontSize;
            }

            let tooSmall = MIN_FONT_SIZE;
            let tooBig = base;

            for (let step = 0; step < FIT_STEPS; step++) {
                const middle = (tooSmall + tooBig) / 2;

                if (fits(middle)) {
                    tooSmall = middle;
                } else {
                    tooBig = middle;
                }
            }

            return tooSmall;
        };

        const apply = () => {
            const solved = solve();

            // Hand the size back to React and drop the probe's inline style, so
            // the committed render is the single source of truth.
            text.style.fontSize = '';
            setFittedSize(
                solved === undefined ? undefined : Math.floor(solved * 10) / 10,
            );
        };

        apply();

        // The designer resizes element boxes by dragging, so a fit that was
        // right a moment ago may not be any more.
        const observer = new ResizeObserver(apply);
        observer.observe(box);

        return () => observer.disconnect();
    }, [children, fontSize]);

    return (
        <div ref={boxRef} style={boxStyle}>
            <span
                ref={textRef}
                style={{
                    fontSize: fittedSize,
                    maxWidth: '100%',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                }}
            >
                {children}
            </span>
        </div>
    );
}

function CardElementView({
    element,
    data,
}: {
    element: CardElement;
    data: IdCardData;
}) {
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

export function IdCardRenderer({
    template,
    data,
    className,
    scale,
}: IdCardRendererProps) {
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
                <CardElementView
                    key={element.id}
                    element={element}
                    data={data}
                />
            ))}
        </div>
    );

    if (!scale) {
        return card;
    }

    // Wrapper reserves the scaled footprint, since `transform` doesn't affect layout.
    return (
        <div
            className={className}
            style={{
                width: canvas.width * scale,
                height: canvas.height * scale,
                overflow: 'hidden',
            }}
        >
            {card}
        </div>
    );
}
