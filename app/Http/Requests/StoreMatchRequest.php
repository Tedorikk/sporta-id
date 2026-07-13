<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'home_team_id' => ['required', Rule::exists('teams', 'id')],
            'away_team_id' => ['required', 'different:home_team_id', Rule::exists('teams', 'id')],
            'pool_id' => ['nullable', Rule::exists('pools', 'id')],
            'round' => ['required', 'string'],
            'match_number' => ['nullable', 'integer', 'min:1'],
            'scheduled_at' => ['nullable', 'date'],
        ];
    }
}