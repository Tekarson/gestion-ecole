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

    public function testAdminCreateStudentRequiresFamily(): void
    {
        $class = $this->class();

        $this->withToken($this->adminToken)
            ->postJson('/api/v1/admin/students', [
                'first_name' => 'Grace',
                'last_name' => 'Mwamba',
                'gender' => 'F',
                'class_id' => $class->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('family_id');
    }

    public function testDeleteClassEndpoint(): void
    {
        $empty = $this->class('Vide');
        $student = $this->student();

        $this->withToken($this->adminToken)
            ->deleteJson('/api/v1/admin/classes/'.$student->class_id)
            ->assertStatus(409);

        $this->withToken($this->adminToken)
            ->deleteJson('/api/v1/admin/classes/'.$empty->id)
            ->assertOk();

        $this->assertDatabaseMissing('school_classes', ['id' => $empty->id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'class.deleted']);
    }

    public function testAdminFinanceListsOnlyRemainingFees(): void
    {
        FeeSetting::create(['label' => 'inscription', 'amount' => 200, 'category' => 'inscription', 'school_year' => '2026-2027']);
        FeeSetting::create(['label' => 'assurance', 'amount' => 20, 'category' => 'fixed', 'school_year' => '2026-2027']);
        $student = $this->student();
        Payment::create([
            'reference' => 'REC-2026-000001',
            'family_id' => $student->family_id,
            'student_id' => $student->id,
            'amount' => 20,
            'method' => 'especes',
            'date' => now(),
            'category' => 'assurance',
            'status' => 'confirmed',
        ]);

        $lines = $this->withToken($this->adminToken)
            ->getJson('/api/v1/admin/students/'.$student->id.'/finance')
            ->assertOk()
            ->json('lines');

        $remaining = collect($lines)->where('remaining', '>', 0)->pluck('key')->all();
        $this->assertContains('inscription', $remaining);
        $this->assertNotContains('assurance', $remaining);
    }

    public function testAdminPaymentCannotExceedRemaining(): void
    {
        FeeSetting::create(['label' => 'assurance', 'amount' => 20, 'category' => 'fixed', 'school_year' => '2026-2027']);
        $student = $this->student();

        $this->withToken($this->adminToken)
            ->postJson('/api/v1/admin/payments', [
                'student_id' => $student->id,
                'nature' => 'assurance',
                'amount' => 50,
                'method' => 'especes',
            ])
            ->assertStatus(422);

        $this->withToken($this->adminToken)
            ->postJson('/api/v1/admin/payments', [
                'student_id' => $student->id,
                'nature' => 'assurance',
                'amount' => 20,
                'method' => 'especes',
            ])
            ->assertCreated();

        $this->withToken($this->adminToken)
            ->postJson('/api/v1/admin/payments', [
                'student_id' => $student->id,
                'nature' => 'assurance',
                'amount' => 20,
                'method' => 'especes',
            ])
            ->assertStatus(422);
    }

    public function testSolvencyReportSplitsSolventAndInsolvent(): void
    {
        FeeSetting::create(['label' => 'assurance', 'amount' => 20, 'category' => 'fixed', 'school_year' => '2026-2027']);
        $paid = $this->student(['first_name' => 'Paye']);
        $this->student(['first_name' => 'Doit', 'matricule' => '2026-0099']);
        Payment::create([
            'reference' => 'REC-2026-000001',
            'family_id' => $paid->family_id,
            'student_id' => $paid->id,
            'amount' => 20,
            'method' => 'especes',
            'date' => now(),
            'category' => 'assurance',
            'status' => 'confirmed',
        ]);

        $rows = collect($this->withToken($this->adminToken)
            ->getJson('/api/v1/admin/reports/solvency?nature=assurance')
            ->assertOk()
            ->json('rows'));

        $this->assertCount(2, $rows);
        $this->assertTrue($rows->firstWhere('student_name', 'Paye Test')['solvent']);
        $this->assertFalse($rows->firstWhere('student_name', 'Doit Test')['solvent']);
        $this->assertSame(20, $rows->firstWhere('student_name', 'Doit Test')['remaining']);
    }

    public function testConfirmPaymentStatusLogsAmount(): void
    {
        $student = $this->student();
        $payment = Payment::create([
            'reference' => 'REC-2026-000005',
            'family_id' => $student->family_id,
            'student_id' => $student->id,
            'amount' => 120,
            'method' => 'mobile_money',
            'date' => now(),
            'category' => 'tranche1',
            'status' => 'pending',
        ]);

        $this->withToken($this->adminToken)
            ->patchJson('/api/v1/payments/'.$payment->id.'/status', ['status' => 'confirmed'])
            ->assertOk()
            ->assertJsonPath('status', 'confirme');

        $log = AuditLog::where('action', 'payment.confirmed')->first();
        $this->assertSame(120, (int) $log->details['amount']);
    }

    public function testGestionnaireAndCollaborateurUseModulePermissions(): void
    {
        foreach (['gestionnaire', 'collaborateur'] as $role) {
            $user = User::create([
                'full_name' => ucfirst($role),
                'email' => $role.'@ntshik.cd',
                'password' => Hash::make('password'),
                'role' => $role,
            ]);
            ModulePermission::create([
                'user_id' => $user->id,
                'module' => 'eleves',
                'can_read' => true,
                'can_create' => false,
                'can_update' => false,
                'can_delete' => false,
            ]);
            $token = $user->createToken('ntshik')->plainTextToken;

            $this->withToken($token)->getJson('/api/v1/admin/students')->assertOk();
            $this->withToken($token)->getJson('/api/v1/admin/payments')->assertForbidden();
            $this->app['auth']->forgetGuards();
        }
    }

    public function testOnlySuperadminRenamesStudentsAndFamilies(): void
    {
        $student = $this->student();

        $this->withToken($this->adminToken)
            ->putJson('/api/v1/admin/students/'.$student->id, ['first_name' => 'Autre'])
            ->assertOk()
            ->assertJsonPath('first_name', 'Ruth');
        $this->app['auth']->forgetGuards();

        $super = User::create([
            'full_name' => 'Super',
            'email' => 'super@ntshik.cd',
            'password' => Hash::make('password'),
            'role' => 'superadmin',
        ]);
        $token = $super->createToken('ntshik')->plainTextToken;

        $this->withToken($token)
            ->putJson('/api/v1/admin/students/'.$student->id, ['first_name' => 'Rachel', 'postnom' => 'Mateso'])
            ->assertOk()
            ->assertJsonPath('first_name', 'Rachel')
            ->assertJsonPath('postnom', 'Mateso');

        $this->withToken($token)
            ->putJson('/api/v1/admin/families/'.$student->family_id, ['parent_name' => 'Nouveau Nom', 'phone' => '+243811111111'])
            ->assertOk();
        $this->assertDatabaseHas('families', ['id' => $student->family_id, 'parent_name' => 'Nouveau Nom']);
        $this->app['auth']->forgetGuards();

        $this->withToken($this->adminToken)
            ->putJson('/api/v1/admin/families/'.$student->family_id, ['parent_name' => 'X'])
            ->assertForbidden();
    }

    public function testSuperadminCreatesGestionnaire(): void
    {
        $super = User::create([
            'full_name' => 'Super',
            'email' => 'super@ntshik.cd',
            'password' => Hash::make('password'),
            'role' => 'superadmin',
        ]);

        $this->withToken($super->createToken('ntshik')->plainTextToken)
            ->postJson('/api/v1/admin/users', [
                'first_name' => 'Gina',
                'last_name' => 'Kabila',
                'email' => 'gina@ntshik.cd',
                'password' => 'secret123',
                'role' => 'gestionnaire',
                'modules' => ['paiements' => ['read' => true]],
            ])
            ->assertCreated()
            ->assertJsonPath('role', 'gestionnaire');
    }
}
