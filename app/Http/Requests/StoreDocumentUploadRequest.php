<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDocumentUploadRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Adjust if only certain roles/auth states should be able to upload
        return true;
    }

    public function rules(): array
    {
        return [
            'document' => [
                'required',
                'file',
                'mimes:pdf,doc,docx',
                'max:10240', // KB (10MB)
            ],
        ];
    }
}
