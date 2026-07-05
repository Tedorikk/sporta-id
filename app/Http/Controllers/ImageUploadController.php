<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreImageUploadRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ImageUploadController extends Controller
{
    /**
     * Directory (within the "public" disk) where uploads are stored.
     * Change per use case, or accept it as a request param if you reuse
     * this controller for more than one kind of upload.
     */
    protected string $directory = 'uploads';

    /**
     * Store an uploaded image and return its public URL.
     */
    public function store(StoreImageUploadRequest $request): JsonResponse
    {
        $file = $request->file('image');

        $filename = Str::uuid().'.'.$file->getClientOriginalExtension();

        $path = $file->storeAs($this->directory, $filename, 'public');

        return response()->json([
            'path' => $path,
            'url' => Storage::disk('public')->url($path),
        ], 201);
    }

    /**
     * Delete a previously uploaded image, e.g. when the user removes it
     * from the form before submitting, or replaces it with another one.
     */
    public function destroy(Request $request): JsonResponse
    {
        $request->validate([
            'path' => ['required', 'string'],
        ]);

        $path = $request->string('path')->toString();

        // Guard against deleting anything outside the intended directory.
        if (! Str::startsWith($path, $this->directory.'/')) {
            return response()->json(['message' => 'Invalid path.'], 422);
        }

        if (Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }

        return response()->json(['message' => 'Deleted.']);
    }
}
