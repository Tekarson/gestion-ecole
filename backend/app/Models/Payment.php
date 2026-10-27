<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Payment extends Model
{
    protected $fillable = [
        'reference',
        'family_id',
        'student_id',
        'amount',
        'method',
        'date',
        'term',
        'category',
        'school_year',
        'status',
    ];

    protected $casts = [
        'id' => 'string',
        'family_id' => 'string',
        'student_id' => 'string',
        'amount' => 'float',
        'date' => 'date',
        'term' => 'integer',
    ];

    public function family(): BelongsTo
    {
        return $this->belongsTo(Family::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }
}