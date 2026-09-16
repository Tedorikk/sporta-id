<?php

use Illuminate\Support\Facades\DB;

/**
 * MySQL rejects any identifier longer than 64 characters, and Laravel derives
 * index names from the table and every column in them — so a long table name
 * plus two long columns silently exceeds the limit. The test suite runs on
 * SQLite, which has no such limit, so a migration can pass here and fail on
 * the production database. This measures the names instead of trusting them.
 */
test('every generated index name fits within the MySQL identifier limit', function () {
    $overLimit = collect(DB::select("select name, tbl_name from sqlite_master where type = 'index' and name not like 'sqlite_%'"))
        ->filter(fn (object $index) => strlen($index->name) > 64)
        ->map(fn (object $index) => "{$index->tbl_name}: {$index->name} (".strlen($index->name).' chars)')
        ->values()
        ->all();

    expect($overLimit)->toBe([]);
});

test('every table name leaves room for the index names Laravel derives from it', function () {
    $tooLong = collect(DB::select("select name from sqlite_master where type = 'table' and name not like 'sqlite_%'"))
        ->filter(fn (object $table) => strlen($table->name) > 64)
        ->pluck('name')
        ->all();

    expect($tooLong)->toBe([]);
});
