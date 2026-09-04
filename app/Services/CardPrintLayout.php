<?php

namespace App\Services;

/**
 * Works out how many ID cards fit on one sheet of paper, and where each one
 * sits. Everything here is in millimetres, measured from the top-left corner
 * of the sheet, so the print stylesheet can drop the numbers straight into
 * `mm` CSS values and get physically accurate cards out of the printer.
 *
 * The interesting part is that mixing orientations fits more cards than a
 * plain grid does: a B3 card (91 x 113 mm) only grids 2 x 2 = 4 per A4, but
 * standing two upright down the left and three on their side down the right
 * fits 5 — which is the layout the reference artwork uses.
 */
final class CardPrintLayout
{
    /** Sheet sizes a job can be printed on. */
    public const PAPERS = [
        'a4' => ['label' => 'A4', 'width' => 210.0, 'height' => 297.0],
    ];

    /**
     * Physical card sizes. Only B3 for now — adding a size here is enough to
     * make it available everywhere, the packing is worked out from scratch.
     *
     * B3's numbers come from the organizer's reference artwork: cards drawn
     * 1080 x 1334 at 300 DPI, i.e. 91.4 x 112.9 mm, rounded to the whole
     * millimetres badge holders are actually sold in.
     */
    public const CARD_SIZES = [
        'b3' => ['label' => 'B3', 'width' => 91.0, 'height' => 113.0],
    ];

    /** Guards against `floor()` shaving a card off when a division lands on a whole number. */
    private const EPSILON = 1e-6;

    /**
     * Every card-size/paper combination, with its solved layout attached.
     *
     * @return list<array<string, mixed>>
     */
    public static function options(): array
    {
        $options = [];

        foreach (self::CARD_SIZES as $cardKey => $card) {
            foreach (self::PAPERS as $paperKey => $paper) {
                $slots = self::pack($paper['width'], $paper['height'], $card['width'], $card['height']);

                if ($slots === []) {
                    continue;
                }

                $options[] = [
                    'key' => "{$cardKey}-{$paperKey}",
                    'label' => "{$card['label']} on {$paper['label']}",
                    'hint' => sprintf(
                        '%s x %s mm · %d per %s sheet',
                        self::trim($card['width']),
                        self::trim($card['height']),
                        count($slots),
                        $paper['label'],
                    ),
                    'card' => ['key' => $cardKey] + $card,
                    'paper' => ['key' => $paperKey] + $paper,
                    'slots' => $slots,
                    'per_sheet' => count($slots),
                ];
            }
        }

        return $options;
    }

    /**
     * Solve the arrangement for one card size on one sheet.
     *
     * @return list<array{x: float, y: float, rotated: bool}>
     */
    public static function pack(float $paperW, float $paperH, float $cardW, float $cardH): array
    {
        if ($cardW <= 0 || $cardH <= 0) {
            return [];
        }

        $best = [];

        // Split the sheet vertically: k columns of upright cards on the left,
        // then as many columns of sideways cards as the leftover width takes.
        // k = 0 and k = the maximum also produce the two single-orientation
        // grids, so this loop covers those without a special case.
        for ($k = 0; $k <= self::fit($paperW, $cardW); $k++) {
            $best = self::better($best, array_merge(
                self::grid(0.0, 0.0, $k, self::fit($paperH, $cardH), $cardW, $cardH, false),
                self::grid($k * $cardW, 0.0, self::fit($paperW - $k * $cardW, $cardH), self::fit($paperH, $cardW), $cardH, $cardW, true),
            ));
        }

        // Same idea, split the other way: k rows of upright cards on top.
        for ($k = 0; $k <= self::fit($paperH, $cardH); $k++) {
            $best = self::better($best, array_merge(
                self::grid(0.0, 0.0, self::fit($paperW, $cardW), $k, $cardW, $cardH, false),
                self::grid(0.0, $k * $cardH, self::fit($paperW, $cardH), self::fit($paperH - $k * $cardH, $cardW), $cardH, $cardW, true),
            ));
        }

        return self::centered($best, $paperW, $paperH, $cardW, $cardH);
    }

    /** How many times $size fits into $available. */
    private static function fit(float $available, float $size): int
    {
        return max(0, (int) floor(($available + self::EPSILON) / $size));
    }

    /**
     * @param  list<array{x: float, y: float, rotated: bool}>  $current
     * @param  list<array{x: float, y: float, rotated: bool}>  $candidate
     * @return list<array{x: float, y: float, rotated: bool}>
     */
    private static function better(array $current, array $candidate): array
    {
        return count($candidate) > count($current) ? $candidate : $current;
    }

    /**
     * A block of $cols x $rows slots laid edge to edge from ($x0, $y0).
     * $slotW/$slotH are the footprint on the page, so they are already swapped
     * for a rotated block.
     *
     * @return list<array{x: float, y: float, rotated: bool}>
     */
    private static function grid(float $x0, float $y0, int $cols, int $rows, float $slotW, float $slotH, bool $rotated): array
    {
        $slots = [];

        for ($row = 0; $row < $rows; $row++) {
            for ($col = 0; $col < $cols; $col++) {
                $slots[] = [
                    'x' => $x0 + $col * $slotW,
                    'y' => $y0 + $row * $slotH,
                    'rotated' => $rotated,
                ];
            }
        }

        return $slots;
    }

    /**
     * Nudge the whole arrangement so the leftover paper is shared evenly
     * around it, rather than all of it ending up on the right and bottom.
     *
     * @param  list<array{x: float, y: float, rotated: bool}>  $slots
     * @return list<array{x: float, y: float, rotated: bool}>
     */
    private static function centered(array $slots, float $paperW, float $paperH, float $cardW, float $cardH): array
    {
        if ($slots === []) {
            return [];
        }

        $usedW = 0.0;
        $usedH = 0.0;

        foreach ($slots as $slot) {
            $usedW = max($usedW, $slot['x'] + ($slot['rotated'] ? $cardH : $cardW));
            $usedH = max($usedH, $slot['y'] + ($slot['rotated'] ? $cardW : $cardH));
        }

        $dx = ($paperW - $usedW) / 2;
        $dy = ($paperH - $usedH) / 2;

        return array_map(fn (array $slot) => [
            'x' => round($slot['x'] + $dx, 3),
            'y' => round($slot['y'] + $dy, 3),
            'rotated' => $slot['rotated'],
        ], $slots);
    }

    /** 91.0 reads better as "91" in a hint string. */
    private static function trim(float $value): string
    {
        return rtrim(rtrim(number_format($value, 1, '.', ''), '0'), '.');
    }
}
