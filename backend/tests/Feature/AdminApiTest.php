<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Family;
use App\Models\FeeSetting;
use App\Models\ModulePermission;
use App\Models\Payment;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private string $adminToken;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'full_name' => 'Administrateur',
            'email' => 'admin@ntshik.cd',
            'password' => Hash::make('password'),
            'role' => 'admin',
        ]);
        $this->grantAll($this->admin);
        $this->adminToken = $this->admin->createToken('ntshik')->plainTextToken;
    }

    private function grantAll(User $user): void
    {
        foreach (['dashboard', 'familles', 'paiements', 'journal', 'parametres'] as $module) {
            ModulePermission::create([
                'user_id' => $user->id,
                'module' => $module,
                'can_read' => true,
                'can_create' => true,
                'can_update' => true,
                'can_delete' => true,
            ]);
        }
    }

    private function familyWithPendingPayment(): array
    {
        $family = Family::create(['parent_name' => 'Parent Test', 'phone' => '+243800000000']);
        $class = SchoolClass::create([
            'name' => '2A',
            'level' => 'Primaire',
            'tranche1' => 120,
            'tranche2' => 120,
            'tranche3' => 120,
            'books' => 75,
        ]);
        FeeSetting::create(['label' => 'inscription', 'amount' => 200, 'category' => 'inscription', 'school_year' => '2026-2027']);
        $student = Student::create([
            'first_name' => 'Ruth',
            'last_name' => 'Test',
            'gender' => 'F',
            'family_id' => $family->id,
            'class_id' => $class->id,
            'matricule' => '2026-0001',
            'status' => 'active',
        ]);
        $payment = Payment::create([
            'reference' => 'REC-2026-000001',
            'family_id' => $family->id,
            'student_id' => $student->id,
            'amount' => 200,
            'method' => 'especes',
            'date' => now(),
            'category' => 'inscription',
            'status' => 'pending',
        ]);

        return ['family' => $family, 'payment' => $payment];
    }

    public function testDashboardReturnsStats(): void
    {
        $this->familyWithPendingPayment();

        $this->withToken($this->adminToken)
            ->getJson('/api/v1/admin/dashboard')
            ->assertOk()
            ->assertJsonStructure([
                'stats' => ['studentCount', 'familyCount', 'pendingCount', 'totalPaid', 'totalDue', 'placeConfirmed'],
                'bySection',
                'pending',
            ])
            ->assertJsonPath('stats.pendingCount', 1);
    }

    public function testFamilyCannotAccessAdmin(): void
    {
        $user = User::create([
            'full_name' => 'Parent Test',
            'email' => 'parent@ntshik.cd',
            'password' => Hash::make('password'),
            'role' => 'family',
        ]);
        $token = $user->createToken('ntshik')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/v1/admin/dashboard')
            ->assertStatus(403);
    }

    public function testAdminListsPayments(): void
    {
        $this->familyWithPendingPayment();

        $this->withToken($this->adminToken)
            ->getJson('/api/v1/admin/payments')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.status', 'en_attente');
    }

    public function testAdminConfirmsPendingPaymentAndLogs(): void
    {
        $data = $this->familyWithPendingPayment();
        $payment = $data['payment'];

        $this->withToken($this->adminToken)
            ->patchJson('/api/v1/payments/'.$payment->id.'/status', [
                'status' => 'confirmed',
            ])
            ->assertOk()
            ->assertJsonPath('status', 'confirme');

        $this->assertEquals('confirmed', $payment->refresh()->status);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'payment.confirmed',
            'family_id' => $data['family']->id,
        ]);
    }

    public function testAdminUpdatesSettings(): void
    {
        FeeSetting::create(['label' => 'uniforme', 'amount' => 40, 'category' => 'fixed', 'school_year' => '2026-2027']);
        $class = SchoolClass::create([
            'name' => '1A',
            'level' => 'Primaire',
            'tranche1' => 120,
            'tranche2' => 120,
            'tranche3' => 120,
            'books' => 75,
        ]);

        $this->withToken($this->adminToken)->putJson('/api/v1/admin/settings', [
            'feeSettings' => [
                ['key' => 'uniforme', 'label' => 'Uniforme', 'amount' => 45],
            ],
            'classes' => [
                [
                    'id' => $class->id,
                    'name' => '1A',
                    'section' => 'Primaire',
                    'tranche1' => 150,
                    'tranche2' => 150,
                    'tranche3' => 150,
                    'books' => 100,
                ],
            ],
        ])->assertOk();

        $this->assertDatabaseHas('fee_settings', ['label' => 'uniforme', 'amount' => 45]);
        $this->assertDatabaseHas('school_classes', ['id' => $class->id, 'tranche1' => 150, 'books' => 100]);
    }

    public function testAdminRecordsCashPaymentConfirmedImmediately(): void
    {
        $data = $this->familyWithPendingPayment();
        $student = Student::where('family_id', $data['family']->id)->first();

        $this->withToken($this->adminToken)
            ->postJson('/api/v1/admin/payments', [
                'student_id' => $student->id,
                'nature' => 'uniforme',
                'amount' => 40,
                'method' => 'especes',
            ])
            ->assertStatus(201)
            ->assertJsonPath('status', 'confirme')
            ->assertJsonPath('nature', 'uniforme')
            ->assertJsonPath('amount', 40)
            ->assertJsonPath('method', 'especes');

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'payment.recorded',
            'family_id' => $data['family']->id,
        ]);
    }

    public function testAdminCannotRecordPaymentWithoutCreatePermission(): void
    {
        $data = $this->familyWithPendingPayment();
        $student = Student::where('family_id', $data['family']->id)->first();

        $limited = User::create([
            'full_name' => 'Caissier',
            'email' => 'caissier@ntshik.cd',
            'password' => Hash::make('password'),
            'role' => 'admin',
        ]);
        ModulePermission::create([
            'user_id' => $limited->id,
            'module' => 'paiements',
            'can_read' => true,
            'can_create' => false,
            'can_update' => true,
            'can_delete' => false,
        ]);

        $this->withToken($limited->createToken('ntshik')->plainTextToken)
            ->postJson('/api/v1/admin/payments', [
                'student_id' => $student->id,
                'nature' => 'uniforme',
                'amount' => 40,
                'method' => 'especes',
            ])
            ->assertStatus(403);
    }

    public function testAdminReceiptRestrictedUntilConfirmed(): void
    {
        $data = $this->familyWithPendingPayment();
        $payment = $data['payment'];

        $this->withToken($this->adminToken)
            ->get('/api/v1/admin/payments/'.$payment->id.'/recu')
            ->assertStatus(403);

        $payment->update(['status' => 'confirmed']);

        $this->withToken($this->adminToken)
            ->get('/api/v1/admin/payments/'.$payment->id.'/recu')
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }
}