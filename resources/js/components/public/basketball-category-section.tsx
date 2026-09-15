import { useT } from '@/hooks/use-t';
import type { PublicEventCategory } from '@/types/public-event-category';
import { BracketTree } from './bracket-tree';
import { StandingsTable } from './standings-table';
import { TeamsGrid } from './teams-grid';

export function BasketballCategorySection({
    category,
}: {
    category: PublicEventCategory;
}) {
    const { t } = useT();
    const hasSchedule =
        category.pools.length > 0 || category.matches.length > 0;

    return (
        <div className="flex flex-col gap-6 rounded-2xl border-2 border-white/15 bg-white/5 p-6">
            {/* Price and quota live on the registration category, listed in the
                event's Register block — this section is the tournament itself. */}
            <h3 className="text-xl font-black tracking-tight uppercase">
                {category.name}
            </h3>

            {!hasSchedule && category.teams.length === 0 && (
                <p className="text-sm text-white/40">
                    {t('Schedule will be posted soon.')}
                </p>
            )}

            {category.pools.length > 0
                ? category.pools.map((pool) => (
                      <div key={pool.id} className="flex flex-col gap-3">
                          <h4 className="text-sm font-bold tracking-wide text-white/70 uppercase">
                              {pool.name.toLowerCase().startsWith('pool')
                                  ? pool.name
                                  : t('Pool :name', { name: pool.name })}
                          </h4>
                          <StandingsTable
                              standings={
                                  category.standings[`pool_${pool.id}`] ?? []
                              }
                              teams={pool.teams}
                          />
                      </div>
                  ))
                : category.matches.length > 0 && (
                      <StandingsTable
                          standings={category.standings.overall ?? []}
                          teams={category.teams}
                      />
                  )}

            <TeamsGrid teams={category.teams} />

            <BracketTree matches={category.matches} />
        </div>
    );
}
