<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    if (file_exists(public_path('index.html'))) {
        return response()->file(public_path('index.html'));
    }

    return response()->json([
        'app' => 'NTSHIK API',
        'description' => 'API de gestion des frais scolaires du Complexe Scolaire Bel Avenir.',
        'version' => 'v1',
    ]);
});

Route::get('/up', function () {
    return response()->json(['status' => 'ok']);
});

Route::get('/{any}', function (string $any) {
    if (str_starts_with($any, 'api')) {
        abort(404);
    }

    return response()->file(public_path('index.html'));
})->where('any', '.*');