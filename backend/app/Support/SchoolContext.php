<?php

namespace App\Support;

use App\Models\SchoolYear;
use App\Models\Setting;
use Illuminate\Support\Facades\Schema;

/**
 * Runtime school context (active school year, current term) that admin users
 * can edit from the Settings screen. Falls back to the configured env values
 * when nothing is stored yet.
 */
class SchoolContext
{
    /** Clé du mémo (dans le conteneur, donc propre à chaque requête). */
    private const MEMO = 'school.active_year';

    public static function activeYear(): string
    {
        if (app()->bound(self::MEMO)) {
            return app(self::MEMO);
        }

        $year = null;
        if (Schema::hasTable('school_years')) {
            $year = SchoolYear::where('is_active', true)->value('name');
        }
        $year ??= Setting::get('school_year');
        $year = $year !== null ? (string) $year : (string) config('services.school.year');

        app()->instance(self::MEMO, $year);

        return $year;
    }

    /** À appeler quand l'année active change. */
    public static function forget(): void
    {
        app()->forgetInstance(self::MEMO);
    }

    public static function currentTerm(): int
    {
        $term = Setting::get('current_term');

        return $term !== null ? (int) $term : 1;
    }
}