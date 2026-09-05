<?php

namespace App\Concerns;

/**
 * A short code printed on an ID card and shown again on the page that card's
 * QR opens, so whoever is working the door can check that the badge in their
 * hand is the one the record describes.
 *
 * It is not a secret and it is not what authenticates the scan — the token in
 * the URL does that. This exists so a card that was copied, altered or printed
 * from a stale sheet fails an eyeball comparison. Collisions between two
 * holders are therefore harmless: a card's code is only ever compared against
 * its own record.
 *
 * Used by both cardholder kinds — registrants and attendees — so the code on a
 * guest badge reads and behaves exactly like the code on a registrant's.
 */
trait HasVerificationCode
{
    /**
     * Digits and capitals with the pairs a person misreads off a printed badge
     * removed — 0/O, 1/I/L. The reader is glancing from arm's length, so an
     * ambiguous glyph costs more than the combinations it buys.
     */
    private const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

    public static function generateVerificationCode(): string
    {
        $pick = fn (int $length) => collect(range(1, $length))
            ->map(fn () => self::CODE_ALPHABET[random_int(0, strlen(self::CODE_ALPHABET) - 1)])
            ->implode('');

        // Grouped, because two three-character runs are far easier to compare
        // by eye than one run of six.
        return $pick(3).'-'.$pick(3);
    }

    /** Issues a fresh code, which stops every card printed before now verifying. */
    public function rotateVerificationCode(): string
    {
        $code = self::generateVerificationCode();

        $this->forceFill(['verification_code' => $code])->save();

        return $code;
    }
}
