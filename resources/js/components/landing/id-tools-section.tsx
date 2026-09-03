import { Link } from '@inertiajs/react';
import { QrCode, ShieldCheck, Trophy } from 'lucide-react';

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
    return (
        <section className="border-y-2 border-white/10 bg-white/5">
            <div className="mx-auto max-w-6xl px-6 py-14">
                <div className="mb-8 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <span className="text-xs font-bold tracking-[0.3em] text-blue-400 uppercase">
                            Sporta ID
                        </span>
                        <h2 className="text-3xl font-black tracking-tight uppercase">
                            Already Registered?
                        </h2>
                        <p className="mt-2 max-w-lg text-sm text-white/60">
                            Manage your digital player ID card — find it again
                            anytime, no app required.
                        </p>
                    </div>
                    <Link
                        href="/find-id"
                        className="flex items-center gap-2 rounded-full border-2 border-blue-400 px-6 py-3 text-sm font-bold tracking-wide text-blue-200 uppercase transition hover:bg-blue-500/10 active:scale-95"
                    >
                        <QrCode className="h-4 w-4" />
                        Find My ID Card
                    </Link>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {FEATURES.map(({ icon: Icon, title, desc }) => (
                        <div
                            key={title}
                            className="flex flex-col gap-3 rounded-2xl border-2 border-white/15 bg-black/20 p-6"
                        >
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-red-500 bg-red-600/20">
                                <Icon className="h-5 w-5 text-red-400" />
                            </div>
                            <h3 className="text-base font-bold tracking-tight uppercase">
                                {title}
                            </h3>
                            <p className="text-sm text-white/60">{desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
