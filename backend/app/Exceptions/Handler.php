<?php

namespace App\Exceptions;

use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;
use Throwable;

class Handler extends ExceptionHandler
{
    public function register(): void
    {
        $this->renderable(function (NotFoundHttpException $e, $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Introuvable.'], 404);
            }
        });

        $this->renderable(function (AccessDeniedHttpException $e, $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Accès refusé.'], 403);
            }
        });

        $this->renderable(function (AuthenticationException $e, $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Non authentifié.'], 401);
            }
        });

        $this->renderable(function (MethodNotAllowedHttpException $e, $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Méthode non autorisée.'], 405);
            }
        });

        $this->renderable(function (TooManyRequestsHttpException $e, $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Trop de requêtes. Veuillez réessayer dans un instant.'], 429);
            }
        });

        $this->renderable(function (Throwable $e, $request) {
            if (
                ($request->expectsJson() || $request->is('api/*'))
                && $e instanceof HttpExceptionInterface
                && $e->getStatusCode() >= 500
            ) {
                return response()->json(['message' => 'Erreur interne du serveur.'], 500);
            }
        });
    }
}