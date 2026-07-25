import { Shield } from 'lucide-react';
import { formatImageUrl } from '@/lib/image-utils';
import type { Team } from '@/types/team';

interface Props {
    teams: Team[];
}

export function TeamsGrid({ teams }: Props) {
    if (teams.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-3">
            <h4 className="text-sm font-bold tracking-wide text-white/70 uppercase">Teams ({teams.length})</h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {teams.map((team) => (
                    <div
                        key={team.id}
                        className="flex items-center gap-2 rounded-xl border-2 border-white/10 bg-black/20 px-3 py-2.5"
                    >
                        {team.logo ? (
                            <img
                                src={formatImageUrl(team.logo)}
                                alt={team.name}
                                className="h-8 w-8 shrink-0 rounded-full object-cover"
                            />
                        ) : (
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/40">
                                <Shield className="h-4 w-4" />
                            </span>
                        )}
                        <span className="truncate text-sm font-semibold text-white/85">{team.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
