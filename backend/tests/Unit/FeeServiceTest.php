<?php

namespace Tests\Unit;

use App\Models\Family;
use App\Models\FeeSetting;
use App\Models\Payment;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Services\FeeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FeeServiceTest extends TestCase
{
    use RefreshDatabase;

    private FeeService $fees;

    private Family $family;

    private SchoolClass $class;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fees = new FeeService;
        $this->family = Family::create(['parent_name' => 'Parent Test', 'phone' => '+243800000000']);
        $this->class = SchoolClass::create([
            'name' => '3A',
            'level' => 'Primaire',
            'tranche1' => 120,
            'tranche2' => 120,
            'tranche3' => 120,
            'books' => 75,
        ]);

        FeeSetting::create(['label' => 'inscription', 'amount' => 200, 'category' => 'inscription', 'school_year' => '2026-2027']);
        FeeSetting::create(['label' => 'uniforme', 'amount' => 40, 'category' => 'fixed', 'school_year' => '2026-2027']);
        FeeSetting::create(['label' => 'assurance', 'amount' => 20, 'category' => 'fixed', 'school_year' => '2026-2027']);
        FeeSetting::create(['label' => 'divers', 'amount' => 150, 'category' => 'fixed', 'school_year' => '2026-2027']);
    }

    private function makeStudent(string $firstName): Student
    {
        static $i = 1;

        return Student::create([
            'first_name' => $firstName,
            'last_name' => 'Test',
            'gender' => 'F',
            'family_id' => $this->family->id,
            'class_id' => $this->class->id,
            'matricule' => '2026-9'.str_pad((string) $i++, 3, '0', STR_PAD_LEFT),
            'is_exempt' => false,
            'status' => 'active',
        ]);
    }

    public function testStudentFinanceComputesEveryComponent(): void
    {
        $student = $this->makeStudent('Alima');

        Payment::create([
            'reference' => 'REC-2026-000001',
            'family_id' => $this->family->id,
            'student_id' => $student->id,
            'amount' => 200,
            'method' => 'especes',
            'date' => now(),
            'category' => 'inscription',
            'status' => 'confirmed',
        ]);
        Payment::create([
            'reference' => 'REC-2026-000002',
            'family_id' => $this->family->id,
            'student_id' => $student->id,
            'amount' => 100,
            'method' => 'especes',
            'date' => now(),
            'category' => 'tranche1',
            'status' => 'confirmed',
        ]);

        $finance = $this->fees->studentFinance($student, $student->payments);

        $this->assertSame(360.0, $finance['minervalDue']);
        $this->assertSame(75.0, $finance['booksDue']);
        $this->assertSame(210.0, $finance['fixedDue']);
        $this->assertSame(200.0, $finance['enrollmentDue']);
        $this->assertSame(845.0, $finance['totalDue']);
        $this->assertSame(300.0, $finance['totalPaid']);
        $this->assertSame(545.0, $finance['balance']);

        // La place n'est pas confirmée : la tranche 1 n'est que partiellement payée.
        $this->assertFalse($finance['placeConfirmed']);

        $this->assertCount(3, $finance['tranches']);
        $this->assertSame('partiellement_payee', $finance['tranches'][0]['status']);
        $this->assertSame('ouverte', $finance['tranches'][1]['status']);
        $this->assertSame('ouverte', $finance['tranches'][2]['status']);

        $this->assertFalse($finance['exempt']);
    }

    public function testPlaceIsConfirmedWhenEnrollmentAndTranche1Paid(): void
    {
        $student = $this->makeStudent('Alima');

        foreach (['inscription' => 200, 'tranche1' => 120] as $nature => $amount) {
            Payment::create([
                'reference' => 'REC-2026-00000'.($nature === 'inscription' ? '1' : '2'),
                'family_id' => $this->family->id,
                'student_id' => $student->id,
                'amount' => $amount,
                'method' => 'especes',
                'date' => now(),
                'category' => $nature,
                'status' => 'confirmed',
            ]);
        }

        $finance = $this->fees->studentFinance($student, $student->payments);

        $this->assertTrue($finance['placeConfirmed']);
    }

    public function testPendingAndCancelledPaymentsAreNotCounted(): void
    {
        $student = $this->makeStudent('Bilale');

        foreach (['pending', 'cancelled'] as $status) {
            Payment::create([
                'reference' => 'REC-2026-0000'.(str_starts_with($status, 'p') ? '1' : '2'),
                'family_id' => $this->family->id,
                'student_id' => $student->id,
                'amount' => 500,
                'method' => 'especes',
                'date' => now(),
                'category' => 'divers',
                'status' => $status,
            ]);
        }

        $finance = $this->fees->studentFinance($student, $student->payments);

        $this->assertSame(0.0, $finance['totalPaid']);
        $this->assertSame(845.0, $finance['totalDue']);
    }

    public function testFamilyFinanceNoDiscountBelowFourChildren(): void
    {
        $this->makeStudent('Cédric');
        $this->makeStudent('Deborah');

        $finance = $this->fees->familyFinance((int) $this->family->id);

        $this->assertSame(2, $finance['childCount']);
        $this->assertSame(720.0, $finance['minervalGross']);
        $this->assertSame(0.0, $finance['discount']);
        $this->assertSame(720.0, $finance['minervalNet']);
        $this->assertSame(500.0, $finance['nextDiscount']);
        $this->assertFalse($finance['nextExemption']);
    }

    public function testFourChildrenGetFlat500Discount(): void
    {
        foreach (['Cédric', 'Deborah', 'Elie', 'Flore'] as $name) {
            $this->makeStudent($name);
        }

        $finance = $this->fees->familyFinance((int) $this->family->id);

        $this->assertSame(4, $finance['childCount']);
        $this->assertSame(1440.0, $finance['minervalGross']);
        $this->assertSame(500.0, $finance['discount']);
        $this->assertSame(940.0, $finance['minervalNet']);
        $this->assertSame(500.0, $finance['nextDiscount']);
    }

    public function testFiveChildrenGetFlat1000DiscountAndHintSixthExemption(): void
    {
        foreach (['Cédric', 'Deborah', 'Elie', 'Flore', 'Gaspard'] as $name) {
            $this->makeStudent($name);
        }

        $finance = $this->fees->familyFinance((int) $this->family->id);

        $this->assertSame(5, $finance['childCount']);
        $this->assertSame(1800.0, $finance['minervalGross']);
        $this->assertSame(1000.0, $finance['discount']);
        $this->assertSame(800.0, $finance['minervalNet']);
        $this->assertSame(0.0, $finance['nextDiscount']);
        $this->assertTrue($finance['nextExemption']);
    }

    public function testSixChildrenOnlySixthIsExemptFromMinerval(): void
    {
        for ($i = 1; $i <= 6; $i++) {
            $this->makeStudent("Enfant{$i}");
        }

        $finance = $this->fees->familyFinance((int) $this->family->id);

        $this->assertSame(6, $finance['childCount']);
        $this->assertSame(1800.0, $finance['minervalGross']);
        $this->assertSame(0.0, $finance['discount']);
        $this->assertSame(1800.0, $finance['minervalNet']);
        $this->assertSame(1, $finance['exemptCount']);
        $this->assertFalse($finance['nextExemption']);
        $this->assertSame(0.0, $finance['nextDiscount']);
    }

    public function testExemptStudentIdsOnlyLastSixChildrenFamily(): void
    {
        $students = [];
        for ($i = 1; $i <= 6; $i++) {
            $students[] = $this->makeStudent("Frère{$i}");
        }

        $ids = $this->fees->exemptStudentIds((int) $this->family->id);

        $this->assertCount(1, $ids);
        $this->assertSame([(string) $students[5]->id], $ids);
    }

    public function testExplicitExemptFlagTakesPrecedence(): void
    {
        $explicit = $this->makeStudent('Cela est exonéré');
        $explicit->update(['is_exempt' => true]);

        $ids = $this->fees->exemptStudentIds((int) $this->family->id);

        $this->assertSame([(string) $explicit->id], $ids);
        $this->assertTrue($this->fees->studentFinance($explicit, $explicit->payments)['exempt']);
    }

    public function testFamilyDiscountReturnsAmountsAndRules(): void
    {
        $this->makeStudent('Gildas');
        $this->makeStudent('Hortense');

        $discount = $this->fees->familyDiscount((int) $this->family->id);

        $this->assertSame(2, $discount['children']);
        $this->assertSame(0.0, $discount['discount']);
        $this->assertSame(720.0, $discount['gross']);
        $this->assertSame(720.0, $discount['net']);
        $this->assertSame(500.0, $discount['rules']['byCount'][4]);
        $this->assertSame(1000.0, $discount['rules']['byCount'][5]);
        $this->assertTrue($discount['rules']['exemptSixth']);
    }

    public function testNatureRemainingCapsOverage(): void
    {
        $student = $this->makeStudent('Yann');

        $this->assertSame(120.0, $this->fees->natureRemaining($student, 'tranche1'));
        $this->assertSame(null, $this->fees->natureRemaining($student, 'inconnu'));

        Payment::create([
            'reference' => 'REC-2026-000001',
            'family_id' => $this->family->id,
            'student_id' => $student->id,
            'amount' => 80,
            'method' => 'especes',
            'date' => now(),
            'category' => 'tranche1',
            'status' => 'confirmed',
        ]);

        $this->assertSame(40.0, $this->fees->natureRemaining($student, 'tranche1'));
    }
}