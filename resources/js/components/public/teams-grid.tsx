import { Shield } from 'lucide-react';
import { useT } from '@/hooks/use-t';
import { formatImageUrl } from '@/lib/image-utils';
import type { Team } from '@/types/team';

interface Props {
    teams: Team[];
}

export function TeamsGrid({ teams }: Props) {
    const { t } = useT();

    if (teams.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-3">
            <h4 className="text-sm font-bold tracking-wide text-ink/70 uppercase">
                {t('Teams (:count)', { count: teams.length })}
            </h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {teams.map((team) => (
                    <div
                        key={team.id}
                        className="flex items-center gap-2 rounded-xl border-2 border-ink/10 bg-ink/20 px-3 py-2.5"
                    >
                        {team.logo ? (
                            <img
                                src={formatImageUrl(team.logo)}
                                alt={team.name}
                                className="h-8 w-8 shrink-0 rounded-full object-cover"
                            />
                        ) : (
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/10 text-ink/40">
                                <Shield className="h-4 w-4" />
                            </span>
                        )}
                        <span className="truncate text-sm font-semibold text-ink/85">
                            {team.name}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
