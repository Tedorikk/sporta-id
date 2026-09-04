<?php

use App\Models\CardTemplate;
use App\Services\CardPrintLayout;

test('a B3 card packs five to an A4 sheet by mixing orientations', function () {
    $slots = CardPrintLayout::pack(210, 297, 91, 113);

    expect($slots)->toHaveCount(5);

    $upright = array_values(array_filter($slots, fn (array $slot) => ! $slot['rotated']));
    $rotated = array_values(array_filter($slots, fn (array $slot) => $slot['rotated']));

    // Two standing down one side, three on their side down the other — a plain
    // grid of the same card only manages four.
    expect($upright)->toHaveCount(2)
        ->and($rotated)->toHaveCount(3);
});

test('every slot stays inside the sheet', function () {
    $slots = CardPrintLayout::pack(210, 297, 91, 113);

    foreach ($slots as $slot) {
        $width = $slot['rotated'] ? 113 : 91;
        $height = $slot['rotated'] ? 91 : 113;

        expect($slot['x'])->toBeGreaterThanOrEqual(0)
            ->and($slot['y'])->toBeGreaterThanOrEqual(0)
            ->and($slot['x'] + $width)->toBeLessThanOrEqual(210)
            ->and($slot['y'] + $height)->toBeLessThanOrEqual(297);
    }
});

test('no two slots overlap', function () {
    $slots = CardPrintLayout::pack(210, 297, 91, 113);

    foreach ($slots as $i => $a) {
        foreach (array_slice($slots, $i + 1) as $b) {
            $aRight = $a['x'] + ($a['rotated'] ? 113 : 91);
            $aBottom = $a['y'] + ($a['rotated'] ? 91 : 113);
            $bRight = $b['x'] + ($b['rotated'] ? 113 : 91);
            $bBottom = $b['y'] + ($b['rotated'] ? 91 : 113);

            $overlaps = $a['x'] < $bRight && $b['x'] < $aRight
                && $a['y'] < $bBottom && $b['y'] < $aBottom;

            expect($overlaps)->toBeFalse();
        }
    }
});

test('the arrangement is centred on the sheet', function () {
    $slots = CardPrintLayout::pack(210, 297, 91, 113);

    $left = min(array_column($slots, 'x'));
    $right = max(array_map(fn (array $slot) => $slot['x'] + ($slot['rotated'] ? 113 : 91), $slots));

    expect(round($left, 3))->toBe(round(210 - $right, 3));
});

test('a card that fills the sheet exactly still yields one slot', function () {
    expect(CardPrintLayout::pack(210, 297, 210, 297))->toHaveCount(1);
});

test('a card larger than the sheet yields nothing', function () {
    expect(CardPrintLayout::pack(210, 297, 400, 400))->toBeEmpty();
});

test('the B3 on A4 option advertises five per sheet', function () {
    $option = collect(CardPrintLayout::options())->firstWhere('key', 'b3-a4');

    expect($option)->not->toBeNull()
        ->and($option['per_sheet'])->toBe(5)
        ->and($option['hint'])->toBe('91 x 113 mm · 5 per A4 sheet')
        ->and($option['paper']['width'])->toBe(210.0)
        // The print page names the card size in its aspect-mismatch notice.
        ->and($option['card']['label'])->toBe('B3')
        ->and($option['card']['width'])->toBe(91.0);
});

test('the default registration card is shaped like a B3 card', function () {
    $card = CardPrintLayout::CARD_SIZES['b3'];
    $canvas = CardTemplate::fallbackTemplate(CardTemplate::SUBJECT_REGISTRATION)['canvas'];

    // Drift here is what makes a printed sheet letterbox, so the two shapes are
    // pinned together: the print page warns above a 0.01 difference in ratio.
    expect(abs($canvas['width'] / $canvas['height'] - $card['width'] / $card['height']))
        ->toBeLessThan(0.01);
});

test('attendee, player and team cards keep the original portrait default', function () {
    foreach (['attendee', 'player', 'team'] as $subject) {
        $canvas = CardTemplate::fallbackTemplate($subject)['canvas'];

        expect($canvas['width'])->toBe(380)
            ->and($canvas['height'])->toBe(560);
    }
});
