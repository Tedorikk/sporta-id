<?php

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('a document can be uploaded and is stored on the public disk', function () {
    Storage::fake('public');

    $file = UploadedFile::fake()->create('resume.pdf', 500, 'application/pdf');

    $response = $this->post(route('public-upload.document'), ['document' => $file])
        ->assertCreated()
        ->assertJsonStructure(['path', 'url', 'name']);

    $path = $response->json('path');

    expect($path)->toStartWith('uploads/documents/')
        ->and($response->json('name'))->toBe('resume.pdf');

    Storage::disk('public')->assertExists($path);
});

test('a non pdf/doc/docx document is rejected', function () {
    Storage::fake('public');

    $file = UploadedFile::fake()->create('malware.exe', 100, 'application/x-msdownload');

    $this->post(route('public-upload.document'), ['document' => $file])
        ->assertSessionHasErrors('document');
});

test('an oversized document is rejected', function () {
    Storage::fake('public');

    $file = UploadedFile::fake()->create('big.pdf', 10241, 'application/pdf');

    $this->post(route('public-upload.document'), ['document' => $file])
        ->assertSessionHasErrors('document');
});

test('a stored document can be deleted', function () {
    Storage::fake('public');

    $file = UploadedFile::fake()->create('resume.pdf', 500, 'application/pdf');
    $path = $this->post(route('public-upload.document'), ['document' => $file])->json('path');

    Storage::disk('public')->assertExists($path);

    $this->delete(route('public-upload.document.destroy'), ['path' => $path])
        ->assertOk();

    Storage::disk('public')->assertMissing($path);
});

test('deleting a document outside the uploads directory is rejected', function () {
    Storage::fake('public');

    $this->delete(route('public-upload.document.destroy'), ['path' => 'other/secret.pdf'])
        ->assertStatus(422);
});
