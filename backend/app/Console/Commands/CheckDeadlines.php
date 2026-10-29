<?php

namespace App\Console\Commands;

use App\Models\Notification;
use App\Models\Student;
use App\Models\User;
use App\Services\FeeService;
use App\Services\NotificationService;
use App\Support\SchoolContext;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class CheckDeadlines extends Command
{
    protected $signature = 'school:deadlines';

    protected $description = 'Notifications d’échéances : tranche ouverte, échéance prochaine, échéance dépassée.';

    public function handle(FeeService $fees): int
    {
        $year = SchoolContext::activeYear();
        $now = Carbon::now();
        $sent = 0;

        $students = Student::with('family', 'schoolClass', 'payments')
            ->enrolled()
            ->orderBy('id')
            ->get();

        foreach ($students as $student) {
            $familyId = $student->family?->id;
            if (! $familyId) {
                continue;
            }
            $userIds = User::where('family_id', $familyId)->where('role', 'family')->pluck('id')->all();
            if ($userIds === []) {
                continue;
            }

            $finance = $fees->studentFinance($student, $student->payments);

            foreach ($finance['tranches'] as $tranche) {
                $term = (int) $tranche['term'];
                $remaining = (float) $tranche['remaining'];
                $closesAt = $tranche['closes_at'] !== null ? Carbon::parse($tranche['closes_at']) : null;

                // Tranche 1 = liée à l’inscription ; déjà réglée : rien à signaler.
                if ($term === 1 || (bool) $tranche['at_enrollment'] || $remaining <= 0) {
                    continue;
                }

                $label = $tranche['label'] ?? 'Tranche '.$term;
                $due = number_format((float) $tranche['due'], 0, ',', ' ');
                $rest = number_format($remaining, 0, ',', ' ');
                $name = $student->full_name;
                $date = $closesAt?->format('d/m/Y') ?? '—';

                // 1) Tranche ouverte (une seule fois par tranche grâce à la clé ref).
                if (! $this->alreadyNotified($userIds, $key = "deadline.opened.{$year}.{$term}.{$student->id}") && $closesAt !== null && $closesAt->gt($now)) {
                    NotificationService::notifyFamily(
                        $familyId,
                        "{$label} ouverte",
                        "La {$label} ({$due} $) de {$name} est ouverte jusqu’au {$date} — solde restant : {$rest} $.",
                        $key
                    );
                    $sent++;
                }

                // 2) Échéance prochaine (7 jours restants).
                if ($closesAt !== null && $closesAt->gt($now) && $closesAt->lte($now->copy()->addDays(7))) {
                    if (! $this->alreadyNotified($userIds, $key = "deadline.due.{$year}.{$term}.{$student->id}")) {
                        NotificationService::notifyFamily(
                            $familyId,
                            'Échéance prochaine',
                            "L’échéance de la {$label} ({$due} $) de {$name} arrive le {$date} — solde restant : {$rest} $.",
                            $key
                        );
                        $sent++;
                    }
                }

                // 3) Échéance dépassée.
                if ($closesAt !== null && $closesAt->lt($now)) {
                    if (! $this->alreadyNotified($userIds, $key = "deadline.past.{$year}.{$term}.{$student->id}")) {
                        NotificationService::notifyFamily(
                            $familyId,
                            'Échéance dépassée',
                            "L’échéance de la {$label} ({$due} $) de {$name} est dépassée — solde restant : {$rest} $.",
                            $key
                        );
                        $sent++;
                    }
                }
            }
        }

        $this->info("Notifications d’échéances envoyées : {$sent}");

        return self::SUCCESS;
    }

    private function alreadyNotified(array $userIds, string $ref): bool
    {
        return Notification::whereIn('user_id', $userIds)->where('ref', $ref)->exists();
    }
}