<?php

namespace App\Models;

use App\Support\Modules;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    public const ROLE_FAMILY = 'family';

    public const ROLE_ADMIN = 'admin';

    public const ROLE_SUPERADMIN = 'superadmin';

    protected $fillable = [
        'full_name',
        'first_name',
        'last_name',
        'postnom',
        'email',
        'password',
        'role',
        'family_id',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'id' => 'string',
        'family_id' => 'string',
        'is_active' => 'boolean',
        'password' => 'hashed',
        'email_verified_at' => 'datetime',
    ];

    public function family(): BelongsTo
    {
        return $this->belongsTo(Family::class);
    }

    public static function composeFullName(?string $first, ?string $last, ?string $postnom = null): string
    {
        $parts = array_filter([$first, $last, $postnom], fn ($value) => $value !== null && $value !== '');

        return trim(implode(' ', $parts));
    }

    public function getFullNameAttribute(): string
    {
        return self::composeFullName($this->first_name, $this->last_name, $this->postnom)
            ?: (string) ($this->attributes['full_name'] ?? '');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    public function modulePermissions(): HasMany
    {
        return $this->hasMany(ModulePermission::class);
    }

    public function isAdmin(): bool
    {
        return in_array($this->role, [self::ROLE_ADMIN, self::ROLE_SUPERADMIN], true);
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === self::ROLE_SUPERADMIN;
    }

    /**
     * Whether the user may perform $action on $module. The superadmin always can.
     */
    public function canAccess(string $module, string $action = 'read'): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        if ($this->role !== self::ROLE_ADMIN || ! in_array($action, Modules::ACTIONS, true)) {
            return false;
        }

        $permission = $this->modulePermissions->firstWhere('module', $module);

        return $permission !== null && (bool) $permission->{'can_'.$action};
    }

    /**
     * Assigned module keys, e.g. ["dashboard", "paiements"].
     *
     * @return string[]
     */
    public function modules(): array
    {
        if ($this->isSuperAdmin()) {
            return Modules::keys();
        }

        return $this->modulePermissions->pluck('module')->all();
    }

    /**
     * Expanded permission list, e.g. ["paiements.read", "paiements.update"].
     *
     * @return string[]
     */
    public function permissions(): array
    {
        if ($this->isSuperAdmin()) {
            $permissions = [];

            foreach (Modules::ALL as $module => $_label) {
                foreach (Modules::ACTIONS as $action) {
                    $permissions[] = $module.'.'.$action;
                }
            }

            return $permissions;
        }

        $permissions = [];

        foreach ($this->modulePermissions as $permission) {
            foreach (Modules::ACTIONS as $action) {
                if ((bool) $permission->{'can_'.$action}) {
                    $permissions[] = $permission->module.'.'.$action;
                }
            }
        }

        return $permissions;
    }
}