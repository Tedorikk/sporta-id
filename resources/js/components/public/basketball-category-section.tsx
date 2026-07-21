import { MatchRow } from './match-row';
import { StandingsTable } from './standings-table';
import type { PublicEventCategory } from '@/types/public-event-category';

const ROUND_ORDER = ['round_of_16', 'quarterfinal', 'semifinal', 'final'];

const ROUND_LABELS: Record<string, string> = {
    round_of_16: 'Round of 16',
    quarterfinal: 'Quarterfinal',
    semifinal: 'Semifinal',
    final: 'Final',
};

export function BasketballCategorySection({ category }: { category: PublicEventCategory }) {
    const groupMatches = category.matches.filter((match) => !match.round || match.round === 'group');
    const knockoutMatches = category.matches.filter((match) => match.round && match.round !== 'group');

    const knockoutByRound = ROUND_ORDER.map((round) => ({
        round,
        matches: knockoutMatches.filter((match) => match.round === round),
    })).filter((group) => group.matches.length > 0);

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

            {!hasSchedule && <p className="text-sm text-white/40">Schedule will be posted soon.</p>}

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

            {knockoutByRound.length > 0 && (
                <div className="flex flex-col gap-4">
                    {knockoutByRound.map(({ round, matches }) => (
                        <div key={round} className="flex flex-col gap-2">
                            <h4 className="text-sm font-bold tracking-wide text-white/70 uppercase">{ROUND_LABELS[round]}</h4>
                            {matches.map((match) => (
                                <MatchRow key={match.id} match={match} />
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
