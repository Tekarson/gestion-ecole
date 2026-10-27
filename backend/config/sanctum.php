<?php

return [

    'mode' => env('SANCTUM_MODE', 'api'),

    'expiration' => null,

    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),

    'stateful' => array_values(array_filter(
        explode(',', env('SANCTUM_STATEFUL_DOMAINS', sprintf('%s%s', 'localhost,localhost:3000,127.0.0.1,127.0.0.1:8000,::1', env('APP_ENV') === 'local' ? ',localhost:5173' : ''))),
        fn (string $domain) => trim($domain) !== '',
    )),

    'guard' => ['web'],

    'middleware' => [
        'authenticate_session' => Laravel\Sanctum\Http\Middleware\AuthenticateSession::class,
        'encrypt_cookies' => Illuminate\Cookie\Middleware\EncryptCookies::class,
        'validate_csrf_token' => Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class,
    ],

];