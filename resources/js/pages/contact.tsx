import { zodResolver } from '@hookform/resolvers/zod';
import { Head, router } from '@inertiajs/react';
import { Loader2, Mail, MapPin, Phone, Send } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { MarketingPageHeader } from '@/components/public/marketing-page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    CONTACT_ADDRESS,
    CONTACT_EMAIL,
    CONTACT_PHONE,
} from '@/data/contact-info';
import { useT } from '@/hooks/use-t';
import PublicLayout from '@/layouts/public-layout';
import type { Translate } from '@/lib/i18n';

const darkFieldClass =
    'border-white/15 bg-white/5 text-paper placeholder:text-paper/40 focus-visible:border-poster-red focus-visible:ring-poster-red/30';

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
                <MarketingPageHeader
                    eyebrow={t('Get In Touch')}
                    title={t('Contact Us')}
                    subtitle={t(
                        'Questions about an event or partnership? Send us a message.',
                    )}
                />

                <section className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 py-14 lg:grid-cols-2">
                    <div className="flex flex-col gap-4 rounded-2xl bg-[#0c0d0a] p-6 text-paper">
                        <h2 className="text-xl font-black tracking-tight uppercase">
                            {t('Contact Info')}
                        </h2>
                        {CONTACT_INFO.map(({ icon: Icon, label }) => (
                            <div key={label} className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-poster-red/20">
                                    <Icon className="h-4 w-4 text-poster-red" />
                                </div>
                                <p className="w-full text-paper/80">{label}</p>
                            </div>
                        ))}
                    </div>

                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="flex flex-col gap-4 rounded-2xl bg-[#0c0d0a] p-6 text-paper"
                    >
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="name" className="text-xs font-bold tracking-wide text-paper/70 uppercase">
                                {t('Name')}
                            </Label>
                            <Input
                                id="name"
                                {...register('name')}
                                disabled={isSending}
                                placeholder={t('Your name')}
                                className={darkFieldClass}
                            />
                            {errors.name && (
                                <span className="text-xs text-poster-red">
                                    {errors.name.message}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="email" className="text-xs font-bold tracking-wide text-paper/70 uppercase">
                                {t('Email')}
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                {...register('email')}
                                disabled={isSending}
                                placeholder="you@example.com"
                                className={darkFieldClass}
                            />
                            {errors.email && (
                                <span className="text-xs text-poster-red">
                                    {errors.email.message}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="phone" className="text-xs font-bold tracking-wide text-paper/70 uppercase">
                                {t('Phone')}{' '}
                                <span className="font-normal text-paper/40 normal-case">
                                    {t('(Optional)')}
                                </span>
                            </Label>
                            <Input
                                id="phone"
                                {...register('phone')}
                                disabled={isSending}
                                placeholder="+62..."
                                className={darkFieldClass}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="message" className="text-xs font-bold tracking-wide text-paper/70 uppercase">
                                {t('Message')}
                            </Label>
                            <Textarea
                                id="message"
                                {...register('message')}
                                disabled={isSending}
                                rows={5}
                                placeholder={t('How can we help?')}
                                className={darkFieldClass}
                            />
                            {errors.message && (
                                <span className="text-xs text-poster-red">
                                    {errors.message.message}
                                </span>
                            )}
                        </div>

                        <Button
                            type="submit"
                            disabled={isSending}
                            className="mt-2 rounded-full bg-poster-red text-paper hover:bg-poster-red/90"
                        >
                            {isSending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                            {isSending ? t('Sending…') : t('Send Message')}
                        </Button>
                    </form>
                </section>
            </PublicLayout>
        </>
    );
}
