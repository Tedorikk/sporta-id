import type { PublicEventCategory } from '@/types/public-event-category';
import { BracketTree } from './bracket-tree';
import { StandingsTable } from './standings-table';
import { TeamsGrid } from './teams-grid';

export function BasketballCategorySection({
    category,
}: {
    category: PublicEventCategory;
}) {
    const hasSchedule =
        category.pools.length > 0 || category.matches.length > 0;

    return (
        <div className="flex flex-col gap-6 rounded-2xl border-2 border-white/15 bg-white/5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xl font-black tracking-tight uppercase">
                    {category.name}
                </h3>
                <div className="flex flex-wrap gap-3 text-xs text-white/60">
                    {category.price && (
                        <span>
                            Rp {Number(category.price).toLocaleString('id-ID')}
                        </span>
                    )}
                    {category.quota !== null && (
                        <span>Quota: {category.quota} teams</span>
                    )}
                </div>
            </div>

            {!hasSchedule && category.teams.length === 0 && (
                <p className="text-sm text-white/40">
                    Schedule will be posted soon.
                </p>
            )}

            {category.pools.length > 0
                ? category.pools.map((pool) => (
                      <div key={pool.id} className="flex flex-col gap-3">
                          <h4 className="text-sm font-bold tracking-wide text-white/70 uppercase">
                              Pool {pool.name}
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
