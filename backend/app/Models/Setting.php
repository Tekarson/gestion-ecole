<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = [
        'key',
        'value',
    ];

    protected $casts = [
        'id' => 'string',
    ];

    /**
     * Read a stored setting. Values are stored as JSON (arrays) or as plain
     * strings (e.g. "2026-2027"); JSON strings are decoded back to arrays.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        $setting = static::where('key', $key)->first();

        if (! $setting) {
            return $default;
        }

        $value = $setting->value;

        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if ($decoded !== null || $value === 'null') {
                $value = $decoded;
            }
        }

        return $value ?? $default;
    }

    /**
     * @param  array<string, mixed>|string|int|float  $value
     */
    public static function set(string $key, array|string|int|float $value): void
    {
        $stored = json_encode($value, JSON_UNESCAPED_UNICODE);

        static::updateOrCreate(['key' => $key], ['value' => $stored]);

        // L'année active est portée par la table des années académiques.
        if ($key === 'school_year' && is_string($value) && $value !== '' && \Illuminate\Support\Facades\Schema::hasTable('school_years')) {
            SchoolYear::query()->where('name', '!=', $value)->update(['is_active' => false]);
            SchoolYear::updateOrCreate(['name' => $value], ['is_active' => true]);
            \App\Support\SchoolContext::forget();
        }
    }
}