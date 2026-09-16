<?php

namespace App\Services\Running;

/**
 * Race times are durations, and organizers type them the way a stopwatch
 * shows them: "48:12", "3:41:07", sometimes "1:02:03.5" off a timing export.
 * Everything is stored as whole seconds, so parsing lives in one place.
 */
class RaceTime
{
    /** Returns whole seconds, or null when the input is not a duration at all. */
    public static function parse(?string $input): ?int
    {
        $trimmed = trim((string) $input);

        if ($trimmed === '') {
            return null;
        }

        // A bare number is already a count of seconds — what most timing
        // systems export when they don't format the column.
        if (preg_match('/^\d+(\.\d+)?$/', $trimmed) === 1) {
            return (int) floor((float) $trimmed);
        }

        if (preg_match('/^\d{1,2}(:\d{1,2}){1,2}(\.\d+)?$/', $trimmed) !== 1) {
            return null;
        }

        $seconds = array_reduce(
            explode(':', $trimmed),
            static fn (float $total, string $part) => $total * 60 + (float) $part,
            0.0
        );

        return (int) floor($seconds);
    }

    /** "3:41:07" / "48:12" — the inverse of {@see self::parse()}. */
    public static function format(?int $seconds): string
    {
        if ($seconds === null) {
            return '';
        }

        $hours = intdiv($seconds, 3600);
        $minutes = intdiv($seconds % 3600, 60);
        $secs = $seconds % 60;

        return $hours > 0
            ? sprintf('%d:%02d:%02d', $hours, $minutes, $secs)
            : sprintf('%d:%02d', $minutes, $secs);
    }
}
