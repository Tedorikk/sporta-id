import type { Team } from "./team"

export interface Pool {
    id: number,
    name: string,
    event_id: number,
    teams: Team[]
}
