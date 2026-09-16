<?php

namespace App\Services;

use App\Http\Controllers\GroupRegistrationController;
use App\Http\Controllers\RegistrationController;
use App\Models\RegistrationCategory;
use App\Models\RunningEventCategory;
use Illuminate\Validation\Rule;

/**
 * Validation rules for one dynamic form field's answer, by field type.
 * Shared between a solo registration ({@see RegistrationController})
 * and a group order's per-participant forms
 * ({@see GroupRegistrationController}), so both agree
 * on what a "valid select answer" or "valid phone number" means.
 */
class RegistrationFieldRules
{
    /**
     * @param  array<string, mixed>  $field
     * @return array<int, mixed>
     */
    public function forField(array $field): array
    {
        $rules = [($field['required'] ?? false) ? 'required' : 'nullable'];

        return array_merge($rules, match ($field['type']) {
            'number' => array_values(array_filter([
                'numeric',
                isset($field['min']) ? 'min:'.$field['min'] : null,
                isset($field['max']) ? 'max:'.$field['max'] : null,
            ])),
            'email' => ['email', 'max:255'],
            // Digits, spaces, and the common +/-/() separators — loose enough for
            // international formats while still rejecting free-text garbage.
            'phone' => ['string', 'max:50', 'regex:/^[0-9+\-\s()]{6,25}$/'],
            'date' => ['date'],
            'select', 'radio' => [Rule::in($field['options'] ?? [])],
            RegistrationCategory::GENDER_TYPE => [Rule::in(RunningEventCategory::GENDERS)],
            'checkbox' => ['boolean'],
            'rating' => ['integer', 'between:1,'.($field['max_rating'] ?? 5)],
            'file', 'document', 'signature' => ['url', 'max:255'],
            'textarea' => ['string', 'max:5000'],
            default => ['string', 'max:255'],
        });
    }
}
