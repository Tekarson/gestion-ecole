<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;

/**
 * In-app notifications sent to the family member(s) of a given family.
 */
class NotificationService
{
    public static function notifyFamily(int|string $familyId, string $title, string $message, ?string $ref = null): void
    {
        foreach (User::where('family_id', $familyId)->where('role', 'family')->get() as $user) {
            if ($ref !== null && self::hasRef($user->id, $ref)) {
                continue;
            }
            Notification::create([
                'user_id' => $user->id,
                'title' => $title,
                'message' => $message,
                'ref' => $ref,
            ]);
        }
    }

    public static function hasRef(int|string $userId, string $ref): bool
    {
        return Notification::where('user_id', $userId)->where('ref', $ref)->exists();
    }
}