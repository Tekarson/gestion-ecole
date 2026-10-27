<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SchoolClass extends Model
{
    protected $table = 'school_classes';

    protected $fillable = [
        'name',
        'level',
        'tranche1',
        'tranche2',
        'tranche3',
        'books',
    ];

    protected $casts = [
        'id' => 'string',
        'tranche1' => 'float',
        'tranche2' => 'float',
        'tranche3' => 'float',
        'books' => 'float',
    ];

    public function students(): HasMany
    {
        return $this->hasMany(Student::class, 'class_id');
    }
}