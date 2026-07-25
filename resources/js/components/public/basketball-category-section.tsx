import { BracketTree } from './bracket-tree';
import { MatchesCalendar } from './matches-calendar';
import { MatchRow } from './match-row';
import { StandingsTable } from './standings-table';
import { TeamsGrid } from './teams-grid';
import type { PublicEventCategory } from '@/types/public-event-category';

export function BasketballCategorySection({ category }: { category: PublicEventCategory }) {
    const groupMatches = category.matches.filter((match) => !match.round || match.round === 'group');
    const ungroupedMatches = groupMatches.filter((match) => match.pool_id === null);

    const hasSchedule = category.pools.length > 0 || category.matches.length > 0;

    return (
        <div className="flex flex-col gap-6 rounded-2xl border-2 border-white/15 bg-white/5 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xl font-black tracking-tight uppercase">{category.name}</h3>
                <div className="flex flex-wrap gap-3 text-xs text-white/60">
                    {category.price && <span>Rp {Number(category.price).toLocaleString('id-ID')}</span>}
                    {category.quota !== null && <span>Quota: {category.quota} teams</span>}
                </div>
            </div>

            {!hasSchedule && category.teams.length === 0 && (
                <p className="text-sm text-white/40">Schedule will be posted soon.</p>
            )}

            {category.pools.length > 0
                ? category.pools.map((pool) => {
                      const poolMatches = groupMatches.filter((match) => match.pool_id === pool.id);
                      const standings = category.standings[`pool_${pool.id}`] ?? [];

                      return (
                          <div key={pool.id} className="flex flex-col gap-3">
                              <h4 className="text-sm font-bold tracking-wide text-white/70 uppercase">Pool {pool.name}</h4>
                              <StandingsTable standings={standings} teams={pool.teams} />
                              {poolMatches.length > 0 && (
                                  <div className="flex flex-col gap-2">
                                      {poolMatches.map((match) => (
                                          <MatchRow key={match.id} match={match} />
                                      ))}
                                  </div>
                              )}
                          </div>
                      );
                  })
                : groupMatches.length > 0 && (
                      <div className="flex flex-col gap-3">
                          <StandingsTable standings={category.standings.overall ?? []} teams={category.teams} />
                          <div className="flex flex-col gap-2">
                              {groupMatches.map((match) => (
                                  <MatchRow key={match.id} match={match} />
                              ))}
                          </div>
                      </div>
                  )}

            {category.pools.length > 0 && ungroupedMatches.length > 0 && (
                <div className="flex flex-col gap-3">
                    <h4 className="text-sm font-bold tracking-wide text-white/70 uppercase">Other Matches</h4>
                    <div className="flex flex-col gap-2">
                        {ungroupedMatches.map((match) => (
                            <MatchRow key={match.id} match={match} />
                        ))}
                    </div>
                </div>
            )}

            <BracketTree matches={category.matches} />
            <MatchesCalendar matches={category.matches} />
            <TeamsGrid teams={category.teams} />
        </div>
    );
}
