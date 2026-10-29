<?php

namespace Tests\Feature;

use App\Models\Family;
use App\Models\FeeSetting;
use App\Models\Payment;
use App\Models\SchoolClass;
use App\Models\SchoolYear;
use App\Models\Student;
use App\Models\User;
use App\Services\FeeService;
use App\Support\SchoolContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SchoolYearTest extends TestCase
{
    use RefreshDatabase;

    private string $token;

    private SchoolClass $class;

    private Student $student;

    protected function setUp(): void
    {
        parent::setUp();

        \App\Models\Setting::set('school_year', '2026-2027');

        $super = User::create([
            'full_name' => 'Super',
            'email' => 'super@ntshik.cd',
            'password' => Hash::make('password'),
            'role' => 'superadmin',
        ]);
        $this->token = $super->createToken('ntshik')->plainTextToken;

        FeeSetting::create(['label' => 'inscription', 'amount' => 200, 'category' => 'inscription', 'school_year' => '2026-2027']);
        $this->class = SchoolClass::create(['name' => 'CP', 'level' => 'Primaire', 'tranche1' => 100, 'tranche2' => 100, 'tranche3' => 100, 'books' => 0]);
        $family = Family::create(['parent_name' => 'Parent', 'phone' => '+243800000000']);
        $this->student = Student::create([
            'first_name' => 'Ruth',
            'last_name' => 'Test',
            'gender' => 'F',
            'family_id' => $family->id,
            'class_id' => $this->class->id,
            'matricule' => '2026-0001',
            'status' => 'active',
        ]);
    }

    public function testNewStudentIsEnrolledInActiveYearWithHistory(): void
    {
        $this->assertSame('2026-2027', $this->student->school_year);
        $this->assertDatabaseHas('enrollments', ['student_id' => $this->student->id, 'school_year' => '2026-2027']);
    }

    public function testCreateAndActivateYearSwitchesTariffsAndArchivesStudents(): void
    {
        $this->withToken($this->token)
            ->postJson('/api/v1/admin/school-years', ['name' => '2027-2028', 'starts_on' => '2027-09-01', 'ends_on' => '2028-07-02'])
            ->assertCreated()
            ->assertJsonPath('years.0.name', '2027-2028')
            ->assertJsonPath('years.0.is_active', false);

        $next = SchoolYear::where('name', '2027-2028')->first();
        $this->withToken($this->token)
            ->postJson("/api/v1/admin/school-years/{$next->id}/activate")
            ->assertOk();

        SchoolContext::forget();
        $this->assertSame('2027-2028', SchoolContext::activeYear());
        $this->assertFalse($this->student->fresh()->isEnrolled());
        $this->assertSame(0, Student::enrolled()->count());

        // Barèmes propres à 2027-2028 ; ceux de 2026-2027 restent archivés.
        FeeSetting::where('label', 'inscription')->update(['amount' => 250]);
        (new \App\Services\SchoolYearService)->syncActiveTariffs();

        $old = SchoolYear::where('name', '2026-2027')->first();
        $this->withToken($this->token)->postJson("/api/v1/admin/school-years/{$old->id}/activate")->assertOk();
        $this->assertSame(200.0, (float) FeeSetting::where('label', 'inscription')->value('amount'));

        $this->withToken($this->token)->postJson("/api/v1/admin/school-years/{$next->id}/activate")->assertOk();
        $this->assertSame(250.0, (float) FeeSetting::where('label', 'inscription')->value('amount'));
    }

    public function testReenrollKeepsStudentAndIgnoresPreviousYearPayments(): void
    {
        Payment::create([
            'reference' => 'REC-2026-000001',
            'family_id' => $this->student->family_id,
            'student_id' => $this->student->id,
            'amount' => 200,
            'method' => 'especes',
            'date' => now(),
            'category' => 'inscription',
            'status' => 'confirmed',
            'school_year' => '2026-2027',
        ]);

        $this->withToken($this->token)->postJson('/api/v1/admin/school-years', ['name' => '2027-2028', 'activate' => true])->assertCreated();
        $ce1 = SchoolClass::create(['name' => 'CE1', 'level' => 'Primaire', 'tranche1' => 120, 'tranche2' => 120, 'tranche3' => 120, 'books' => 0]);

        $this->withToken($this->token)
            ->postJson('/api/v1/admin/students/reenroll', ['items' => [['id' => $this->student->id, 'class_id' => $ce1->id]]])
            ->assertOk()
            ->assertJsonPath('reenrolled', 1);

        SchoolContext::forget();
        $student = $this->student->fresh();
        $this->assertTrue($student->isEnrolled());
        $this->assertSame('2026-0001', $student->matricule);
        $this->assertDatabaseHas('enrollments', ['student_id' => $student->id, 'school_year' => '2027-2028', 'class_id' => $ce1->id]);
        $this->assertDatabaseHas('enrollments', ['student_id' => $student->id, 'school_year' => '2026-2027', 'class_id' => $this->class->id]);

        // Le paiement de 2026-2027 ne compte pas pour 2027-2028.
        $finance = (new FeeService)->studentFinance($student, $student->payments);
        $this->assertSame(0.0, $finance['enrollmentPaid']);
        $this->assertSame(200.0, $finance['enrollmentDue']);
    }

    public function testYearNameMustBeWellFormed(): void
    {
        $this->withToken($this->token)
            ->postJson('/api/v1/admin/school-years', ['name' => '2027'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('name');
    }

    public function testParentSeesArchivedChildAndReenrollsIt(): void
    {
        $parent = User::create([
            'full_name' => 'Parent',
            'email' => 'parent@ntshik.cd',
            'password' => Hash::make('password'),
            'role' => 'family',
            'family_id' => $this->student->family_id,
        ]);
        $this->withToken($this->token)->postJson('/api/v1/admin/school-years', ['name' => '2027-2028', 'activate' => true])->assertCreated();
        $this->app['auth']->forgetGuards();
        SchoolContext::forget();

        $token = $parent->createToken('ntshik')->plainTextToken;
        $this->withToken($token)
            ->getJson('/api/v1/family')
            ->assertOk()
            ->assertJsonCount(0, 'students')
            ->assertJsonPath('archived.0.matricule', '2026-0001');

        $this->withToken($token)
            ->postJson('/api/v1/students/'.$this->student->id.'/reenroll', ['class_id' => $this->class->id])
            ->assertOk();

        $this->withToken($token)
            ->getJson('/api/v1/family')
            ->assertJsonCount(1, 'students')
            ->assertJsonCount(0, 'archived');
    }
}
