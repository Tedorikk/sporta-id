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
                'bail',
                'required',
                'file',
                'mimes:jpg,jpeg,png,webp',
                'image',
                'max:5120',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'image.required' => __('Please choose an image to upload.'),
            'image.uploaded' => __('The image could not be uploaded. It may exceed the server upload limit of 5 MB.'),
            'image.image' => __('The selected file must be a valid image.'),
            'image.mimes' => __('The image must be a JPG, PNG, or WEBP file.'),
            'image.max' => __('The image must not be larger than 5 MB.'),
        ];
    }
}
