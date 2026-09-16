import { zodResolver } from '@hookform/resolvers/zod';
import { Head, router } from '@inertiajs/react';
import { Loader2, Mail, MapPin, Phone, Send } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { PublicPageHeader } from '@/components/public/public-page-header';
import {
    CONTACT_ADDRESS,
    CONTACT_EMAIL,
    CONTACT_PHONE,
} from '@/data/contact-info';
import { useT } from '@/hooks/use-t';
import PublicLayout from '@/layouts/public-layout';
import type { Translate } from '@/lib/i18n';

const contactSchema = (t: Translate) =>
    z.object({
        name: z.string().min(1, t('Please enter your name')).max(255),
        email: z.string().email(t('Please enter a valid email')),
        phone: z.string().max(255).or(z.literal('')),
        message: z
            .string()
            .min(10, t('Message must be at least 10 characters')),
    });

type ContactFormValues = z.infer<ReturnType<typeof contactSchema>>;

const CONTACT_INFO = [
    { icon: MapPin, label: CONTACT_ADDRESS },
    { icon: Mail, label: CONTACT_EMAIL },
    { icon: Phone, label: CONTACT_PHONE },
];

export default function Contact() {
    const { t } = useT();
    const [isSending, setIsSending] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        setError,
        formState: { errors },
    } = useForm<ContactFormValues>({
        resolver: zodResolver(contactSchema(t)),
        defaultValues: { name: '', email: '', phone: '', message: '' },
    });

    const onSubmit = (data: ContactFormValues) => {
        setIsSending(true);

        router.post('/contact', data, {
            onSuccess: () => {
                toast.success(t('Message sent'), {
                    description: t(
                        'Thanks for reaching out — we’ll get back to you soon.',
                    ),
                });
                reset();
            },
            onError: (serverErrors) => {
                Object.entries(serverErrors).forEach(([field, message]) => {
                    setError(field as keyof ContactFormValues, {
                        type: 'manual',
                        message: message as string,
                    });
                });
            },
            onFinish: () => setIsSending(false),
        });
    };

    return (
        <>
            <Head title={t('Contact Us — Sporta Indonesia')} />

            <PublicLayout>
                <PublicPageHeader
                    languageToggle={false}
                    eyebrow={t('Get In Touch')}
                    title={t('Contact Us')}
                    subtitle={t(
                        'Questions about an event or partnership? Send us a message.',
                    )}
                />

                <section className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-6 py-14 lg:grid-cols-2">
                    <div className="flex flex-col gap-4">
                        <h2 className="text-xl font-black tracking-tight uppercase">
                            {t('Contact Info')}
                        </h2>
                        {CONTACT_INFO.map(({ icon: Icon, label }) => (
                            <div
                                key={label}
                                className="flex items-center gap-3 text-white/80"
                            >
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-red-500 bg-red-600/20">
                                    <Icon className="h-4 w-4 text-red-400" />
                                </div>
                                <p className="w-full">{label}</p>
                            </div>
                        ))}
                    </div>

                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="flex flex-col gap-4 rounded-2xl border-2 border-white/15 bg-white/5 p-6"
                    >
                        <div className="flex flex-col gap-1.5">
                            <label
                                htmlFor="name"
                                className="text-xs font-bold tracking-wide text-white/70 uppercase"
                            >
                                {t('Name')}
                            </label>
                            <input
                                id="name"
                                {...register('name')}
                                disabled={isSending}
                                placeholder={t('Your name')}
                                className="rounded-xl border-2 border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-red-500 focus:outline-none"
                            />
                            {errors.name && (
                                <span className="text-xs text-red-400">
                                    {errors.name.message}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label
                                htmlFor="email"
                                className="text-xs font-bold tracking-wide text-white/70 uppercase"
                            >
                                {t('Email')}
                            </label>
                            <input
                                id="email"
                                type="email"
                                {...register('email')}
                                disabled={isSending}
                                placeholder="you@example.com"
                                className="rounded-xl border-2 border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-red-500 focus:outline-none"
                            />
                            {errors.email && (
                                <span className="text-xs text-red-400">
                                    {errors.email.message}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label
                                htmlFor="phone"
                                className="text-xs font-bold tracking-wide text-white/70 uppercase"
                            >
                                {t('Phone')}{' '}
                                <span className="font-normal text-white/40 normal-case">
                                    {t('(Optional)')}
                                </span>
                            </label>
                            <input
                                id="phone"
                                {...register('phone')}
                                disabled={isSending}
                                placeholder="+62..."
                                className="rounded-xl border-2 border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-red-500 focus:outline-none"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label
                                htmlFor="message"
                                className="text-xs font-bold tracking-wide text-white/70 uppercase"
                            >
                                {t('Message')}
                            </label>
                            <textarea
                                id="message"
                                {...register('message')}
                                disabled={isSending}
                                rows={5}
                                placeholder={t('How can we help?')}
                                className="rounded-xl border-2 border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-red-500 focus:outline-none"
                            />
                            {errors.message && (
                                <span className="text-xs text-red-400">
                                    {errors.message.message}
                                </span>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isSending}
                            className="mt-2 flex items-center justify-center gap-2 rounded-full bg-red-600 py-3 text-sm font-bold tracking-wide text-white uppercase transition hover:bg-red-700 disabled:opacity-60"
                        >
                            {isSending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                            {isSending ? t('Sending…') : t('Send Message')}
                        </button>
                    </form>
                </section>
            </PublicLayout>
        </>
    );
}
