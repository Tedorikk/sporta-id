import type { BasketballEventCategory } from '@/types/basketball-event-category';
import type { Pool } from '@/types/pool';
import type { Team } from '@/types/team';

export interface CategoryWithFixtures extends BasketballEventCategory {
    pools: Pool[];
    teams: Team[];
}
