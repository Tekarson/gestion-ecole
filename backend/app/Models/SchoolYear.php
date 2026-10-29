<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SchoolYear extends Model
{
    protected $fillable = [
        'name',
        'starts_on',
        'ends_on',
        'is_active',
        'tariffs',
    ];

    protected $casts = [
        'id' => 'string',
        'starts_on' => 'date',
        'ends_on' => 'date',
        'is_active' => 'boolean',
        'tariffs' => 'array',
    ];

    public static function active(): ?self
    {
        return static::where('is_active', true)->first();
    }
}
