import { ClipboardList } from 'lucide-react';
import { useT } from '@/hooks/use-t';
import { formatDateTime } from '@/lib/format-date';
import type { RegistrationField } from '@/types/registration-category';
import { rosterDetailsOnForm } from '@/types/registration-category';

/**
 * "What you'll need" — shown on the first step of a team form so a manager
 * can collect documents from parents *before* sitting down with the form,
 * not discover the list one member at a time. Everything here is derived
 * from the roster block's configuration; the organiser writes nothing extra.
 */
export function RosterRequirementsCard({
    field,
    rosterDeadline,
}: {
    field: RegistrationField;
    rosterDeadline: string | null;
}) {
    const { t } = useT();
    const slots = field.slots ?? [];
    const memberFields = field.member_fields ?? [];
    const detailsOnForm = rosterDetailsOnForm(field);
    const hasMedic = slots.some((slot) => slot.role === 'medic');
    const requiredQuestions = memberFields.filter((mf) => mf.required);

    const perMember = [
        t('Photo for the ID card (portrait, plain background)'),
        t('Identity document — KTP, KK or birth certificate (akta)'),
        t('Place and date of birth'),
        t('WhatsApp number'),
        t('Jersey number (players)'),
        ...(hasMedic ? [t('Licence or certificate (medic)')] : []),
        ...requiredQuestions.map((mf) => mf.label),
    ];

    return (
        <div
            role="note"
            className="mb-5 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm"
        >
            <p className="flex items-center gap-2 font-semibold text-neutral-900">
                <ClipboardList className="h-4 w-4 text-[var(--accent)]" />
                {t('What you’ll need')}
            </p>

            <p className="mt-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                {t('Team')}
            </p>
            <ul className="mt-1 list-disc pl-5 text-neutral-700">
                {slots.map((slot) => (
                    <li key={slot.role}>
                        {t(slot.label)}
                        {': '}
                        {slot.min === slot.max
                            ? slot.min
                            : slot.max === null
                              ? t('min. :min', { min: slot.min })
                              : `${slot.min}–${slot.max}`}
                    </li>
                ))}
            </ul>

            <p className="mt-3 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                {detailsOnForm
                    ? t('For every member, on this form')
                    : t(
                          'For every member, in the roster portal after registering',
                      )}
            </p>
            <ul className="mt-1 list-disc pl-5 text-neutral-700">
                {perMember.map((item) => (
                    <li key={item}>{item}</li>
                ))}
            </ul>

            {!detailsOnForm && (
                <div
                    className="mt-3 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-3 py-2 text-neutral-800"
                    suppressHydrationWarning
                >
                    <p className="font-semibold">
                        {t(
                            'This form only asks for each member’s name, role and jersey number.',
                        )}
                    </p>
                    <p className="mt-1">
                        {t(
                            'After you register, every member gets a personal link — share it in the team’s WhatsApp group and they upload their own photo and document. Or fill it in yourself in the roster portal.',
                        )}{' '}
                        {rosterDeadline
                            ? t('Complete the rest before :deadline.', {
                                  deadline: formatDateTime(rosterDeadline),
                              })
                            : t(
                                  'Complete the rest before the roster deadline.',
                              )}
                    </p>
                </div>
            )}
        </div>
    );
}
