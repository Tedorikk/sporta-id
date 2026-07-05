import { zodResolver } from '@hookform/resolvers/zod';
import { router } from '@inertiajs/react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldDescription,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import { Textarea } from '@/components/ui/textarea';

import { UploadImage } from '@/components/upload-image';

import { cn } from '@/lib/utils';

import { EVENT_CATEGORIES } from '@/types/event';
import type { Event } from '@/types/event';

const eventSchema = z
    .object({
        name: z
            .string()
            .min(5, 'Name must be at least 5 characters long')
            .max(255),
        description: z.string(),
        contact_person: z
            .string()
            .regex(/^\+[1-9]\d{1,14}$/, 'Invalid E.164 format'),
        category: z.string().min(1, 'Please select a category'),
        is_published: z.boolean(),
        start_date: z.string().min(1, 'Start date is required'),
        end_date: z.string().min(1, 'End date is required'),
        banner: z.string().url('Must be a valid URL').or(z.literal('')),
    })
    .refine(
        (data) =>
            !data.end_date ||
            !data.start_date ||
            data.end_date >= data.start_date,
        {
            message: 'End date must be on or after the start date',
            path: ['end_date'],
        },
    );

type EventFormValues = z.infer<typeof eventSchema>;

type EventFormProps = {
    event?: Event;
};

function toDefaultValues(event?: Event): EventFormValues {
    return {
        name: event?.name ?? '',
        description: event?.description ?? '',
        contact_person: event?.contact_person ?? '',
        category: event?.category ?? '',
        is_published: event?.is_published ?? false,
        start_date: event?.start_date ?? '',
        end_date: event?.end_date ?? '',
        banner: event?.banner ?? '',
    };
}

function FormContent({ event }: EventFormProps) {
    const isEditing = Boolean(event);

    const { control, handleSubmit, setError, clearErrors } =
        useForm<EventFormValues>({
            resolver: zodResolver(eventSchema),
            defaultValues: toDefaultValues(event),
            mode: 'onChange',
        });

    const onSubmit = (data: EventFormValues) => {
        if (isEditing && event) {
            router.put(`/events/${event.id}`, data);
        } else {
            router.post('/events', data);
        }
    };

    function formatE164Input(value: string) {
        // Force a leading "+", strip everything else that isn't a digit,
        // and cap at 15 digits (E.164 max length)
        const digits = value.replace(/[^\d]/g, '').slice(0, 15);

        return digits ? `+${digits}` : '';
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <FieldGroup>
                <FieldGroup className="grid grid-cols-2">
                    <Controller
                        name="banner"
                        control={control}
                        render={({ field, fieldState }) => (
                            <Field
                                data-invalid={fieldState.invalid}
                                className="columns-1"
                            >
                                <FieldLabel htmlFor="banner">Banner</FieldLabel>
                                <UploadImage
                                    {...field}
                                    ratio={4 / 5}
                                    value={field.value}
                                    onChange={(value) => {
                                        clearErrors('banner');
                                        field.onChange(value);
                                    }}
                                    onError={(error) => {
                                        setError('banner', {
                                            type: 'manual',
                                            message:
                                                typeof error === 'string'
                                                    ? error
                                                    : 'Upload failed',
                                        });
                                    }}
                                    enableCrop={true}
                                />
                                {fieldState.invalid && (
                                    <FieldError errors={[fieldState.error]} />
                                )}
                            </Field>
                        )}
                    />
                    <FieldGroup className="">
                        <Controller
                            name="name"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field
                                    data-invalid={fieldState.invalid}
                                    className="rows-1"
                                >
                                    <FieldLabel htmlFor="name">
                                        Event Name
                                    </FieldLabel>
                                    <Input
                                        {...field}
                                        id="name"
                                        placeholder="Event Name"
                                        aria-label="Event Name"
                                        aria-invalid={fieldState.invalid}
                                        autoComplete="off"
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
                                        {...field}
                                        id="description"
                                        placeholder="Tell attendees what this event is about"
                                        aria-label="Description"
                                        aria-invalid={fieldState.invalid}
                                        rows={5}
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
                            name="category"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="category">
                                        Category
                                    </FieldLabel>
                                    <Select
                                        value={field.value}
                                        onValueChange={field.onChange}
                                    >
                                        <SelectTrigger
                                            id="category"
                                            aria-label="Category"
                                            aria-invalid={fieldState.invalid}
                                        >
                                            <SelectValue placeholder="Select a category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {EVENT_CATEGORIES.map((option) => (
                                                <SelectItem
                                                    key={option.value}
                                                    value={option.value}
                                                >
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {fieldState.invalid && (
                                        <FieldError
                                            errors={[fieldState.error]}
                                        />
                                    )}
                                </Field>
                            )}
                        />
                        <Controller
                            name="contact_person"
                            control={control}
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel htmlFor="contact_person">
                                        Contact Person
                                    </FieldLabel>
                                    <Input
                                        {...field}
                                        id="contact_person"
                                        placeholder="+628123456789"
                                        aria-label="Contact Person"
                                        aria-invalid={fieldState.invalid}
                                        autoComplete="off"
                                        onChange={(e) =>
                                            field.onChange(
                                                formatE164Input(e.target.value),
                                            )
                                        }
                                    />
                                    <FieldDescription>
                                        Phone number in E.164 format, e.g.
                                        +628123456789
                                    </FieldDescription>
                                    {fieldState.invalid && (
                                        <FieldError
                                            errors={[fieldState.error]}
                                        />
                                    )}
                                </Field>
                            )}
                        />
                        <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Controller
                                name="start_date"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="start_date">
                                            Start Date
                                        </FieldLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    id="start_date"
                                                    variant="outline"
                                                    aria-label="Start Date"
                                                    aria-invalid={
                                                        fieldState.invalid
                                                    }
                                                    className={cn(
                                                        'w-full justify-start text-left font-normal',
                                                        !field.value &&
                                                            'text-muted-foreground',
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {field.value ? (
                                                        format(
                                                            new Date(
                                                                field.value,
                                                            ),
                                                            'PPP',
                                                        )
                                                    ) : (
                                                        <span>Pick a date</span>
                                                    )}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent
                                                className="w-auto p-0"
                                                align="start"
                                            >
                                                <Calendar
                                                    mode="single"
                                                    selected={
                                                        field.value
                                                            ? new Date(
                                                                  field.value,
                                                              )
                                                            : undefined
                                                    }
                                                    onSelect={(date) =>
                                                        field.onChange(
                                                            date
                                                                ? format(
                                                                      date,
                                                                      'yyyy-MM-dd',
                                                                  )
                                                                : '',
                                                        )
                                                    }
                                                    autoFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />

                            <Controller
                                name="end_date"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="end_date">
                                            End Date
                                        </FieldLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    id="end_date"
                                                    variant="outline"
                                                    aria-label="End Date"
                                                    aria-invalid={
                                                        fieldState.invalid
                                                    }
                                                    className={cn(
                                                        'w-full justify-start text-left font-normal',
                                                        !field.value &&
                                                            'text-muted-foreground',
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {field.value ? (
                                                        format(
                                                            new Date(
                                                                field.value,
                                                            ),
                                                            'PPP',
                                                        )
                                                    ) : (
                                                        <span>Pick a date</span>
                                                    )}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent
                                                className="w-auto p-0"
                                                align="start"
                                            >
                                                <Calendar
                                                    mode="single"
                                                    selected={
                                                        field.value
                                                            ? new Date(
                                                                  field.value,
                                                              )
                                                            : undefined
                                                    }
                                                    onSelect={(date) =>
                                                        field.onChange(
                                                            date
                                                                ? format(
                                                                      date,
                                                                      'yyyy-MM-dd',
                                                                  )
                                                                : '',
                                                        )
                                                    }
                                                    autoFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />
                            <Controller
                                name="is_published"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <Field
                                        data-invalid={fieldState.invalid}
                                        orientation="horizontal"
                                    >
                                        <Checkbox
                                            id="is_published"
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            aria-label="Publish immediately"
                                        />
                                        <FieldLabel
                                            htmlFor="is_published"
                                            className="font-normal"
                                        >
                                            Publish this event immediately
                                        </FieldLabel>
                                        {fieldState.invalid && (
                                            <FieldError
                                                errors={[fieldState.error]}
                                            />
                                        )}
                                    </Field>
                                )}
                            />
                        </FieldGroup>

                        <Button type="submit" className="mt-2">
                            {isEditing ? 'Save Changes' : 'Create Event'}
                        </Button>
                    </FieldGroup>
                </FieldGroup>
            </FieldGroup>
        </form>
    );
}

export default function EventForm({ event }: EventFormProps) {
    return <FormContent event={event} />;
}
