<?php

namespace App\Support;

use App\Models\Setting;

/**
 * Runtime school context (active school year, current term) that admin users
 * can edit from the Settings screen. Falls back to the configured env values
 * when nothing is stored yet.
 */
class SchoolContext
{
    public static function activeYear(): string
    {
        $year = Setting::get('school_year');

        return $year !== null ? (string) $year : (string) config('services.school.year');
    }

    public static function currentTerm(): int
    {
        $term = Setting::get('current_term');

        return $term !== null ? (int) $term : 1;
    }
}