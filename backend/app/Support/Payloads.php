<?php

namespace App\Support;

use App\Models\FeeSetting;
use App\Models\Payment;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\TermPeriod;
use App\Models\User;
use App\Support\SchoolContext;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Serializers that shape backend rows into the exact payloads consumed by the
 * React frontend (see src/lib/fees.ts).
 */
class Payloads
{
    public static function profile(User $user): array
    {
        return [
            'id' => (string) $user->id,
            'full_name' => $user->full_name,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'postnom' => $user->postnom,
            'email' => $user->email,
            'phone' => $user->isAdmin() ? null : ($user->family?->phone ?? null),
            'role' => $user->role,
            'modules' => $user->modules(),
            'permissions' => $user->permissions(),
        ];
    }

    /**
     * Serializer for admin users seen by the superadmin (user management).
     */
    public static function adminUser(User $user): array
    {
        $modules = [];
        foreach ($user->modulePermissions as $permission) {
            $modules[$permission->module] = [
                'read' => (bool) $permission->can_read,
                'create' => (bool) $permission->can_create,
                'update' => (bool) $permission->can_update,
                'delete' => (bool) $permission->can_delete,
            ];
        }

        return [
            'id' => (string) $user->id,
            'full_name' => $user->full_name,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'postnom' => $user->postnom,
            'email' => $user->email,
            'role' => $user->role,
            'is_active' => (bool) $user->is_active,
            'modules' => $modules,
            'created_at' => $user->created_at?->toIso8601String(),
        ];
    }

    public static function school(): array
    {
        return [
            'id' => 'school',
            'name' => config('services.school.name'),
            'year' => SchoolContext::activeYear(),
        ];
    }

    public static function classRow(SchoolClass $class, int $sortOrder = 0): array
    {
        return [
            'id' => (string) $class->id,
            'name' => $class->name,
            'section' => $class->level,
            'tranche1' => (float) $class->tranche1,
            'tranche2' => (float) $class->tranche2,
            'tranche3' => (float) $class->tranche3,
            'books' => (float) $class->books,
            'sort_order' => $sortOrder,
        ];
    }

    public static function classes(Collection $classes): array
    {
        return $classes
            ->sortBy('name')
            ->values()
            ->map(fn (SchoolClass $class, int $i) => self::classRow($class, $i))
            ->all();
    }

    public static function feeControl(FeeSetting $fee, int $sortOrder = 0): array
    {
        return [
            'key' => $fee->label,
            'label' => self::feeLabel($fee->label),
            'amount' => (float) $fee->amount,
            'sort_order' => $sortOrder,
        ];
    }

    public static function feeControls(Collection $fees): array
    {
        return $fees
            ->sortBy('label')
            ->values()
            ->map(fn (FeeSetting $fee, int $i) => self::feeControl($fee, $i))
            ->all();
    }

    public static function period(TermPeriod $period): array
    {
        return [
            'term' => (int) $period->term,
            'label' => $period->name,
            'opens_at' => $period->opens_at?->toDateString(),
            'closes_at' => $period->closes_at?->toDateString(),
            'at_enrollment' => (bool) $period->at_enrollment,
        ];
    }

    public static function student(Student $student): array
    {
        return [
            'id' => (string) $student->id,
            'parent_id' => (string) $student->family_id,
            'first_name' => $student->first_name,
            'last_name' => $student->last_name,
            'postnom' => $student->postnom,
            'matricule' => $student->matricule,
            'class_id' => (string) $student->class_id,
            'school_year' => SchoolContext::activeYear(),
            'photo_url' => $student->photo,
            'created_at' => $student->created_at?->toIso8601String(),
        ];
    }

    public static function adminStudent(Student $student): array
    {
        return [
            'id' => (string) $student->id,
            'first_name' => $student->first_name,
            'last_name' => $student->last_name,
            'postnom' => $student->postnom,
            'full_name' => $student->full_name,
            'gender' => $student->gender,
            'matricule' => $student->matricule,
            'photo_url' => $student->photo,
            'status' => $student->status,
            'is_exempt' => (bool) $student->is_exempt,
            'class_id' => $student->class_id !== null ? (string) $student->class_id : null,
            'class_name' => $student->schoolClass?->name,
            'section' => $student->schoolClass?->level,
            'family_id' => $student->family_id !== null ? (string) $student->family_id : null,
            'parent_name' => $student->family?->parent_name,
            'created_at' => $student->created_at?->toIso8601String(),
        ];
    }

    public static function payment(Payment $payment): array
    {
        $student = $payment->student;

        return [
            'id' => (string) $payment->id,
            'student_id' => (string) $payment->student_id,
            'student_name' => $student?->full_name ?? '—',
            'parent_id' => (string) $payment->family_id,
            'parent_name' => $payment->family?->parent_name,
            'class_name' => $student?->schoolClass?->name,
            'nature' => $payment->category,
            'amount' => (float) $payment->amount,
            'method' => $payment->method,
            'school_year' => $payment->school_year ?? SchoolContext::activeYear(),
            'status' => match ($payment->status) {
                'pending' => 'en_attente',
                'cancelled' => 'annule',
                default => 'confirme',
            },
            'reference' => $payment->reference,
            'note' => null,
            'created_at' => $payment->created_at?->toIso8601String(),
        ];
    }

    public static function notification(mixed $notification): array
    {
        return [
            'id' => (string) $notification->id,
            'title' => $notification->title,
            'body' => $notification->message,
            'type' => 'info',
            'read_at' => $notification->read_at?->toIso8601String(),
            'created_at' => $notification->created_at?->toIso8601String(),
        ];
    }

    public static function audit(mixed $log): array
    {
        return [
            'id' => (string) $log->id,
            'user_name' => $log->user?->full_name,
            'action' => $log->action,
            'details' => is_array($log->details) ? json_encode($log->details) : $log->details,
            'created_at' => $log->created_at?->toIso8601String(),
        ];
    }

    /**
     * Human readable label for a fee nature key.
     */
    public static function feeLabel(string $nature): string
    {
        return match ($nature) {
            'inscription' => "Frais d'inscription",
            'uniforme' => 'Uniforme',
            'assurance' => 'Assurance scolaire',
            'divers' => 'Frais divers',
            'livres' => 'Livres',
            'tranche1' => 'Tranche 1 — Minerval',
            'tranche2' => 'Tranche 2 — Minerval',
            'tranche3' => 'Tranche 3 — Minerval',
            default => Str::headline($nature),
        };
    }
}