<?php

namespace App\Models;

use App\Support\SchoolContext;
use Illuminate\Database\Eloquent\Builder;
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
        'is_teacher_child',
        'is_entitled',
        'status',
        'school_year',
    ];

    protected $casts = [
        'id' => 'string',
        'family_id' => 'string',
        'class_id' => 'string',
        'birth_date' => 'date',
        'is_exempt' => 'boolean',
        'is_teacher_child' => 'boolean',
        'is_entitled' => 'boolean',
    ];

    protected static function booted(): void
    {
        // Un nouvel élève est inscrit pour l'année active…
        static::creating(function (Student $student) {
            $student->school_year ??= SchoolContext::activeYear();
        });

        // …et chaque inscription (ou réinscription) est historisée.
        static::saved(function (Student $student) {
            if ($student->school_year !== null && ($student->wasRecentlyCreated || $student->wasChanged(['school_year', 'class_id']))) {
                Enrollment::updateOrCreate(
                    ['student_id' => $student->id, 'school_year' => $student->school_year],
                    ['class_id' => $student->class_id],
                );
            }
        });
    }

    /**
     * Élèves actifs inscrits pour l'année académique active (les autres sont archivés).
     */
    public function scopeEnrolled(Builder $query): Builder
    {
        return $query->where('status', 'active')->where('school_year', SchoolContext::activeYear());
    }

    public function isEnrolled(): bool
    {
        return $this->status === 'active' && $this->school_year === SchoolContext::activeYear();
    }

    public function enrollments(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

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