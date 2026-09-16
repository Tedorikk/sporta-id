/**
 * The red asterisk after a required field's label on the public forms.
 * Decorative only — the input itself carries `required`/validation — so it
 * is hidden from screen readers rather than read out as "star".
 */
export function RequiredMark() {
    return (
        <span aria-hidden className="ml-0.5 font-bold text-red-600">
            *
        </span>
    );
}
