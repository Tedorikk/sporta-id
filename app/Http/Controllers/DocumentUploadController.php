<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreDocumentUploadRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DocumentUploadController extends Controller
{
    /**
     * Directory (within the "public" disk) where uploads are stored.
     */
    protected string $directory = 'uploads/documents';

    /**
     * Store an uploaded document (PDF/Word) and return its public URL.
     */
    public function store(StoreDocumentUploadRequest $request): JsonResponse
    {
        $file = $request->file('document');

        $filename = Str::uuid().'.'.$file->getClientOriginalExtension();

        $path = $file->storeAs($this->directory, $filename, 'public');

        return response()->json([
            'path' => $path,
            'url' => Storage::disk('public')->url($path),
            'name' => $file->getClientOriginalName(),
        ], 201);
    }

    /**
     * Delete a previously uploaded document, e.g. when the user removes it
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
