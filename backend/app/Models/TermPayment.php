<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TermPayment extends Model
{
    protected $fillable = [
        'term_id',
        'label',
        'amount',
        'due_date',
        'paid_fraction',
    ];

    protected $casts = [
        'id' => 'string',
        'term_id' => 'string',
        'amount' => 'float',
        'paid_fraction' => 'float',
        'due_date' => 'date',
    ];

    public function term(): BelongsTo
    {
        return $this->belongsTo(TermPeriod::class, 'term_id');
    }
}