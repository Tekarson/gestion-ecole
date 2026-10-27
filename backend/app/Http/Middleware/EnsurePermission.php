<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class EnsurePermission
{
    public function handle(Request $request, Closure $next, string $module, string $action = 'read'): mixed
    {
        $user = $request->user() ?? Auth::user();

        if (! $user || ! $user->canAccess($module, $action)) {
            throw new AccessDeniedHttpException('Accès refusé.');
        }

        return $next($request);
    }
}