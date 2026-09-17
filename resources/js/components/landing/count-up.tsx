import { useEffect, useRef, useState } from 'react';

interface CountUpProps {
    value: number;
    suffix?: string;
    durationMs?: number;
    className?: string;
}

export function parseStatValue(value: string) {
    const digits = value.match(/\d+/)?.[0] ?? '0';

    return { number: Number(digits), suffix: value.slice(digits.length) };
}

function prefersReducedMotion() {
    return (
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
}

export function CountUp({ value, suffix = '', durationMs = 1200, className }: CountUpProps) {
    const [display, setDisplay] = useState(() => (prefersReducedMotion() ? value : 0));
    const started = useRef(prefersReducedMotion());

    useEffect(() => {
        if (started.current) {
            return;
        }

        started.current = true;

        const start = performance.now();
        let frame: number;

        const tick = (now: number) => {
            const progress = Math.min((now - start) / durationMs, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(value * eased));

            if (progress < 1) {
                frame = requestAnimationFrame(tick);
            }
        };
        frame = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(frame);
    }, [value, durationMs]);

    return (
        <span className={className}>
            {display}
            {suffix}
        </span>
    );
}
