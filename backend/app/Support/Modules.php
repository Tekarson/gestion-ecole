<?php

namespace App\Support;

/**
 * Fixed catalogue of back-office modules. The superadmin only assigns which of
 * these modules each admin user can access, together with per-module CRUD flags.
 */
class Modules
{
    public const ALL = [
        'dashboard' => 'Tableau de bord',
        'eleves' => 'Élèves',
        'paiements' => 'Paiements',
        'familles' => 'Familles',
        'journal' => 'Journal',
        'parametres' => 'Paramètres',
    ];

    public const ACTIONS = ['create', 'read', 'update', 'delete'];

    public static function keys(): array
    {
        return array_keys(self::ALL);
    }

    public static function labels(): array
    {
        return self::ALL;
    }

    public static function label(string $key): string
    {
        return self::ALL[$key] ?? $key;
    }

    public static function isValid(string $key): bool
    {
        return isset(self::ALL[$key]);
    }
}