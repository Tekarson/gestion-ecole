<?php

namespace Tests\Unit;

use App\Models\Family;
use App\Models\Payment;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Services\ReferenceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReferenceServiceTest extends TestCase
{
    use RefreshDatabase;

    private ReferenceService $references;

    private Family $family;

    private SchoolClass $class;

    protected function setUp(): void
    {
        parent::setUp();
        $this->references = new ReferenceService;
        $this->family = Family::create(['parent_name' => 'Famille Test', 'phone' => '+243800000000']);
        $this->class = SchoolClass::create([
            'name' => '1A',
            'level' => 'Primaire',
            'tranche1' => 120,
            'tranche2' => 120,
            'tranche3' => 120,
            'books' => 75,
        ]);
    }

    public function testNextMatriculeStartsAtCurrentYearAndIncrements(): void
    {
        $this->assertSame('2026-0001', $this->references->nextMatricule());

        Student::create([
            'first_name' => 'Naomi',
            'last_name' => 'Test',
            'gender' => 'F',
            'family_id' => $this->family->id,
            'class_id' => $this->class->id,
            'matricule' => $this->references->nextMatricule(),
            'status' => 'active',
        ]);

        $this->assertSame('2026-0002', $this->references->nextMatricule());
    }

    public function testNextPaymentReferenceIncrements(): void
    {
        $this->assertSame('REC-2026-000001', $this->references->nextPaymentReference());

        $student = Student::create([
            'first_name' => 'Ruth',
            'last_name' => 'Test',
            'gender' => 'F',
            'family_id' => $this->family->id,
            'class_id' => $this->class->id,
            'matricule' => '2026-0001',
            'status' => 'active',
        ]);

        Payment::create([
            'reference' => $this->references->nextPaymentReference(),
            'family_id' => $this->family->id,
            'student_id' => $student->id,
            'amount' => 50,
            'method' => 'especes',
            'date' => now(),
            'status' => 'confirmed',
        ]);

        $this->assertSame('REC-2026-000002', $this->references->nextPaymentReference());
    }

    public function testShortYearReturnsTwoDigits(): void
    {
        $this->assertSame('26', $this->references->shortYear('2026-2027'));
        $this->assertSame('26', $this->references->shortYear());
        $this->assertSame('31', $this->references->shortYear('2031-2032'));
    }
}