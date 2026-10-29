<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\FeeSetting;
use App\Models\SchoolClass;
use App\Models\Setting;
use App\Models\Student;
use App\Models\TermPeriod;
use App\Models\User;
use App\Services\FeeService;
use App\Services\NotificationService;
use App\Support\Payloads;
use App\Support\SchoolContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'feeSettings' => Payloads::feeControls(FeeSetting::all()),
            'classes' => Payloads::classes(SchoolClass::all()),
            'discountRules' => (new FeeService)->discountRules(),
            'periods' => TermPeriod::orderBy('term')->get()
                ->map(fn ($p) => Payloads::period($p))
                ->values()
                ->all(),
            'school_year' => SchoolContext::activeYear(),
            'current_term' => SchoolContext::currentTerm(),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'feeSettings' => ['required', 'array'],
            'feeSettings.*.key' => ['required', 'string'],
            'feeSettings.*.label' => ['required', 'string'],
            'feeSettings.*.amount' => ['required', 'numeric', 'min:0'],
            'classes' => ['required', 'array'],
            'classes.*.id' => ['nullable', 'integer'],
            'classes.*.name' => ['required', 'string', 'distinct'],
            'classes.*.section' => ['required', 'string'],
            'classes.*.tranche1' => ['required', 'numeric', 'min:0'],
            'classes.*.tranche2' => ['required', 'numeric', 'min:0'],
            'classes.*.tranche3' => ['required', 'numeric', 'min:0'],
            'classes.*.books' => ['required', 'numeric', 'min:0'],
            'deletedIds' => ['nullable', 'array'],
            'deletedIds.*' => ['integer'],
            'discountRules.byCount' => ['nullable', 'array'],
            'discountRules.byCount.4' => ['nullable', 'numeric', 'min:0'],
            'discountRules.byCount.5' => ['nullable', 'numeric', 'min:0'],
            'discountRules.exemptSixth' => ['nullable', 'boolean'],
            'periods' => ['nullable', 'array'],
            'periods.*.term' => ['required', 'integer', 'in:1,2,3'],
            'periods.*.opens_at' => ['nullable', 'date'],
            'periods.*.closes_at' => ['nullable', 'date'],
            'periods.*.at_enrollment' => ['nullable', 'boolean'],
            'school_year' => ['nullable', 'string', 'max:20'],
            'current_term' => ['nullable', 'integer', 'min:1', 'max:3'],
        ]);

        foreach ($data['feeSettings'] as $setting) {
            FeeSetting::where('label', $setting['key'])->update([
                'label' => $setting['key'],
                'amount' => $setting['amount'],
            ]);
        }

        foreach ($data['classes'] as $classInput) {
            $id = $classInput['id'] ?? null;

            if ($id) {
                $class = SchoolClass::find($id);
                if (! $class) {
                    continue;
                }
                $this->assertClassNameFree($classInput['name'], $class->id);
                $class->update([
                    'name' => $classInput['name'],
                    'level' => $classInput['section'],
                    'tranche1' => $classInput['tranche1'],
                    'tranche2' => $classInput['tranche2'],
                    'tranche3' => $classInput['tranche3'],
                    'books' => $classInput['books'],
                ]);
            } else {
                $this->assertClassNameFree($classInput['name']);
                SchoolClass::create([
                    'name' => $classInput['name'],
                    'level' => $classInput['section'],
                    'tranche1' => $classInput['tranche1'],
                    'tranche2' => $classInput['tranche2'],
                    'tranche3' => $classInput['tranche3'],
                    'books' => $classInput['books'],
                ]);
            }
        }

        foreach ($data['deletedIds'] ?? [] as $id) {
            $class = SchoolClass::find($id);
            if (! $class) {
                continue;
            }
            if (Student::where('class_id', $class->id)->exists()) {
                return response()->json([
                    'message' => "Impossible de supprimer « {$class->name} » : des élèves y sont encore rattachés.",
                ], 409);
            }
            $class->delete();
        }

        if (isset($data['discountRules'])) {
            $rules = (new FeeService)->discountRules();
            $byCount = $data['discountRules']['byCount'] ?? [];
            if (! empty($byCount[4]) || ! empty($byCount[5])) {
                $rules['byCount'][4] = isset($byCount[4]) ? (float) $byCount[4] : 0.0;
                $rules['byCount'][5] = isset($byCount[5]) ? (float) $byCount[5] : 0.0;
            }
            if (array_key_exists('exemptSixth', $data['discountRules'])) {
                $rules['exemptSixth'] = (bool) $data['discountRules']['exemptSixth'];
            }
            Setting::set('discount_rules', $rules);
        }

        if (! empty($data['periods'])) {
            foreach ($data['periods'] as $periodInput) {
                $termini = (int) $periodInput['term'];
                $period = TermPeriod::firstOrCreate(
                    ['term' => $termini],
                    ['name' => 'Terme '.$termini, 'due_date' => null],
                );
                $period->update([
                    'opens_at' => ! empty($periodInput['opens_at']) ? $periodInput['opens_at'] : null,
                    'closes_at' => ! empty($periodInput['closes_at']) ? $periodInput['closes_at'] : null,
                    'at_enrollment' => (bool) ($periodInput['at_enrollment'] ?? false),
                ]);
            }
        }

        if (! empty($data['school_year'])) {
            Setting::set('school_year', $data['school_year']);
        }

        if (isset($data['current_term'])) {
            Setting::set('current_term', $data['current_term']);
        }

        AuditLog::create([
            'user_id' => $request->user()?->id,
            'action' => 'settings.updated',
            'details' => [
                'fee_settings' => count($data['feeSettings']),
                'classes' => count($data['classes']),
                'deleted_classes' => count($data['deletedIds'] ?? []),
                'school_year' => SchoolContext::activeYear(),
            ],
        ]);

        return $this->index();
    }

    /**
     * Suppression immédiate d'une classe (refusée tant que des élèves y sont rattachés).
     */
    public function destroyClass(Request $request, SchoolClass $class): JsonResponse
    {
        $count = Student::where('class_id', $class->id)->count();
        if ($count > 0) {
            return response()->json([
                'message' => "Impossible de supprimer « {$class->name} » : {$count} élève(s) y sont encore rattaché(s). Changez-les de classe d'abord.",
            ], 409);
        }

        $name = $class->name;
        $class->delete();

        AuditLog::create([
            'user_id' => $request->user()?->id,
            'action' => 'class.deleted',
            'details' => ['class' => $name],
        ]);

        return $this->index();
    }

    public function closeYear(Request $request): JsonResponse
    {
        $current = SchoolContext::activeYear();
        $next = $this->nextYear($current);

        Setting::set('school_year', $next);
        Setting::set('current_term', 1);

        AuditLog::create([
            'user_id' => $request->user()?->id,
            'action' => 'school.year_closed',
            'details' => ['from' => $current, 'to' => $next],
        ]);

        $families = User::where('role', 'family')
            ->whereNotNull('family_id')
            ->pluck('family_id')
            ->unique()
            ->values();

        foreach ($families as $familyId) {
            NotificationService::notifyFamily(
                $familyId,
                'Nouvelle année scolaire',
                "L’année {$next} est ouverte. Réinscrivez vos enfants et réglez les frais d’inscription + première tranche pour confirmer leur place.",
                "year.opened.{$next}"
            );
        }

        return $this->index();
    }

    private function nextYear(string $year): string
    {
        if (preg_match('/^(\d{4})-(\d{4})$/', $year, $m) === 1) {
            return ((int) $m[1] + 1).'-'.((int) $m[2] + 1);
        }

        return $year.'-'.((int) substr($year, 0, 4) + 1);
    }

    private function assertClassNameFree(string $name, ?int $exceptId = null): void
    {
        $query = SchoolClass::where('name', $name);
        if ($exceptId !== null) {
            $query->where('id', '!=', $exceptId);
        }

        abort_if($query->exists(), 422, "Une classe « {$name} » existe déjà.");
    }
}