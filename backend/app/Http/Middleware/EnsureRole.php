<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class EnsureRole
{
    public function handle(Request $request, Closure $next, string $roles): mixed
    {
        $user = $request->user() ?? Auth::user();

        if (! $user) {
            throw new AccessDeniedHttpException('Accès refusé.');
        }

        $allowed = array_filter(array_map('trim', explode(',', $roles)));

        // The superadmin always belongs to the back-office group.
        $backOffice = in_array('admin', $allowed, true) && $user->isSuperAdmin();

        if (! $backOffice && (! in_array($user->role, $allowed, true))) {
            throw new AccessDeniedHttpException('Accès refusé.');
        }

        return $next($request);
    }
}