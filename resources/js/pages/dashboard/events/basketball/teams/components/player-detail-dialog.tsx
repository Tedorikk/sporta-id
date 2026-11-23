import { format } from 'date-fns';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { playerRoleLabel } from '@/types/player';
import type { Player } from '@/types/player';

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="flex flex-col gap-0.5 border-b py-2 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span className="text-xs font-medium text-muted-foreground">
                {label}
            </span>
            <span className="text-sm break-words sm:text-right">
                {value}
            </span>
        </div>
    );
}

const empty = <span className="italic text-muted-foreground">Not set</span>;

export function PlayerDetailDialog({
    player,
    trigger,
}: {
    player: Player;
    trigger: ReactNode;
}) {
    return (
        <Dialog>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {player.photo && (
                            <img
                                src={player.photo}
                                alt={player.name}
                                className="h-10 w-10 shrink-0 rounded-full object-cover"
                            />
                        )}
                        {player.name}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col">
                    <DetailRow
                        label="Role"
                        value={playerRoleLabel(player.role)}
                    />
                    {player.role === 'player' && (
                        <>
                            <DetailRow
                                label="Jersey Number"
                                value={player.jersey_number ?? empty}
                            />
                            <DetailRow
                                label="Position"
                                value={player.position ?? empty}
                            />
                        </>
                    )}
                    <DetailRow
                        label="Club"
                        value={player.basketball_club?.name ?? empty}
                    />
                    <DetailRow
                        label="Date of Birth"
                        value={
                            player.dob
                                ? format(new Date(player.dob), 'PP')
                                : empty
                        }
                    />
                    <DetailRow
                        label="Birthplace"
                        value={player.birthplace ?? empty}
                    />
                    <DetailRow
                        label="Phone Number"
                        value={player.phone_number ?? empty}
                    />
                    <DetailRow label="Email" value={player.email ?? empty} />
                    <DetailRow
                        label="Identity Document"
                        value={
                            player.identity_card ? (
                                <a
                                    href={player.identity_card}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="underline underline-offset-2"
                                >
                                    View document
                                </a>
                            ) : (
                                empty
                            )
                        }
                    />
                    <DetailRow
                        label="Certificate"
                        value={
                            player.certificate ? (
                                <span className="flex items-center justify-end gap-2">
                                    <a
                                        href={player.certificate}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="underline underline-offset-2"
                                    >
                                        View certificate
                                    </a>
                                    {player.is_certificate_validated && (
                                        <Badge
                                            variant="secondary"
                                            className="bg-emerald-100 text-emerald-800"
                                        >
                                            Validated
                                        </Badge>
                                    )}
                                </span>
                            ) : (
                                empty
                            )
                        }
                    />
                    {player.extra &&
                        Object.entries(player.extra)
                            .filter(([, v]) => v)
                            .map(([key, value]) => (
                                <DetailRow
                                    key={key}
                                    label={key
                                        .replace(/_/g, ' ')
                                        .replace(/^\w/, (c) =>
                                            c.toUpperCase(),
                                        )}
                                    value={value}
                                />
                            ))}
                    <DetailRow
                        label="Added On"
                        value={format(new Date(player.created_at), 'PPp')}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
