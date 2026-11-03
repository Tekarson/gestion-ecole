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

    /** Clé de l'année consultée (lecture seule), propre à la requête. */
    private const VIEW = 'school.view_year';

    /**
     * Année dont on affiche les chiffres : l'année active, ou une autre année
     * choisie dans l'en-tête (consultation, requêtes GET uniquement).
     */
    public static function viewYear(): string
    {
        return app()->bound(self::VIEW) ? (string) app(self::VIEW) : self::activeYear();
    }

    public static function setViewYear(?string $year): void
    {
        if ($year === null || $year === self::activeYear()) {
            app()->forgetInstance(self::VIEW);

            return;
        }
        app()->instance(self::VIEW, $year);
    }

    /** Vrai quand on consulte une autre année que l'année active. */
    public static function viewingArchive(): bool
    {
        return self::viewYear() !== self::activeYear();
    }

    public static function currentTerm(): int
    {
        $term = Setting::get('current_term');

        return $term !== null ? (int) $term : 1;
    }
}