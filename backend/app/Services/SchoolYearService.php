<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\FeeSetting;
use App\Models\SchoolClass;
use App\Models\SchoolYear;
use App\Models\Setting;
use App\Models\Student;
use App\Support\SchoolContext;
use Illuminate\Support\Facades\DB;

/**
 * Années académiques. Les tables `fee_settings` et `school_classes` portent
 * toujours les barèmes de l'année active ; ceux des autres années sont
 * conservés dans `school_years.tariffs` et rechargés à l'activation.
 */
class SchoolYearService
{
    /**
     * Barèmes actuels : frais par type et minerval / livres par classe.
     *
     * @return array{fees: array<string, float>, classes: array<string, array<string, float>>}
     */
    public function snapshot(): array
    {
        $fees = [];
        foreach (FeeSetting::all() as $fee) {
            $fees[$fee->label] = (float) $fee->amount;
        }

        $classes = [];
        foreach (SchoolClass::all() as $class) {
            $classes[(string) $class->id] = [
                'tranche1' => (float) $class->tranche1,
                'tranche2' => (float) $class->tranche2,
                'tranche3' => (float) $class->tranche3,
                'books' => (float) $class->books,
            ];
        }

        return ['fees' => $fees, 'classes' => $classes];
    }

    /**
     * Enregistre les barèmes actuels dans l'année active (appelé après chaque
     * modification des paramètres, pour que l'archive reste à jour).
     */
    public function syncActiveTariffs(): void
    {
        $active = SchoolYear::active();
        $active?->update(['tariffs' => $this->snapshot()]);
    }

    public function create(string $name, ?string $startsOn, ?string $endsOn, ?int $userId = null): SchoolYear
    {
        abort_if(SchoolYear::where('name', $name)->exists(), 422, "L’année « {$name} » existe déjà.");

        // Une nouvelle année reprend les barèmes actuels ; ils restent modifiables.
        $year = SchoolYear::create([
            'name' => $name,
            'starts_on' => $startsOn,
            'ends_on' => $endsOn,
            'is_active' => false,
            'tariffs' => $this->snapshot(),
        ]);

        AuditLog::create([
            'user_id' => $userId,
            'action' => 'school.year_created',
            'details' => ['school_year' => $name],
        ]);

        return $year;
    }

    public function update(SchoolYear $year, ?string $startsOn, ?string $endsOn): SchoolYear
    {
        $year->update(['starts_on' => $startsOn, 'ends_on' => $endsOn]);

        return $year;
    }

    /**
     * Active une année : archive les barèmes de l'année en cours, charge ceux
     * de l'année choisie. Les élèves non réinscrits sont alors archivés.
     */
    public function activate(SchoolYear $year, ?int $userId = null): SchoolYear
    {
        $current = SchoolYear::active();
        if ($current && (string) $current->id === (string) $year->id) {
            return $year;
        }

        DB::transaction(function () use ($current, $year) {
            $current?->update(['tariffs' => $this->snapshot(), 'is_active' => false]);
            SchoolYear::where('id', '!=', $year->id)->update(['is_active' => false]);

            $this->apply($year->tariffs ?? $this->snapshot(), $year->name);
            $year->update(['is_active' => true]);

            // Garde l'ancien réglage synchronisé (utilisé en repli).
            DB::table('settings')->updateOrInsert(['key' => 'school_year'], ['value' => json_encode($year->name), 'updated_at' => now()]);
            Setting::set('current_term', 1);
        });

        SchoolContext::forget();

        AuditLog::create([
            'user_id' => $userId,
            'action' => 'school.year_activated',
            'details' => ['from' => $current?->name, 'to' => $year->name],
        ]);

        return $year->fresh();
    }

    /**
     * Réinscrit des élèves (archivés ou non) dans l'année active.
     *
     * @param  array<int, array{id: string|int, class_id: string|int}>  $items
     * @return int nombre d'élèves réinscrits
     */
    public function reenroll(array $items, ?int $userId = null): int
    {
        $year = SchoolContext::activeYear();
        $names = [];

        DB::transaction(function () use ($items, $year, &$names) {
            foreach ($items as $item) {
                $student = Student::find($item['id']);
                if (! $student) {
                    continue;
                }
                $student->update([
                    'class_id' => $item['class_id'],
                    'school_year' => $year,
                    'status' => 'active',
                ]);
                $names[] = $student->full_name;
            }
        });

        if ($names !== []) {
            AuditLog::create([
                'user_id' => $userId,
                'action' => 'student.reenrolled',
                'details' => ['school_year' => $year, 'students' => $names],
            ]);
        }

        return count($names);
    }

    /**
     * @param  array{fees?: array<string, float>, classes?: array<string, array<string, float>>}  $tariffs
     */
    private function apply(array $tariffs, string $yearName): void
    {
        foreach ($tariffs['fees'] ?? [] as $label => $amount) {
            FeeSetting::where('label', $label)->update(['amount' => $amount, 'school_year' => $yearName]);
        }
        FeeSetting::query()->update(['school_year' => $yearName]);

        foreach ($tariffs['classes'] ?? [] as $classId => $values) {
            SchoolClass::where('id', $classId)->update(array_intersect_key($values, array_flip(['tranche1', 'tranche2', 'tranche3', 'books'])));
        }
    }
}
