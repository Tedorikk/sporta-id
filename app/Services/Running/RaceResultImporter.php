<?php

namespace App\Services\Running;

use App\Models\RaceParticipant;
use App\Models\RunningEventCategory;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

/**
 * Reads a results file exported from a timing system.
 *
 * A row that cannot be applied is reported rather than thrown: an unknown bib
 * halfway down a 2,000-row file must not cost the organizer the other 1,999
 * results, and they need to know which rows to chase.
 */
class RaceResultImporter
{
    /** Accepted spellings of each column, so an export rarely needs editing first. */
    private const COLUMNS = [
        'bib' => ['bib', 'bib_number', 'bibnumber', 'no', 'number', 'nomor'],
        'time' => ['time', 'finish_time', 'finishtime', 'duration', 'chip_time', 'chiptime', 'net_time', 'waktu'],
        'status' => ['status', 'result'],
    ];

    /**
     * @return array{updated: int, skipped: int, errors: array<int, string>}
     */
    public function import(RunningEventCategory $category, UploadedFile $file): array
    {
        $handle = fopen($file->getRealPath(), 'r');

        if ($handle === false) {
            return ['updated' => 0, 'skipped' => 0, 'errors' => ['The file could not be read.']];
        }

        $header = fgetcsv($handle);

        if ($header === false || $header === null) {
            fclose($handle);

            return ['updated' => 0, 'skipped' => 0, 'errors' => ['The file is empty.']];
        }

        $columns = $this->mapColumns($header);

        if (! isset($columns['bib'], $columns['time'])) {
            fclose($handle);

            return ['updated' => 0, 'skipped' => 0, 'errors' => [
                'The file needs a "bib" column and a "time" column.',
            ]];
        }

        $participants = $category->participants()
            ->whereNotNull('bib_number')
            ->get()
            ->keyBy(fn (RaceParticipant $participant) => Str::lower($participant->bib_number));

        $updated = 0;
        $skipped = 0;
        $errors = [];
        $line = 1;

        while (($row = fgetcsv($handle)) !== false) {
            $line++;

            if ($this->isBlank($row)) {
                continue;
            }

            $bib = trim((string) ($row[$columns['bib']] ?? ''));
            $participant = $participants->get(Str::lower($bib));

            if ($participant === null) {
                $skipped++;
                $errors[] = "Line {$line}: no runner with bib \"{$bib}\" on this distance.";

                continue;
            }

            $status = $this->readStatus($row, $columns);
            $seconds = RaceTime::parse($row[$columns['time']] ?? null);

            if ($status === RaceParticipant::STATUS_FINISHED && $seconds === null) {
                $skipped++;
                $errors[] = "Line {$line}: \"{$row[$columns['time']]}\" is not a finish time.";

                continue;
            }

            $participant->update([
                'status' => $status,
                // A runner who did not finish keeps no time, even if the
                // export carried one from a partial split.
                'duration_seconds' => $status === RaceParticipant::STATUS_FINISHED ? $seconds : null,
            ]);

            $updated++;
        }

        fclose($handle);

        return [
            'updated' => $updated,
            'skipped' => $skipped,
            // A full file of bad rows would otherwise produce a wall of text.
            'errors' => array_slice($errors, 0, 20),
        ];
    }

    /**
     * @param  array<int, string|null>  $header
     * @return array<string, int>
     */
    private function mapColumns(array $header): array
    {
        $columns = [];

        foreach ($header as $index => $label) {
            $normalized = Str::of((string) $label)->trim()->lower()->replace([' ', '-'], '_')->toString();

            foreach (self::COLUMNS as $name => $aliases) {
                if (! isset($columns[$name]) && in_array($normalized, $aliases, true)) {
                    $columns[$name] = $index;
                }
            }
        }

        return $columns;
    }

    /**
     * @param  array<int, string|null>  $row
     * @param  array<string, int>  $columns
     */
    private function readStatus(array $row, array $columns): string
    {
        $raw = isset($columns['status'])
            ? Str::lower(trim((string) ($row[$columns['status']] ?? '')))
            : '';

        return match ($raw) {
            'dnf' => RaceParticipant::STATUS_DNF,
            'dns' => RaceParticipant::STATUS_DNS,
            'dq', 'dsq', 'disqualified' => RaceParticipant::STATUS_DISQUALIFIED,
            default => RaceParticipant::STATUS_FINISHED,
        };
    }

    /**
     * @param  array<int, string|null>  $row
     */
    private function isBlank(array $row): bool
    {
        return count(array_filter($row, fn ($value) => trim((string) $value) !== '')) === 0;
    }
}
