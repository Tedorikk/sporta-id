<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreImageUploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Adjust if only certain roles/auth states should be able to upload
        return true;
    }

    public function rules(): array
    {
        return [
            'image' => [
                'required',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:5120', // KB (5MB)
            ],
        ];
    }
}
