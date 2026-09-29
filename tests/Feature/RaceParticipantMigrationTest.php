<?php

use Illuminate\Support\Facades\Schema;

test('the category and registration uniqueness constraint has a portable name', function () {
    $indexes = collect(Schema::getIndexes('race_participants'));

    expect($indexes->pluck('name'))
        ->toContain('race_participants_category_registration_unique');
});
