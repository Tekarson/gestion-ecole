<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Student extends Model
{
    protected $fillable = [
        'first_name',
        'last_name',
        'postnom',
        'gender',
        'birth_date',
        'birth_place',
        'family_id',
        'class_id',
        'matricule',
        'photo',
        'is_exempt',
        'status',
    ];

    protected $casts = [
        'id' => 'string',
        'family_id' => 'string',
        'class_id' => 'string',
        'birth_date' => 'date',
        'is_exempt' => 'boolean',
    ];

    public function family(): BelongsTo
    {
        return $this->belongsTo(Family::class);
    }

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function getFullNameAttribute(): string
    {
        $parts = array_filter([$this->first_name, $this->last_name, $this->postnom], fn ($value) => $value !== null && $value !== '');

        return trim(implode(' ', $parts));
    }
}