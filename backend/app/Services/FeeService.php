<?php

namespace App\Services;

use App\Models\FeeSetting;
use App\Models\Family;
use App\Models\Payment;
use App\Models\Setting;
use App\Models\Student;
use App\Models\TermPeriod;
use Illuminate\Support\Collection;
use Illuminate\Support\Carbon;

/**
 * Fee calculation engine. A family pays:
 *  - a minerval per child, split in 3 tranches (stored on the class),
 *  - frais d'ouverture de dossier (inscription) stored in fee_settings,
 *  - frais connexes (divers, uniforme, gymnastique, journal de classe, …) stored in fee_settings,
 *  - autres frais (camp d'été, participation aux examens) stored in fee_settings,
 *  - a books amount per child (stored on the class).
 *
 * Statuts particuliers d'un élève :
 *  - enfant d'enseignant : ne paie pas les frais d'ouverture de dossier,
 *  - ayant droit         : paie les frais connexes mais pas le minerval.
 *
 * Règles familiales (cahier des charges) appliquées au minerval uniquement :
 *  - 1 à 3 enfants : aucun avantage,
 *  - 4 enfants      : 500 $ de réduction,
 *  - 5 enfants      : 1 000 $ de réduction,
 *  - 6+ enfants     : seuls le 6e enfant est exonéré du minerval.
 */
class FeeService
{
    public const ENROLLMENT_NATURES = ['inscription'];

    /** Frais connexes. */
    public const FIXED_NATURES = [
        'divers',
        'uniforme',
        'gymnastique',
        'journal_classe',
        'uniforme_plus',
        'attestation_frequentation',
        'assurance',
    ];

    /** Autres frais (camp d'été, participation aux examens). */
    public const OTHER_NATURES = ['camp_ete', 'examen'];

    public const MINERVAL_NATURES = ['tranche1', 'tranche2', 'tranche3'];

    public const BOOKS_NATURES = ['livres'];

    /**
     * Flat family discounts on the minerval, by exact number of children.
     * Overridable by the school through the settings (key `discount_rules`).
     */
    public const DEFAULT_DISCOUNT_RULES = [
        'byCount' => [4 => 500.0, 5 => 1000.0],
        'exemptSixth' => true,
    ];

    /**
     * Discount rules, mixing stored settings with the defaults.
     */
    public function discountRules(): array
    {
        $stored = Setting::get('discount_rules');

        $byCount = self::DEFAULT_DISCOUNT_RULES['byCount'];
        if (is_array($stored)) {
            $storedByCount = $stored['byCount'] ?? $stored;
            foreach ([4, 5] as $count) {
                $value = $storedByCount[$count] ?? $storedByCount[(string) $count] ?? null;
                if ($value !== null) {
                    $byCount[$count] = (float) $value;
                }
            }
        }

        $exemptSixth = $stored['exemptSixth'] ?? self::DEFAULT_DISCOUNT_RULES['exemptSixth'];

        return [
            'byCount' => $byCount,
            'exemptSixth' => (bool) $exemptSixth,
        ];
    }

    public function studentFinance(
        Student $student,
        ?Collection $payments = null,
        ?Collection $feeSettings = null,
        ?Collection $periods = null
    ): array {
        $class = $student->schoolClass;
        $payments ??= $student->payments;
        $feeSettings ??= FeeSetting::all();
        $periods ??= TermPeriod::orderBy('term')->get();

        $exempt = $this->studentIsExempt($student);
        $teacherChild = (bool) $student->is_teacher_child;
        $entitled = (bool) $student->is_entitled;
        $minervalWaived = $exempt || $entitled;

        $enrollmentFee = $this->sumFees($feeSettings, self::ENROLLMENT_NATURES);
        $enrollmentDue = $teacherChild ? 0.0 : $enrollmentFee;
        $fixedDue = $this->sumFees($feeSettings, self::FIXED_NATURES);
        $otherDue = $this->sumFees($feeSettings, self::OTHER_NATURES);
        $minervalDue = $minervalWaived || $class === null ? 0.0 : (float) $class->tranche1 + (float) $class->tranche2 + (float) $class->tranche3;
        $booksDue = $class ? (float) $class->books : 0.0;

        $grouped = $this->groupPaidByNature($payments);
        $enrollmentPaid = $this->sumGroup($grouped, self::ENROLLMENT_NATURES);
        $fixedPaid = $this->sumGroup($grouped, self::FIXED_NATURES);
        $otherPaid = $this->sumGroup($grouped, self::OTHER_NATURES);
        $minervalPaid = $this->sumGroup($grouped, self::MINERVAL_NATURES);
        $booksPaid = $this->sumGroup($grouped, self::BOOKS_NATURES);

        // Per-tranche minerval breakdown.
        $tranches = [];
        $tranche1Paid = 0.0;
        foreach ([1, 2, 3] as $term) {
            $termDue = $class !== null && ! $minervalWaived ? (float) $class->{'tranche'.$term} : 0.0;
            $termPaid = $grouped['tranche'.$term] ?? 0.0;
            if ($term === 1) {
                $tranche1Paid = (float) $termPaid;
            }
            $period = $periods->firstWhere('term', $term);
            $tranches[] = [
                'term' => $term,
                'label' => 'Tranche '.$term,
                'due' => round($termDue * 100) / 100,
                'paid' => round((float) $termPaid * 100) / 100,
                'remaining' => round(max(0.0, $termDue - (float) $termPaid) * 100) / 100,
                'status' => $this->trancheStatus($term, $termDue, (float) $termPaid, $period),
                'opens_at' => $period?->opens_at?->toDateString(),
                'closes_at' => $period?->closes_at?->toDateString(),
                'at_enrollment' => (bool) ($period?->at_enrollment ?? false),
            ];
        }

        // Detailed, line by line breakdown (fixed fees, books + tranches) so the
        // parent can see exactly what is due / paid for each item.
        $lines = $this->buildLines($feeSettings, $class, $grouped, $tranches, $teacherChild);

        $totalDue = round(($enrollmentDue + $fixedDue + $otherDue + $minervalDue + $booksDue) * 100) / 100;
        $totalPaid = round(($enrollmentPaid + $fixedPaid + $otherPaid + $minervalPaid + $booksPaid) * 100) / 100;

        // La place est confirmée quand l'ouverture de dossier et la tranche 1
        // sont réglées ; ce qui n'est pas dû (enfant d'enseignant, ayant droit,
        // exonéré) compte comme réglé.
        $placeConfirmed = false;
        $tranche1Due = $tranches[0]['due'];
        if ($class !== null && $enrollmentFee > 0 && (float) $class->tranche1 > 0) {
            $placeConfirmed = $enrollmentPaid >= $enrollmentDue && $tranche1Paid >= $tranche1Due;
        }

        return [
            'cls' => $class ? \App\Support\Payloads::classRow($class) : null,
            'totalDue' => $totalDue,
            'totalPaid' => $totalPaid,
            'balance' => round(($totalDue - $totalPaid) * 100) / 100,
            'fixedDue' => round($fixedDue * 100) / 100,
            'fixedPaid' => round($fixedPaid * 100) / 100,
            'otherDue' => round($otherDue * 100) / 100,
            'otherPaid' => round($otherPaid * 100) / 100,
            'booksDue' => round($booksDue * 100) / 100,
            'booksPaid' => round($booksPaid * 100) / 100,
            'minervalDue' => round($minervalDue * 100) / 100,
            'minervalPaid' => round($minervalPaid * 100) / 100,
            'enrollmentDue' => round($enrollmentDue * 100) / 100,
            'enrollmentPaid' => round($enrollmentPaid * 100) / 100,
            'tranches' => $tranches,
            'lines' => $lines,
            'placeConfirmed' => $placeConfirmed,
            'exempt' => $exempt,
            'teacherChild' => $teacherChild,
            'entitled' => $entitled,
        ];
    }

    public function familyFinance(int|string $familyId): array
    {
        $family = Family::with(['students.schoolClass', 'students.payments'])->findOrFail($familyId);
        $students = $family->students()
            ->where('status', 'active')
            ->orderBy('id')
            ->get();

        $childCount = $students->count();

        $rules = $this->discountRules();
        $exemptSixth = $childCount >= 6 && $rules['exemptSixth'];

        $minervalGross = 0.0;
        $fixedGross = 0.0;
        $otherGross = 0.0;
        $booksGross = 0.0;
        $enrollmentGross = 0.0;
        $children = [];
        $exemptCount = 0;

        $feeSettings = FeeSetting::all();
        $periods = TermPeriod::orderBy('term')->get();
        foreach ($students as $student) {
            $finance = $this->studentFinance($student, $student->payments, $feeSettings, $periods);
            $minervalGross += $finance['minervalDue'];
            $fixedGross += $finance['fixedDue'];
            $otherGross += $finance['otherDue'];
            $booksGross += $finance['booksDue'];
            $enrollmentGross += $finance['enrollmentDue'];
            if ($finance['exempt']) {
                $exemptCount++;
            }
            $children[] = [
                'student' => \App\Support\Payloads::student($student),
                'cls' => $finance['cls'],
                'finance' => $finance,
            ];
        }

        $minervalGross = round($minervalGross * 100) / 100;
        $discount = round((float) ($rules['byCount'][$childCount] ?? 0.0) * 100) / 100;
        $minervalNet = round(($minervalGross - $discount) * 100) / 100;

        $totalGross = round(($minervalGross + $fixedGross + $otherGross + $booksGross + $enrollmentGross) * 100) / 100;
        $totalNet = round(($totalGross - $discount) * 100) / 100;

        $totalPaid = round($family->payments()->where('status', 'confirmed')->sum('amount') * 100) / 100;

        // Per child, the family discount is shared proportionally to his/her minerval.
        foreach ($children as $i => $child) {
            $childGross = $child['finance']['totalDue'];
            $childMinerval = $child['finance']['minervalDue'];
            $share = $minervalGross > 0 ? $childMinerval / $minervalGross : 0.0;
            $childDiscount = round($discount * $share * 100) / 100;
            $children[$i]['finance']['childDiscount'] = $childDiscount;
            $children[$i]['finance']['childNet'] = round(($childGross - $childDiscount) * 100) / 100;
        }

        $byCount = $rules['byCount'];
        $nextDiscount = 0.0;
        if ($childCount >= 1 && $childCount < 4) {
            $nextDiscount = (float) ($byCount[4] ?? 0.0);
        } elseif ($childCount === 4) {
            $nextDiscount = (float) (($byCount[5] ?? 0.0) - ($byCount[4] ?? 0.0));
        }
        $nextExemption = $childCount >= 5 && $childCount < 6 && $rules['exemptSixth'];

        return [
            'childCount' => $childCount,
            'discount' => $discount,
            'nextDiscount' => round(max(0.0, $nextDiscount) * 100) / 100,
            'exemptCount' => $exemptCount,
            'nextExemption' => $nextExemption,
            'totalDue' => $totalNet,
            'totalPaid' => $totalPaid,
            'balance' => round(($totalNet - $totalPaid) * 100) / 100,
            'totalGross' => $totalGross,
            'totalNet' => $totalNet,
            'minervalGross' => $minervalGross,
            'minervalNet' => $minervalNet,
            'fixedGross' => round($fixedGross * 100) / 100,
            'otherGross' => round($otherGross * 100) / 100,
            'booksGross' => round($booksGross * 100) / 100,
            'enrollmentGross' => round($enrollmentGross * 100) / 100,
            'children' => $children,
        ];
    }

    /**
     * Reduction familiale for a family: rules + money amounts on the minerval.
     */
    public function familyDiscount(int|string $familyId): array
    {
        $finance = $this->familyFinance($familyId);
        $rules = $this->discountRules();

        return [
            'children' => $finance['childCount'],
            'discount' => $finance['discount'],
            'gross' => $finance['minervalGross'],
            'net' => $finance['minervalNet'],
            'rules' => $rules,
        ];
    }

    /**
     * Ids (as strings) of the students currently exempt from the minerval.
     * A student is exempt when explicitly flagged, or when he/she is the 6th
     * (last registered) active child of a 6+ children family.
     */
    public function exemptStudentIds(int|string|null $familyId = null): array
    {
        $query = Student::query()->where('status', 'active');

        if ($familyId !== null) {
            $query->where('family_id', $familyId);
        }

        $ids = [];
        foreach ($query->orderBy('family_id')->orderBy('id')->get()->groupBy('family_id') as $students) {
            $students = $students->values();
            $exemptFamily = $students->count() >= 6;
            foreach ($students as $student) {
                if ((bool) $student->is_exempt || ($exemptFamily && (string) $student->id === (string) $students->last()->id)) {
                    $ids[] = (string) $student->id;
                }
            }
        }

        return array_values(array_unique($ids));
    }

    /**
     * Status automatique d'une tranche (§7 du cahier des charges) :
     * a_venir / ouverte / partiellement_payee / payee / echue.
     */
    public function trancheStatus(int $term, float $due, float $paid, ?TermPeriod $period): string
    {
        if ($due <= 0.0) {
            return 'payee';
        }
        if ($paid >= $due) {
            return 'payee';
        }

        $today = Carbon::today();

        if ($period !== null && $period->at_enrollment) {
            return $paid > 0.0 ? 'partiellement_payee' : 'ouverte';
        }

        if ($period !== null && $period->opens_at !== null && $today->lt($period->opens_at)) {
            return 'a_venir';
        }

        if ($period !== null && $period->closes_at !== null && $today->gt($period->closes_at)) {
            return 'echue';
        }

        return $paid > 0.0 ? 'partiellement_payee' : 'ouverte';
    }

    /**
     * Remaining amount a family can still pay for a given nature, or null
     * when the nature is unknown to the fee system.
     */
    public function natureRemaining(Student $student, string $nature): ?float
    {
        $class = $student->schoolClass;
        $payments = Payment::where('student_id', $student->id)
            ->where('status', 'confirmed')
            ->get();
        $grouped = $this->groupPaidByNature($payments);

        $due = null;
        if (in_array($nature, [...self::ENROLLMENT_NATURES, ...self::FIXED_NATURES, ...self::OTHER_NATURES], true)) {
            $setting = FeeSetting::where('label', $nature)->first();
            $due = $setting ? (float) $setting->amount : null;
            if ($due !== null && in_array($nature, self::ENROLLMENT_NATURES, true) && $student->is_teacher_child) {
                $due = 0.0;
            }
        } elseif ($nature === 'livres' && $class) {
            $due = (float) $class->books;
        } elseif (preg_match('/^tranche([123])$/', (string) $nature, $m) === 1 && $class) {
            $due = $student->is_entitled || $this->studentIsExempt($student) ? 0.0 : (float) $class->{'tranche'.$m[1]};
        }

        if ($due === null) {
            return null;
        }

        return round(max(0.0, $due - (float) ($grouped[$nature] ?? 0.0)) * 100) / 100;
    }

    protected function studentIsExempt(Student $student): bool
    {
        if ((bool) $student->is_exempt) {
            return true;
        }

        $rules = $this->discountRules();
        if (! $rules['exemptSixth']) {
            return false;
        }

        $siblings = Student::where('family_id', $student->family_id)
            ->where('status', 'active')
            ->orderBy('id')
            ->get();

        return $siblings->count() >= 6 && (string) $siblings->last()->id === (string) $student->id;
    }

    protected function sumFees(Collection $feeSettings, array $natures): float
    {
        return (float) $feeSettings->whereIn('label', $natures)->sum('amount');
    }

    protected function groupPaidByNature(Collection $payments): array
    {
        $grouped = [];
        foreach ($payments as $payment) {
            if ((string) $payment->status !== 'confirmed') {
                continue;
            }
            $nature = $payment->category;
            $grouped[$nature] = ($grouped[$nature] ?? 0) + (float) $payment->amount;
        }

        return $grouped;
    }

    protected function sumGroup(array $grouped, array $natures): float
    {
        $total = 0.0;
        foreach ($natures as $nature) {
            $total += $grouped[$nature] ?? 0.0;
        }

        return (float) $total;
    }

    /**
     * Build the line-by-line breakdown for the student finance payload.
     */
    protected function buildLines(Collection $feeSettings, $class, array $grouped, array $tranches, bool $teacherChild = false): array
    {
        $lines = [];

        foreach ($feeSettings as $fee) {
            $key = (string) $fee->label;
            $due = $teacherChild && in_array($key, self::ENROLLMENT_NATURES, true) ? 0.0 : (float) $fee->amount;
            $paid = (float) ($grouped[$key] ?? 0.0);
            // Frais non dus et non payés (montant à 0, enfant d'enseignant…) : pas de ligne.
            if ($due <= 0.0 && $paid <= 0.0) {
                continue;
            }
            $lines[] = [
                'key' => $key,
                'label' => \App\Support\Payloads::feeLabel($key),
                'due' => round($due * 100) / 100,
                'paid' => round($paid * 100) / 100,
                'remaining' => round(max(0.0, $due - $paid) * 100) / 100,
            ];
        }

        if ($class) {
            $books = (float) $class->books;
            $booksPaid = (float) ($grouped['livres'] ?? 0.0);
            if ($books > 0 || $booksPaid > 0) {
                $lines[] = [
                    'key' => 'livres',
                    'label' => \App\Support\Payloads::feeLabel('livres'),
                    'due' => round($books * 100) / 100,
                    'paid' => round($booksPaid * 100) / 100,
                    'remaining' => round(max(0.0, $books - $booksPaid) * 100) / 100,
                ];
            }

            foreach ([1, 2, 3] as $term) {
                $due = (float) $tranches[$term - 1]['due'];
                $paid = (float) ($grouped['tranche'.$term] ?? 0.0);
                // Minerval non dû (ayant droit, exonéré) et rien de payé : pas de ligne.
                if ($due <= 0.0 && $paid <= 0.0) {
                    continue;
                }
                $lines[] = [
                    'key' => 'tranche'.$term,
                    'label' => $tranches[$term - 1]['label'].' — Minerval',
                    'due' => round($due * 100) / 100,
                    'paid' => round($paid * 100) / 100,
                    'remaining' => round(max(0.0, $due - $paid) * 100) / 100,
                ];
            }
        }

        return $lines;
    }
}