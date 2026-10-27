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

class AdminStudentsTest extends TestCase
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

    private function grantAll(User $user, array $exclude = []): void
    {
        $modules = array_values(array_diff(
            ['dashboard', 'eleves', 'familles', 'paiements', 'journal', 'parametres'],
            $exclude,
        ));

        foreach ($modules as $module) {
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

    private function class(string $name = '1A', string $level = 'Primaire'): SchoolClass
    {
        return SchoolClass::create([
            'name' => $name,
            'level' => $level,
            'tranche1' => 120,
            'tranche2' => 120,
            'tranche3' => 120,
            'books' => 75,
        ]);
    }

    private function family(string $name = 'Parent Test'): Family
    {
        return Family::create(['parent_name' => $name, 'phone' => '+243800000000']);
    }

    private function student(array $attrs = []): Student
    {
        static $i = 0;
        $i++;
        $family = $this->family();
        $class = $this->class('C'.$i);

        return Student::create(array_merge([
            'first_name' => 'Ruth',
            'last_name' => 'Test',
            'gender' => 'F',
            'family_id' => $family->id,
            'class_id' => $class->id,
            'matricule' => '2026-'.str_pad((string) $i, 4, '0', STR_PAD_LEFT),
            'is_exempt' => false,
            'status' => 'active',
        ], $attrs));
    }

    public function testAdminListsStudents(): void
    {
        $this->student();
        $this->student(attrs: ['first_name' => 'Idrissa', 'matricule' => '2026-0002']);

        $this->withToken($this->adminToken)
            ->getJson('/api/v1/admin/students')
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonPath('0.matricule', '2026-0001');
    }

    public function testAdminCreatesStudentWithMatriculeAndAuditLog(): void
    {
        $family = $this->family();
        $class = $this->class();

        $this->withToken($this->adminToken)
            ->postJson('/api/v1/admin/students', [
                'first_name' => 'Grace',
                'last_name' => 'Mwamba',
                'gender' => 'F',
                'class_id' => $class->id,
                'family_id' => $family->id,
            ])
            ->assertCreated()
            ->assertJsonPath('full_name', 'Grace Mwamba')
            ->assertJsonPath('class_name', '1A')
            ->assertJsonPath('status', 'active');

        $this->assertDatabaseHas('students', ['first_name' => 'Grace', 'last_name' => 'Mwamba']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'student.created']);

        $created = Student::where('first_name', 'Grace')->first();
        $this->assertMatchesRegularExpression('/^2026-\d+$/', $created->matricule);
    }

    public function testAdminUpdatesStudentClassStatusAndExemption(): void
    {
        $student = $this->student();
        $target = $this->class('2A', 'Primaire');

        $this->withToken($this->adminToken)
            ->putJson('/api/v1/admin/students/'.$student->id, [
                'class_id' => $target->id,
                'status' => 'inactive',
                'is_exempt' => true,
            ])
            ->assertOk()
            ->assertJsonPath('status', 'inactive')
            ->assertJsonPath('is_exempt', true)
            ->assertJsonPath('class_name', '2A');

        $this->assertDatabaseHas('audit_logs', ['action' => 'student.updated']);
    }

    public function testAdminWithoutElevesModuleIsForbidden(): void
    {
        $user = User::create([
            'full_name' => 'Admin limite',
            'email' => 'limite@ntshik.cd',
            'password' => Hash::make('password'),
            'role' => 'admin',
        ]);
        // All modules except `eleves`.
        $this->grantAll($user, exclude: ['eleves']);
        $token = $user->createToken('ntshik')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/v1/admin/students')
            ->assertStatus(403);
    }

public function testSettingsCreateAndDeleteEmptyClass(): void
    {
        FeeSetting::create(['label' => 'inscription', 'amount' => 200, 'category' => 'inscription', 'school_year' => '2026-2027']);
        $this->class('1A');

        $this->withToken($this->adminToken)->putJson('/api/v1/admin/settings', [
            'feeSettings' => [
                ['key' => 'inscription', 'label' => "Frais d'inscription", 'amount' => 200, 'sort_order' => 0],
            ],
            'classes' => [
                ['id' => null, 'name' => '5A', 'section' => 'Primaire', 'tranche1' => 140, 'tranche2' => 140, 'tranche3' => 140, 'books' => 90],
            ],
            'deletedIds' => [$this->class('2A')->id],
            'school_year' => '2027-2028',
            'current_term' => 2,
        ])->assertOk();

        $this->assertDatabaseHas('school_classes', ['name' => '5A', 'level' => 'Primaire']);
        $this->assertSame('2027-2028', \App\Models\Setting::get('school_year'));
        $this->assertSame(2, \App\Models\Setting::get('current_term'));
    }

    public function testSettingsCannotDeleteClassWithStudents(): void
    {
        FeeSetting::create(['label' => 'inscription', 'amount' => 200, 'category' => 'inscription', 'school_year' => '2026-2027']);
        $class = $this->class('1A');
        $this->student(attrs: ['class_id' => $class->id]);

        $this->withToken($this->adminToken)
            ->putJson('/api/v1/admin/settings', [
                'feeSettings' => [
                    ['key' => 'inscription', 'label' => "Frais d'inscription", 'amount' => 200, 'sort_order' => 0],
                ],
                'classes' => [
                    ['id' => $class->id, 'name' => '1A', 'section' => 'Primaire', 'tranche1' => 120, 'tranche2' => 120, 'tranche3' => 120, 'books' => 75],
                ],
                'deletedIds' => [$class->id],
            ])
            ->assertStatus(409);

        $this->assertDatabaseHas('school_classes', ['id' => $class->id]);
    }

    public function testSettingsRejectDuplicateClassName(): void
    {
        $this->class('1A');

        $this->withToken($this->adminToken)
            ->putJson('/api/v1/admin/settings', [
                'feeSettings' => [],
                'classes' => [
                    ['id' => null, 'name' => '1A', 'section' => 'Primaire', 'tranche1' => 140, 'tranche2' => 140, 'tranche3' => 140, 'books' => 90],
                ],
            ])
            ->assertStatus(422);
    }

    public function testPaymentStoreStampsActiveSchoolYear(): void
    {
        \App\Models\Setting::set('school_year', '2027-2028');

        $family = Family::create(['parent_name' => 'Parent', 'phone' => '+243800000001']);
        $user = User::create([
            'full_name' => 'Parent',
            'email' => 'parent@ntshik.cd',
            'password' => Hash::make('password'),
            'role' => 'family',
            'family_id' => $family->id,
        ]);
        $class = $this->class('1A');
        $student = Student::create([
            'first_name' => 'Ruth',
            'last_name' => 'Test',
            'gender' => 'F',
            'family_id' => $family->id,
            'class_id' => $class->id,
            'matricule' => '2026-0001',
            'status' => 'active',
        ]);
        $token = $user->createToken('ntshik')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/v1/payments', [
                'student_id' => $student->id,
                'nature' => 'inscription',
                'amount' => 200,
                'method' => 'especes',
            ])
            ->assertCreated()
            ->assertJsonPath('school_year', '2027-2028');

        $this->assertDatabaseHas('payments', [
            'student_id' => $student->id,
            'school_year' => '2027-2028',
        ]);
    }

    public function testDashboardReportsRevenueByYear(): void
    {
        $family = $this->family();
        Payment::create([
            'reference' => 'REC-2026-000001',
            'family_id' => $family->id,
            'student_id' => $this->student(attrs: ['family_id' => $family->id])->id,
            'amount' => 200,
            'method' => 'especes',
            'date' => now(),
            'category' => 'inscription',
            'school_year' => '2025-2026',
            'status' => 'confirmed',
        ]);
        Payment::create([
            'reference' => 'REC-2026-000002',
            'family_id' => $family->id,
            'student_id' => $this->student(attrs: ['family_id' => $family->id])->id,
            'amount' => 150,
            'method' => 'especes',
            'date' => now(),
            'category' => 'uniforme',
            'school_year' => '2026-2027',
            'status' => 'confirmed',
        ]);

        $this->withToken($this->adminToken)
            ->getJson('/api/v1/admin/dashboard')
            ->assertOk()
            ->assertJsonPath('revenueByYear.0.year', '2026-2027')
            ->assertJsonPath('revenueByYear.0.totalPaid', 150)
            ->assertJsonPath('revenueByYear.1.year', '2025-2026')
            ->assertJsonPath('revenueByYear.1.totalPaid', 200);
    }
}