<?php

namespace App\Http\Middleware;

use App\Models\SchoolYear;
use App\Support\SchoolContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Consultation d'une autre année (en-tête `X-School-Year`) : les lectures
 * affichent les chiffres de cette année ; les écritures restent sur l'année active.
 */
class ViewSchoolYear
{
    public function handle(Request $request, Closure $next): Response
    {
        $year = $request->header('X-School-Year');

        if ($request->isMethod('GET') && is_string($year) && $year !== '' && SchoolYear::where('name', $year)->exists()) {
            SchoolContext::setViewYear($year);
        }

        return $next($request);
    }
}
