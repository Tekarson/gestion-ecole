<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Inscription d'un élève pour une année académique (historique / archives).
 */
class Enrollment extends Model
{
    protected $fillable = [
        'student_id',
        'school_year',
        'class_id',
    ];

    protected $casts = [
        'id' => 'string',
        'student_id' => 'string',
        'class_id' => 'string',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }
}
