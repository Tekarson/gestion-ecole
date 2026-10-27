<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TermPeriod extends Model
{
    protected $fillable = [
        'name',
        'term',
        'due_date',
        'opens_at',
        'closes_at',
        'at_enrollment',
    ];

    protected $casts = [
        'id' => 'string',
        'term' => 'integer',
        'due_date' => 'date',
        'opens_at' => 'date',
        'closes_at' => 'date',
        'at_enrollment' => 'boolean',
    ];

    public function termPayments(): HasMany
    {
        return $this->hasMany(TermPayment::class);
    }
}