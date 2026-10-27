<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;

class ModulePermission extends Model
{
    protected $fillable = [
        'user_id',
        'module',
        'can_read',
        'can_create',
        'can_update',
        'can_delete',
    ];

    protected $casts = [
        'id' => 'string',
        'user_id' => 'string',
        'can_read' => 'boolean',
        'can_create' => 'boolean',
        'can_update' => 'boolean',
        'can_delete' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}