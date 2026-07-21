import type { GameMatch, StandingRow } from './game-match';
import type { Pool } from './pool';
import type { Team } from './team';

export interface PublicEventCategory {
    id: number;
    basketball_event_id: number;
    name: string;
    format: string;
    price: string | null;
    quota: number | null;
    pools: Pool[];
    teams: Team[];
    matches: GameMatch[];
    standings: Record<string, StandingRow[]>;
}
