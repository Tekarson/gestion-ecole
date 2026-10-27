<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FeeSetting extends Model
{
    protected $fillable = [
        'label',
        'amount',
        'category',
        'term',
        'school_year',
    ];

    protected $casts = [
        'id' => 'string',
        'amount' => 'float',
        'term' => 'integer',
    ];
}