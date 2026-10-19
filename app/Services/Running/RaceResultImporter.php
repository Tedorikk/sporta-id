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
    private const MAX_ROWS = 10000;

    /** Accepted spellings of each column, so an export rarely needs editing first. */
    private const COLUMNS = [
        'bib' => ['bib', 'bib_number', 'bibnumber', 'no', 'number', 'nomor'],
        'time' => ['time', 'finish_time', 'finishtime', 'duration', 'chip_time', 'chiptime', 'net_time', 'waktu'],
        'status' => ['status', 'result'],
    ];

    /**
     * @return array{updated: int, skipped: int, errors: array<int, string>, fatal_error: string|null}
     */
    public function import(RunningEventCategory $category, UploadedFile $file): array
    {
        $handle = fopen($file->getRealPath(), 'r');

        if ($handle === false) {
            return $this->failure('The CSV file could not be read. Please choose it again and retry.');
        }

        $preamble = fread($handle, 4);

        if ($preamble === false) {
            fclose($handle);

            return $this->failure('The CSV file could not be read. Please choose it again and retry.');
        }

        if ($this->isUtf16($preamble)) {
            fclose($handle);

            return $this->failure('UTF-16 CSV files are not supported. Save or export the file as UTF-8 CSV and try again.');
        }

        rewind($handle);
        $firstLine = fgets($handle);

        if ($firstLine === false || trim($firstLine, "\xEF\xBB\xBF\x00\t\n\r ") === '') {
            fclose($handle);

            return $this->failure('The CSV file is empty.');
        }

        $delimiter = $this->detectDelimiter($firstLine);
        rewind($handle);

        // escape: '' keeps the reader RFC 4180-compliant and silences PHP 8.4's
        // deprecation of the implicit escape character.
        $header = fgetcsv($handle, separator: $delimiter, escape: '');

        if ($header === false) {
            fclose($handle);

            return $this->failure('The CSV file is empty or could not be read.');
        }

        $header[0] = preg_replace('/^\xEF\xBB\xBF/', '', (string) ($header[0] ?? ''));
        $columns = $this->mapColumns($header);

        if (! isset($columns['bib'], $columns['time'])) {
            fclose($handle);

            return $this->failure('The CSV file needs a "bib" column and a "time" column.');
        }

        $dataRows = 0;

        while (($row = fgetcsv($handle, separator: $delimiter, escape: '')) !== false) {
            if ($this->isBlank($row)) {
                continue;
            }

            $dataRows++;

            if ($dataRows > self::MAX_ROWS) {
                fclose($handle);

                return $this->failure('The CSV file has more than 10,000 data rows. Split it into smaller files and import them separately.');
            }
        }

        if ($dataRows === 0) {
            fclose($handle);

            return $this->failure('The CSV file does not contain any result rows.');
        }

        rewind($handle);
        fgetcsv($handle, separator: $delimiter, escape: '');

        $participantsByBib = $category->participants()
            ->whereNotNull('bib_number')
            ->get()
            ->groupBy(fn (RaceParticipant $participant) => Str::lower(trim($participant->bib_number)));

        $updated = 0;
        $skipped = 0;
        $errors = [];
        $line = 1;
        $seenBibs = [];

        while (($row = fgetcsv($handle, separator: $delimiter, escape: '')) !== false) {
            $line++;

            if ($this->isBlank($row)) {
                continue;
            }

            $bib = trim((string) ($row[$columns['bib']] ?? ''));
            $normalizedBib = Str::lower($bib);
            $matchingParticipants = $participantsByBib->get($normalizedBib);

            if ($bib === '') {
                $skipped++;
                $errors[] = "Line {$line}: the bib is empty.";

                continue;
            }

            if (isset($seenBibs[$normalizedBib])) {
                $skipped++;
                $errors[] = "Line {$line}: bib \"{$bib}\" appears more than once in this file; only the first row was used.";

                continue;
            }

            $seenBibs[$normalizedBib] = true;

            if ($matchingParticipants === null || $matchingParticipants->isEmpty()) {
                $skipped++;
                $errors[] = "Line {$line}: no runner with bib \"{$bib}\" on this distance.";

                continue;
            }

            if ($matchingParticipants->count() > 1) {
                $skipped++;
                $errors[] = "Line {$line}: bib \"{$bib}\" belongs to more than one runner; fix the duplicate bib before importing.";

                continue;
            }

            $participant = $matchingParticipants->first();
            $status = $this->readStatus($row, $columns);

            if ($status === null) {
                $rawStatus = trim((string) ($row[$columns['status']] ?? ''));
                $skipped++;
                $errors[] = "Line {$line}: \"{$rawStatus}\" is not a supported status. Use FINISHED, DNF, DNS, DQ, or DSQ.";

                continue;
            }

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
            'fatal_error' => null,
        ];
    }

    /**
     * @return array{updated: int, skipped: int, errors: array<int, string>, fatal_error: string}
     */
    private function failure(string $message): array
    {
        return ['updated' => 0, 'skipped' => 0, 'errors' => [], 'fatal_error' => $message];
    }

    private function isUtf16(string $preamble): bool
    {
        return str_starts_with($preamble, "\xFF\xFE")
            || str_starts_with($preamble, "\xFE\xFF")
            || str_contains($preamble, "\x00");
    }

    private function detectDelimiter(string $firstLine): string
    {
        $delimiters = [',', ';', "\t"];
        $bestDelimiter = ',';
        $mostColumns = 1;

        foreach ($delimiters as $delimiter) {
            $columnCount = count(str_getcsv($firstLine, separator: $delimiter, escape: ''));

            if ($columnCount > $mostColumns) {
                $bestDelimiter = $delimiter;
                $mostColumns = $columnCount;
            }
        }

        return $bestDelimiter;
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
    private function readStatus(array $row, array $columns): ?string
    {
        $raw = isset($columns['status'])
            ? Str::lower(trim((string) ($row[$columns['status']] ?? '')))
            : '';

        return match ($raw) {
            '', 'finished', 'finish', 'finisher' => RaceParticipant::STATUS_FINISHED,
            'dnf', 'did not finish' => RaceParticipant::STATUS_DNF,
            'dns', 'did not start' => RaceParticipant::STATUS_DNS,
            'dq', 'dsq', 'disqualified' => RaceParticipant::STATUS_DISQUALIFIED,
            default => null,
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
