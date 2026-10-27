<?php

namespace Tests\Feature;

use App\Models\Family;
use App\Models\FeeSetting;
use App\Models\Notification;
use App\Models\Payment;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class FamilyApiTest extends TestCase
{
    use RefreshDatabase;

    private Family $family;

    private User $user;

    private SchoolClass $class;

    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        $this->family = Family::create(['parent_name' => 'Renedy Karume', 'phone' => '+243812345678']);
        $this->user = User::create([
            'full_name' => 'Renedy Karume',
            'email' => 'renedy@ntshik.cd',
            'password' => Hash::make('password'),
            'role' => 'family',
            'family_id' => $this->family->id,
        ]);
        $this->class = SchoolClass::create([
            'name' => '1A',
            'level' => 'Primaire',
            'tranche1' => 120,
            'tranche2' => 120,
            'tranche3' => 120,
            'books' => 75,
        ]);
        $this->token = $this->user->createToken('ntshik')->plainTextToken;

        FeeSetting::create(['label' => 'inscription', 'amount' => 200, 'category' => 'inscription', 'school_year' => '2026-2027']);
        FeeSetting::create(['label' => 'uniforme', 'amount' => 40, 'category' => 'fixed', 'school_year' => '2026-2027']);
        FeeSetting::create(['label' => 'assurance', 'amount' => 20, 'category' => 'fixed', 'school_year' => '2026-2027']);
        FeeSetting::create(['label' => 'divers', 'amount' => 150, 'category' => 'fixed', 'school_year' => '2026-2027']);
    }

    private function addStudent(string $first, bool $withPayment = false): Student
    {
        static $i = 1;
        $student = Student::create([
            'first_name' => $first,
            'last_name' => 'Karume',
            'gender' => 'F',
            'family_id' => $this->family->id,
            'class_id' => $this->class->id,
            'matricule' => '2026-000'.($i++),
            'is_exempt' => false,
            'status' => 'active',
        ]);

        if ($withPayment) {
            Payment::create([
                'reference' => 'REC-2026-00000'.$i,
                'family_id' => $this->family->id,
                'student_id' => $student->id,
                'amount' => 200,
                'method' => 'especes',
                'date' => now(),
                'category' => 'inscription',
                'status' => 'confirmed',
            ]);
        }

        return $student;
    }

    public function testFamilyDashboardReturnsFinanceAndStudents(): void
    {
        $this->addStudent('Ruth', withPayment: true);
        $this->addStudent('Idrissa');

        $response = $this->withToken($this->token)->getJson('/api/v1/family');

        $response->assertOk()
            ->assertJsonPath('profile.role', 'family')
            ->assertJsonPath('school_year', '2026-2027')
            ->assertJsonCount(2, 'students')
            ->assertJsonStructure([
                'finance' => ['childCount', 'totalDue', 'totalPaid', 'balance', 'minervalGross', 'minervalNet'],
                'payments',
                'notifications',
            ]);
    }

    public function testCreateStudentAssignsMatricule(): void
    {
        $response = $this->withToken($this->token)->postJson('/api/v1/students', [
            'first_name' => 'Grace',
            'last_name' => 'Karume',
            'class_id' => (string) $this->class->id,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('student.matricule', '2026-0001')
            ->assertJsonPath('student.class_id', (string) $this->class->id);
    }

    public function testCreatePaymentIsPendingWithReference(): void
    {
        $student = $this->addStudent('Ruth');

        $response = $this->withToken($this->token)->postJson('/api/v1/payments', [
            'student_id' => (string) $student->id,
            'nature' => 'tranche1',
            'amount' => 120,
            'method' => 'mobile_money',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'en_attente')
            ->assertJsonPath('reference', 'REC-2026-000001')
            ->assertJsonPath('nature', 'tranche1');
    }

    public function testFamilyCannotPayForAnotherFamilysStudent(): void
    {
        $otherFamily = Family::create(['parent_name' => 'Autre Famille', 'phone' => '+243820000001']);
        $otherStudent = Student::create([
            'first_name' => 'Autre',
            'last_name' => 'Enfant',
            'gender' => 'M',
            'family_id' => $otherFamily->id,
            'class_id' => $this->class->id,
            'matricule' => '2026-0099',
            'status' => 'active',
        ]);

        $this->withToken($this->token)->postJson('/api/v1/payments', [
            'student_id' => (string) $otherStudent->id,
            'nature' => 'tranche1',
            'amount' => 120,
            'method' => 'especes',
        ])->assertStatus(404);
    }

    public function testStudentFinanceEndpoint(): void
    {
        $student = $this->addStudent('Ruth', withPayment: true);

        $this->withToken($this->token)
            ->getJson('/api/v1/students/'.$student->id)
            ->assertOk()
            ->assertJsonStructure(['student' => ['id', 'matricule'], 'cls', 'finance' => ['totalDue', 'totalPaid', 'balance']]);
    }

    public function testMarkNotificationRead(): void
    {
        $notification = Notification::create([
            'user_id' => $this->user->id,
            'title' => 'Bienvenue',
            'message' => 'Espace prêt.',
        ]);

        $this->withToken($this->token)
            ->patchJson('/api/v1/notifications/'.$notification->id.'/read')
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->assertNotNull($notification->refresh()->read_at);
    }

    public function testFamilyReceiptRestrictedUntilConfirmed(): void
    {
        $student = $this->addStudent('Ruth');
        $payment = Payment::create([
            'reference' => 'REC-2026-000001',
            'family_id' => $this->family->id,
            'student_id' => $student->id,
            'amount' => 120,
            'method' => 'especes',
            'date' => now(),
            'category' => 'tranche1',
            'status' => 'pending',
        ]);

        $this->withToken($this->token)
            ->get('/api/v1/payments/'.$payment->id.'/recu')
            ->assertStatus(403);

        $payment->update(['status' => 'confirmed']);

        $this->withToken($this->token)
            ->get('/api/v1/payments/'.$payment->id.'/recu')
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }
}