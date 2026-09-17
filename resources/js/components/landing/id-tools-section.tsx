import { Link } from '@inertiajs/react';
import { QrCode, ShieldCheck, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/hooks/use-t';

const FEATURES = [
    {
        icon: Trophy,
        title: 'Pick Your Team',
        desc: 'Select your category and the team your admin already registered.',
    },
    {
        icon: ShieldCheck,
        title: 'Get Verified',
        desc: 'Fill your details and get a unique digital identity card.',
    },
    {
        icon: QrCode,
        title: 'Scan Anywhere',
        desc: 'Show your QR code at check-in — no printing needed.',
    },
];

export function IdToolsSection() {
    const { t } = useT();

    return (
        <section className="mx-auto max-w-6xl px-6 py-14">
            <div className="relative overflow-hidden rounded-[28px] bg-[#0c0d0a] px-6 py-12 text-paper sm:px-12">
                <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                        background:
                            'radial-gradient(circle at 85% 0%, rgba(224,51,42,0.25), transparent 60%)',
                    }}
                />

                <div className="relative mb-8 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 className="font-display text-3xl font-bold">
                            {t('Already Registered?')}
                        </h2>
                        <p className="mt-2 max-w-lg text-sm text-paper/60">
                            {t(
                                'Manage your digital player ID card — find it again anytime, no app required.',
                            )}
                        </p>
                    </div>
                    <Button
                        asChild
                        className="rounded-full bg-poster-red text-paper hover:bg-poster-red/90"
                    >
                        <Link href="/find-id">
                            <QrCode className="h-4 w-4" />
                            {t('Find My ID Card')}
                        </Link>
                    </Button>
                </div>

                <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {FEATURES.map(({ icon: Icon, title, desc }) => (
                        <div
                            key={title}
                            className="flex flex-col gap-3 rounded-2xl border border-white/10 p-6"
                        >
                            <Icon className="h-6 w-6 text-poster-red" />
                            <h3 className="text-base font-semibold">{t(title)}</h3>
                            <p className="text-sm text-paper/60">{t(desc)}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
