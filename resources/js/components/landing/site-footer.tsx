import { Link } from '@inertiajs/react';
import {
    Facebook,
    Instagram,
    Mail,
    MapPin,
    Phone,
    Youtube,
} from 'lucide-react';
import {
    CONTACT_ADDRESS,
    CONTACT_EMAIL,
    CONTACT_PHONE,
    SOCIAL_LINKS,
} from '@/data/contact-info';
import { useT } from '@/hooks/use-t';
import { SiteLogo } from './site-logo';

const SOCIAL_ICONS: Record<string, typeof Instagram> = {
    Instagram: Instagram,
    Facebook: Facebook,
    Youtube: Youtube,
};

const EXPLORE_LINKS = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/events', label: 'Events' },
    { href: '/contact', label: 'Contact' },
];

const LEGAL_LINKS = [
    { href: '/terms', label: 'Terms & Conditions' },
    { href: '/refund-policy', label: 'Refund & Cancellation' },
    { href: '/privacy', label: 'Privacy Policy' },
];

export function SiteFooter() {
    const { t } = useT();

    return (
        <footer className="border-t-2 border-white/10 bg-black/20">
            <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <SiteLogo className="h-8 w-auto" />
                    </div>
                    <p className="text-sm text-white/60">
                        {t(
                            'Support Your Talent — organizing sports and arts events across Indonesia since 2011.',
                        )}
                    </p>
                    <div className="flex gap-2">
                        {SOCIAL_LINKS.map((social) => {
                            const Icon = SOCIAL_ICONS[social.label];

                            return (
                                <a
                                    key={social.label}
                                    href={social.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={social.label}
                                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/15 text-white/60 transition hover:border-red-500 hover:text-white"
                                >
                                    {Icon && <Icon className="h-4 w-4" />}
                                </a>
                            );
                        })}
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <h3 className="text-xs font-bold tracking-[0.2em] text-white/40 uppercase">
                        {t('Explore')}
                    </h3>
                    {EXPLORE_LINKS.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="text-sm text-white/70 transition hover:text-white"
                        >
                            {t(link.label)}
                        </Link>
                    ))}
                </div>

                <div className="flex flex-col gap-3">
                    <h3 className="text-xs font-bold tracking-[0.2em] text-white/40 uppercase">
                        {t('Our Events')}
                    </h3>
                    <Link
                        href="/events"
                        className="text-sm text-white/70 transition hover:text-white"
                    >
                        {t('All Events')}
                    </Link>
                    <a
                        href="https://pontianakcityrun.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-white/70 transition hover:text-white"
                    >
                        Pontianak City Run ↗
                    </a>
                </div>

                <div className="flex flex-col gap-3">
                    <h3 className="text-xs font-bold tracking-[0.2em] text-white/40 uppercase">
                        {t('Contact')}
                    </h3>
                    <div className="flex items-start gap-2 text-sm text-white/70">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-white/40" />
                        {CONTACT_ADDRESS}
                    </div>
                    <a
                        href={`mailto:${CONTACT_EMAIL}`}
                        className="flex items-center gap-2 text-sm text-white/70 transition hover:text-white"
                    >
                        <Mail className="h-4 w-4 shrink-0 text-white/40" />
                        {CONTACT_EMAIL}
                    </a>
                    <a
                        href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`}
                        className="flex items-center gap-2 text-sm text-white/70 transition hover:text-white"
                    >
                        <Phone className="h-4 w-4 shrink-0 text-white/40" />
                        {CONTACT_PHONE}
                    </a>
                </div>
            </div>

            <div className="border-t border-white/10 px-6 py-6">
                <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-xs text-white/40">
                    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                        {LEGAL_LINKS.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="transition hover:text-white"
                            >
                                {t(link.label)}
                            </Link>
                        ))}
                    </div>
                    <p className="text-center">
                        {t(
                            'Online payments are processed securely by Midtrans — bank transfer & virtual account, e-wallet, QRIS, and credit/debit card.',
                        )}
                    </p>
                    <p>
                        {t('© :year Sporta Indonesia. All rights reserved.', {
                            year: new Date().getFullYear(),
                        })}
                    </p>
                </div>
            </div>
        </footer>
    );
}
