import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PublicPageHeader } from '@/components/public/public-page-header';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useForceLightMode } from '@/hooks/use-force-light-mode';
import { playerRoleLabel } from '@/types/player';
import type { PlayerRole } from '@/types/player';

interface LookupEvent {
    id: number;
    name: string;
}

interface LookupTeam {
    id: number;
    name: string;
}

interface LookupCategory {
    id: number;
    name: string;
    teams: LookupTeam[];
}

interface LookupPlayer {
    id: number;
    name: string;
    jersey_number: string | null;
    role: PlayerRole;
}

interface Props {
    events: LookupEvent[];
}

export default function FindId({ events }: Props) {
    useForceLightMode();

    const [eventId, setEventId] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [teamId, setTeamId] = useState('');
    const [playerId, setPlayerId] = useState('');

    const [categories, setCategories] = useState<LookupCategory[]>([]);
    const [players, setPlayers] = useState<LookupPlayer[]>([]);

    const [loadingCategories, setLoadingCategories] = useState(false);
    const [loadingPlayers, setLoadingPlayers] = useState(false);

    // Each select clears the ones below it in its own handler rather than in an
    // effect: resetting state from an effect re-renders a second time for every
    // change, and React flags it as a cascading render.
    const chooseEvent = (value: string) => {
        setEventId(value);
        setCategoryId('');
        setTeamId('');
        setPlayerId('');
        setCategories([]);
        setPlayers([]);
        setLoadingCategories(Boolean(value));
    };

    const chooseCategory = (value: string) => {
        setCategoryId(value);
        setTeamId('');
        setPlayerId('');
        setPlayers([]);
    };

    const chooseTeam = (value: string) => {
        setTeamId(value);
        setPlayerId('');
        setPlayers([]);
        setLoadingPlayers(Boolean(value));
    };

    // The effects now only talk to the API.
    useEffect(() => {
        if (!eventId) {
            return;
        }

        let cancelled = false;

        axios
            .get(`/find-id/events/${eventId}/categories`)
            .then(({ data }) => !cancelled && setCategories(data))
            .finally(() => !cancelled && setLoadingCategories(false));

        return () => {
            cancelled = true;
        };
    }, [eventId]);

    useEffect(() => {
        if (!teamId) {
            return;
        }

        let cancelled = false;

        axios
            .get(`/find-id/teams/${teamId}/players`)
            .then(({ data }) => !cancelled && setPlayers(data))
            .finally(() => !cancelled && setLoadingPlayers(false));

        return () => {
            cancelled = true;
        };
    }, [teamId]);

    const teamsForCategory = useMemo(() => {
        const category = categories.find((c) => String(c.id) === categoryId);

        return category?.teams ?? [];
    }, [categories, categoryId]);

    const handleReveal = () => {
        if (!playerId) {
            return;
        }

        router.visit(`/players/${playerId}/id-card`);
    };

    return (
        <>
            <Head title="Find My ID Card" />

            <div className="relative flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-10">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-red-600/10 blur-3xl" />
                    <div className="absolute -right-40 -bottom-40 h-96 w-96 rounded-full bg-red-900/20 blur-3xl" />
                </div>

                <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border-2 border-black bg-white shadow-2xl">
                    <PublicPageHeader
                        eyebrow="Player Lookup"
                        title="Find My ID Card"
                        subtitle="Select your event, category, team, and name to view your card"
                    />

                    <div className="flex flex-col gap-4 px-6 py-6">
                        <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-bold tracking-wide text-neutral-500 uppercase">
                                Event
                            </span>
                            <Select value={eventId} onValueChange={chooseEvent}>
                                <SelectTrigger className="w-full cursor-pointer border-2 border-black font-semibold focus-visible:ring-red-600">
                                    <SelectValue placeholder="Select an event" />
                                </SelectTrigger>
                                <SelectContent>
                                    {events.map((event) => (
                                        <SelectItem
                                            key={event.id}
                                            value={String(event.id)}
                                            className="cursor-pointer"
                                        >
                                            {event.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-bold tracking-wide text-neutral-500 uppercase">
                                Category
                            </span>
                            <Select
                                value={categoryId}
                                onValueChange={chooseCategory}
                                disabled={!eventId || loadingCategories}
                            >
                                <SelectTrigger className="w-full cursor-pointer border-2 border-black font-semibold focus-visible:ring-red-600">
                                    <SelectValue
                                        placeholder={
                                            !eventId
                                                ? 'Select an event first'
                                                : loadingCategories
                                                  ? 'Loading...'
                                                  : 'Select your category'
                                        }
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((category) => (
                                        <SelectItem
                                            key={category.id}
                                            value={String(category.id)}
                                            className="cursor-pointer"
                                        >
                                            {category.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-bold tracking-wide text-neutral-500 uppercase">
                                Team
                            </span>
                            <Select
                                value={teamId}
                                onValueChange={chooseTeam}
                                disabled={!categoryId}
                            >
                                <SelectTrigger className="w-full cursor-pointer border-2 border-black font-semibold focus-visible:ring-red-600">
                                    <SelectValue
                                        placeholder={
                                            !categoryId
                                                ? 'Select a category first'
                                                : 'Select your team'
                                        }
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {teamsForCategory.map((team) => (
                                        <SelectItem
                                            key={team.id}
                                            value={String(team.id)}
                                            className="cursor-pointer"
                                        >
                                            {team.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-bold tracking-wide text-neutral-500 uppercase">
                                Your Name
                            </span>
                            <Select
                                value={playerId}
                                onValueChange={setPlayerId}
                                disabled={!teamId || loadingPlayers}
                            >
                                <SelectTrigger className="w-full cursor-pointer border-2 border-black font-semibold focus-visible:ring-red-600">
                                    <SelectValue
                                        placeholder={
                                            !teamId
                                                ? 'Select a team first'
                                                : loadingPlayers
                                                  ? 'Loading...'
                                                  : 'Select your name'
                                        }
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {players.map((player) => (
                                        <SelectItem
                                            key={player.id}
                                            value={String(player.id)}
                                            className="cursor-pointer"
                                        >
                                            {player.role === 'player'
                                                ? `#${player.jersey_number} — ${player.name}`
                                                : `${playerRoleLabel(player.role)} — ${player.name}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            onClick={handleReveal}
                            disabled={!playerId}
                            className="mt-2 w-full cursor-pointer bg-red-600 font-bold tracking-wide text-white uppercase hover:bg-red-700"
                        >
                            <Search className="mr-2 h-4 w-4" />
                            View My ID Card
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}
