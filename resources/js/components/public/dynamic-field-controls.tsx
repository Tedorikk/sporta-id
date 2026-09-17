import { Check, Star } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useT } from '@/hooks/use-t';
import { cn } from '@/lib/utils';
import type { RegistrationField } from '@/types/registration-category';

/**
 * Multiple choice as tappable cards rather than bare browser radios: a full-row
 * hit area, the form's own accent and corner radius, and — because the native
 * inputs are still there, only visually hidden — arrow-key navigation and
 * screen-reader grouping for free.
 *
 * Shared between the single-participant form (register-dynamic.tsx) and the
 * group order wizard, which both render the same dynamic field types.
 */
export function ChoiceGroup({
    name,
    label,
    options,
    labels,
    value,
    onChange,
    disabled,
    controlStyle,
    invalid,
}: {
    name: string;
    label: string;
    options: string[];
    /** Display text per option value, for a fixed-value/translated-label choice like gender. Falls back to the value itself. */
    labels?: Record<string, string>;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    controlStyle: CSSProperties;
    invalid?: boolean;
}) {
    // Pair options up rather than stacking them, but only while the label still
    // fits on one line. The form card is ~300px of content on a phone and ~380px
    // on a desktop, so sizes and yes/no answers pair up everywhere while slightly
    // longer answers wait for the wider card.
    const longest = Math.max(0, ...options.map((option) => option.length));
    const twoUp = options.length > 1 && longest <= 18;

    return (
        <div
            role="radiogroup"
            aria-label={label}
            className={cn(
                'grid gap-2',
                twoUp && (longest <= 8 ? 'grid-cols-2' : 'sm:grid-cols-2'),
            )}
        >
            {options.map((option) => {
                const checked = value === option;

                return (
                    <label
                        key={option}
                        style={controlStyle}
                        className={cn(
                            'flex cursor-pointer items-center gap-3 rounded-md border-2 px-3 py-2.5 text-sm font-semibold transition-colors',
                            'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--accent)] has-[:focus-visible]:ring-offset-2',
                            checked
                                ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                                : 'border-black hover:bg-ink/5',
                            invalid && !checked && 'border-destructive',
                            disabled && 'cursor-not-allowed opacity-60',
                        )}
                    >
                        <input
                            type="radio"
                            name={name}
                            value={option}
                            checked={checked}
                            onChange={() => onChange(option)}
                            disabled={disabled}
                            className="sr-only"
                        />
                        <span
                            aria-hidden
                            className={cn(
                                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                                checked
                                    ? 'border-[var(--accent)] bg-[var(--accent)]'
                                    : 'border-black',
                            )}
                        >
                            {checked && (
                                <span className="h-1.5 w-1.5 rounded-full bg-ink" />
                            )}
                        </span>
                        <span className="min-w-0 break-words">
                            {labels?.[option] ?? option}
                        </span>
                    </label>
                );
            })}
        </div>
    );
}

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

export function linkifyText(text: string) {
    // split() with a capturing group puts the URL matches at odd indices.
    return text.split(URL_PATTERN).map((part, i) =>
        i % 2 === 1 ? (
            <a
                key={i}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[var(--accent)]"
            >
                {part}
            </a>
        ) : (
            part
        ),
    );
}

export function DescriptionBlock({ field }: { field: RegistrationField }) {
    const body = field.help_text?.trim();

    return (
        <div
            role="note"
            className="rounded-md border-l-4 border-[var(--accent)] bg-[var(--accent)]/5 px-4 py-3 text-sm"
        >
            {field.label && <p className="font-semibold">{field.label}</p>}
            {body && (
                <p
                    className={cn(
                        'whitespace-pre-line text-neutral-700',
                        field.label && 'mt-1',
                    )}
                >
                    {linkifyText(body)}
                </p>
            )}
        </div>
    );
}

export function BooleanChoice({
    id,
    label,
    checked,
    onChange,
    disabled,
    controlStyle,
}: {
    id: string;
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    controlStyle: CSSProperties;
}) {
    return (
        <label
            style={controlStyle}
            className={cn(
                'flex cursor-pointer items-center gap-3 rounded-md border-2 px-3 py-2.5 text-sm font-semibold transition-colors',
                'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--accent)] has-[:focus-visible]:ring-offset-2',
                checked
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                    : 'border-black hover:bg-ink/5',
                disabled && 'cursor-not-allowed opacity-60',
            )}
        >
            <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                disabled={disabled}
                className="sr-only"
            />
            <span
                aria-hidden
                className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border-2',
                    checked
                        ? 'border-[var(--accent)] bg-[var(--accent)]'
                        : 'border-black',
                )}
            >
                {checked && <Check className="h-3.5 w-3.5 text-ink" />}
            </span>
            <span className="min-w-0 break-words">{label}</span>
        </label>
    );
}

export function RatingInput({
    value,
    onChange,
    max = 5,
    disabled,
}: {
    value: string;
    onChange: (value: string) => void;
    max?: number;
    disabled?: boolean;
}) {
    const { tc } = useT();
    const selected = Number(value) || 0;

    return (
        <div className="flex items-center gap-1">
            {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
                <button
                    key={n}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(String(n))}
                    aria-label={tc(':count star|:count stars', n)}
                    className="disabled:opacity-50"
                >
                    <Star
                        className={
                            n <= selected
                                ? 'h-6 w-6 fill-[var(--accent)] text-[var(--accent)]'
                                : 'h-6 w-6 text-neutral-300'
                        }
                    />
                </button>
            ))}
        </div>
    );
}

/** Fixed-value gender choice, translated — mirrors RegistrationCategory::GENDER_TYPE. */
export function GenderChoice({
    name,
    label,
    value,
    onChange,
    disabled,
    controlStyle,
    invalid,
}: {
    name: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    controlStyle: CSSProperties;
    invalid?: boolean;
}) {
    const { t } = useT();

    return (
        <ChoiceGroup
            name={name}
            label={label}
            options={['male', 'female']}
            labels={{ male: t('Male'), female: t('Female') }}
            value={value}
            onChange={onChange}
            disabled={disabled}
            controlStyle={controlStyle}
            invalid={invalid}
        />
    );
}
