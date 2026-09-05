import { zodResolver } from '@hookform/resolvers/zod';
import { router } from '@inertiajs/react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { formatRupiah } from '@/lib/format-currency';
import type { Award, AwardVoterType } from '@/types/award';
import type { Event } from '@/types/event';

const VOTER_OPTIONS: { value: AwardVoterType; label: string; hint: string }[] =
    [
        {
            value: 'public',
            label: 'Anyone (public)',
            hint: 'No ID card needed. Limited to one vote per browser, which is a deterrent rather than a guarantee.',
        },
        {
            value: 'registrant',
            label: 'Confirmed registrants',
            hint: 'Identified by the QR token on their own ID card.',
        },
        {
            value: 'attendee',
            label: 'Event attendees',
            hint: 'Guests, tenants, photographers and other badge holders.',
        },
    ];

const awardSchema = z
    .object({
        title: z.string().min(1, 'Give this award a title').max(255),
        description: z.string().max(2000).or(z.literal('')),
        nominee_kind: z.enum(['player', 'team']),
        allowed_voters: z
            .array(z.enum(['public', 'registrant', 'attendee']))
            .min(1, 'Choose at least one kind of voter'),
        status: z.enum(['draft', 'open', 'closed']),
        results_visibility: z.enum(['after_close', 'live', 'admin_only']),
        is_paid: z.boolean(),
        price_per_vote: z.string(),
        max_votes_per_transaction: z.string(),
        max_votes_per_voter: z.string(),
        opens_at: z.string(),
        closes_at: z.string(),
    })
    .refine(
        (values) =>
            !values.is_paid ||
            (Number(values.price_per_vote) >= 1000 &&
                Number(values.price_per_vote) <= 10000000),
        {
            path: ['price_per_vote'],
            message: 'A paid award needs a price of at least Rp 1.000 per vote',
        },
    )
    .refine(
        (values) =>
            !values.opens_at ||
            !values.closes_at ||
            new Date(values.closes_at) > new Date(values.opens_at),
        { path: ['closes_at'], message: 'Voting must close after it opens' },
    );

type AwardFormValues = z.infer<typeof awardSchema>;

function toDefaultValues(award?: Award): AwardFormValues {
    return {
        title: award?.title ?? '',
        description: award?.description ?? '',
        nominee_kind: award?.nominee_kind ?? 'team',
        allowed_voters: award?.allowed_voters ?? ['public'],
        status: award?.status ?? 'draft',
        results_visibility: award?.results_visibility ?? 'after_close',
        is_paid: award?.is_paid ?? false,
        price_per_vote: award?.price_per_vote?.toString() ?? '',
        max_votes_per_transaction:
            award?.max_votes_per_transaction?.toString() ?? '',
        max_votes_per_voter: award?.max_votes_per_voter?.toString() ?? '',
        opens_at: award?.opens_at?.slice(0, 16) ?? '',
        closes_at: award?.closes_at?.slice(0, 16) ?? '',
    };
}

/** Empty string means "not set" in the form but must reach the API as null. */
function toNullableInt(value: string): number | null {
    return value.trim() === '' ? null : Number(value);
}

interface AwardFormDialogProps {
    event: Event;
    award?: Award;
    /** Pricing is frozen once votes exist, so the inputs are disabled. */
    pricingLocked?: boolean;
    trigger: ReactNode;
}

export function AwardFormDialog({
    event,
    award,
    pricingLocked = false,
    trigger,
}: AwardFormDialogProps) {
    const isEditing = Boolean(award);
    const [open, setOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const { control, handleSubmit, reset } = useForm<AwardFormValues>({
        resolver: zodResolver(awardSchema),
        defaultValues: toDefaultValues(award),
        mode: 'onChange',
    });

    const isPaid = useWatch({ control, name: 'is_paid' });
    const pricePerVote = useWatch({ control, name: 'price_per_vote' });

    const onSubmit = (data: AwardFormValues) => {
        const payload = {
            ...data,
            description: data.description || null,
            price_per_vote: data.is_paid
                ? toNullableInt(data.price_per_vote)
                : null,
            max_votes_per_transaction: toNullableInt(
                data.max_votes_per_transaction,
            ),
            max_votes_per_voter: toNullableInt(data.max_votes_per_voter),
            opens_at: data.opens_at || null,
            closes_at: data.closes_at || null,
        };

        const options = {
            preserveScroll: true,
            onStart: () => setIsSaving(true),
            onFinish: () => setIsSaving(false),
            onSuccess: () => {
                setOpen(false);
                reset();
            },
        };

        if (isEditing && award) {
            router.put(
                `/dashboard/events/${event.id}/awards/${award.id}`,
                payload,
                options,
            );
        } else {
            router.post(
                `/dashboard/events/${event.id}/awards`,
                payload,
                options,
            );
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);

                if (!next) {
                    reset(toDefaultValues(award));
                }
            }}
        >
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>
                            {isEditing ? 'Edit Award' : 'New Award'}
                        </DialogTitle>
                        <DialogDescription>
                            People vote for a player or a team. Voting can be
                            free or paid.
                        </DialogDescription>
                    </DialogHeader>

                    <FieldGroup className="py-2">
                        <Controller
                            name="title"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="title">
                                        Title
                                    </FieldLabel>
                                    <Input
                                        id="title"
                                        placeholder="Most Valuable Player"
                                        {...field}
                                    />
                                    {fieldState.invalid && (
                                        <FieldError
                                            errors={[fieldState.error]}
                                        />
                                    )}
                                </Field>
                            )}
                        />

                        <Controller
                            name="description"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="description">
                                        Description
                                    </FieldLabel>
                                    <Textarea
                                        id="description"
                                        rows={2}
                                        {...field}
                                    />
                                    {fieldState.invalid && (
                                        <FieldError
                                            errors={[fieldState.error]}
                                        />
                                    )}
                                </Field>
                            )}
                        />

                        <Controller
                            name="nominee_kind"
                            control={control}
                            render={({ field }) => (
                                <Field>
                                    <FieldLabel>Nominees are</FieldLabel>
                                    <Select
                                        value={field.value}
                                        onValueChange={field.onChange}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="team">
                                                Teams
                                            </SelectItem>
                                            <SelectItem value="player">
                                                Players
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </Field>
                            )}
                        />

                        <Controller
                            name="allowed_voters"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel>Who can vote</FieldLabel>
                                    <div className="flex flex-col gap-3">
                                        {VOTER_OPTIONS.map((option) => (
                                            <label
                                                key={option.value}
                                                className="flex cursor-pointer items-start gap-3"
                                            >
                                                <Checkbox
                                                    className="mt-0.5"
                                                    checked={field.value.includes(
                                                        option.value,
                                                    )}
                                                    onCheckedChange={(
                                                        checked,
                                                    ) =>
                                                        field.onChange(
                                                            checked
                                                                ? [
                                                                      ...field.value,
                                                                      option.value,
                                                                  ]
                                                                : field.value.filter(
                                                                      (value) =>
                                                                          value !==
                                                                          option.value,
                                                                  ),
                                                        )
                                                    }
                                                />
                                                <span>
                                                    <span className="block text-sm font-medium">
                                                        {option.label}
                                                    </span>
                                                    <span className="block text-xs text-muted-foreground">
                                                        {option.hint}
                                                    </span>
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                    {fieldState.invalid && (
                                        <FieldError
                                            errors={[fieldState.error]}
                                        />
                                    )}
                                </Field>
                            )}
                        />

                        <Controller
                            name="is_paid"
                            control={control}
                            render={({ field }) => (
                                <Field>
                                    <div className="flex items-center justify-between rounded-md border px-3 py-2">
                                        <div>
                                            <FieldLabel htmlFor="is_paid">
                                                Paid voting
                                            </FieldLabel>
                                            <p className="text-xs text-muted-foreground">
                                                Each vote is bought through
                                                Midtrans and only counts once
                                                payment settles.
                                            </p>
                                        </div>
                                        <Switch
                                            id="is_paid"
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            disabled={pricingLocked}
                                        />
                                    </div>
                                    {pricingLocked && (
                                        <p className="text-xs text-muted-foreground">
                                            Votes have already been cast, so
                                            pricing can no longer change.
                                        </p>
                                    )}
                                </Field>
                            )}
                        />

                        {isPaid && (
                            <>
                                <Controller
                                    name="price_per_vote"
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <Field
                                            data-invalid={fieldState.invalid}
                                        >
                                            <FieldLabel htmlFor="price_per_vote">
                                                Price per vote (Rp)
                                            </FieldLabel>
                                            <Input
                                                id="price_per_vote"
                                                type="number"
                                                min={1000}
                                                step={500}
                                                placeholder="5000"
                                                disabled={pricingLocked}
                                                {...field}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                {Number(pricePerVote) > 0
                                                    ? `A supporter buying 10 votes pays ${formatRupiah(Number(pricePerVote) * 10)}.`
                                                    : 'Whole rupiah only.'}
                                            </p>
                                            {fieldState.invalid && (
                                                <FieldError
                                                    errors={[fieldState.error]}
                                                />
                                            )}
                                        </Field>
                                    )}
                                />

                                <Controller
                                    name="max_votes_per_transaction"
                                    control={control}
                                    render={({ field }) => (
                                        <Field>
                                            <FieldLabel htmlFor="max_votes_per_transaction">
                                                Max votes per checkout
                                            </FieldLabel>
                                            <Input
                                                id="max_votes_per_transaction"
                                                type="number"
                                                min={1}
                                                placeholder="100"
                                                {...field}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Leave blank for the default of
                                                100.
                                            </p>
                                        </Field>
                                    )}
                                />
                            </>
                        )}

                        {!isPaid && (
                            <Controller
                                name="max_votes_per_voter"
                                control={control}
                                render={({ field }) => (
                                    <Field>
                                        <FieldLabel htmlFor="max_votes_per_voter">
                                            Votes per person
                                        </FieldLabel>
                                        <Input
                                            id="max_votes_per_voter"
                                            type="number"
                                            min={1}
                                            placeholder="1"
                                            {...field}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Leave blank for one vote each.
                                        </p>
                                    </Field>
                                )}
                            />
                        )}

                        <Controller
                            name="results_visibility"
                            control={control}
                            render={({ field }) => (
                                <Field>
                                    <FieldLabel>Voters see results</FieldLabel>
                                    <Select
                                        value={field.value}
                                        onValueChange={field.onChange}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="after_close">
                                                Only after voting closes
                                            </SelectItem>
                                            <SelectItem value="live">
                                                Live, while voting is open
                                            </SelectItem>
                                            <SelectItem value="admin_only">
                                                Never — organizers only
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        You always see live tallies on the
                                        results page.
                                    </p>
                                </Field>
                            )}
                        />

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Controller
                                name="opens_at"
                                control={control}
                                render={({ field }) => (
                                    <Field>
                                        <FieldLabel htmlFor="opens_at">
                                            Opens at
                                        </FieldLabel>
                                        <Input
                                            id="opens_at"
                                            type="datetime-local"
                                            {...field}
                                        />
                                    </Field>
                                )}
                            />

                            <Controller
                                name="closes_at"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="closes_at">
                                            Closes at
                                        </FieldLabel>
                                        <Input
                                            id="closes_at"
                                            type="datetime-local"
                                            {...field}
                                        />
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />
                        </div>

                        <Controller
                            name="status"
                            control={control}
                            render={({ field }) => (
                                <Field>
                                    <FieldLabel>Status</FieldLabel>
                                    <Select
                                        value={field.value}
                                        onValueChange={field.onChange}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="draft">
                                                Draft — hidden from the public
                                            </SelectItem>
                                            <SelectItem value="open">
                                                Open for voting
                                            </SelectItem>
                                            <SelectItem value="closed">
                                                Closed
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </Field>
                            )}
                        />
                    </FieldGroup>

                    <DialogFooter>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving
                                ? 'Saving...'
                                : isEditing
                                  ? 'Save changes'
                                  : 'Create award'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
