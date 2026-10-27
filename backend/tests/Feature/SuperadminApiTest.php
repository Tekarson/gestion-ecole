<?php

namespace Tests\Feature;

use App\Models\Family;
use App\Models\ModulePermission;
use App\Models\Payment;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SuperadminApiTest extends TestCase
{
    use RefreshDatabase;

    private User $superAdmin;

    private string $superToken;

    protected function setUp(): void
    {
        parent::setUp();

        $this->superAdmin = User::create([
            'full_name' => 'Super Admin',
            'email' => 'super@ntshik.cd',
            'password' => Hash::make('password'),
            'role' => 'superadmin',
        ]);
        $this->superToken = $this->superAdmin->createToken('ntshik')->plainTextToken;
    }

    private function makeAdminUser(string $email = 'admin@ntshik.cd'): User
    {
        return User::create([
            'full_name' => 'Admin Test',
            'email' => $email,
            'password' => Hash::make('password'),
            'role' => 'admin',
        ]);
    }

    private function makeFamilyUser(string $email = 'parent@ntshik.cd'): User
    {
        $family = Family::create(['parent_name' => 'Parent Test', 'phone' => '+243812345678']);

        return User::create([
            'full_name' => 'Parent Test',
            'email' => $email,
            'password' => Hash::make('password'),
            'role' => 'family',
            'family_id' => $family->id,
        ]);
    }

    public function testSuperAdminAccessesEveryModuleWithoutGrants(): void
    {
        $this->withToken($this->superToken)
            ->getJson('/api/v1/admin/dashboard')
            ->assertOk();

        $this->withToken($this->superToken)
            ->getJson('/api/v1/admin/settings')
            ->assertOk();

        $this->withToken($this->superToken)
            ->getJson('/api/v1/admin/families')
            ->assertOk();
    }

    public function testAdminWithoutGrantsIsForbiddenOnAdminRoutes(): void
    {
        $admin = $this->makeAdminUser();
        $token = $admin->createToken('ntshik')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/admin/dashboard')->assertStatus(403);
        $this->withToken($token)->getJson('/api/v1/admin/families')->assertStatus(403);
        $this->withToken($token)->getJson('/api/v1/admin/settings')->assertStatus(403);
        $this->withToken($token)->getJson('/api/v1/admin/users')->assertStatus(403);
    }

    public function testAdminCanOnlySeeGrantedModules(): void
    {
        $admin = $this->makeAdminUser();
        ModulePermission::create([
            'user_id' => $admin->id,
            'module' => 'familles',
            'can_read' => true,
            'can_create' => false,
            'can_update' => false,
            'can_delete' => false,
        ]);
        $token = $admin->createToken('ntshik')->plainTextToken;

        $this->withToken($token)->getJson('/api/v1/admin/families')->assertOk();
        $this->withToken($token)->getJson('/api/v1/admin/dashboard')->assertStatus(403);
        $this->withToken($token)->getJson('/api/v1/admin/settings')->assertStatus(403);
    }

    public function testAdminCannotConfirmPaymentsWithoutUpdateGrant(): void
    {
        $admin = $this->makeAdminUser();
        ModulePermission::create([
            'user_id' => $admin->id,
            'module' => 'paiements',
            'can_read' => true,
            'can_create' => false,
            'can_update' => false,
            'can_delete' => false,
        ]);
        $token = $admin->createToken('ntshik')->plainTextToken;

        $this->withToken($token)
            ->patchJson('/api/v1/payments/1/status', ['status' => 'confirmed'])
            ->assertStatus(403);
    }

    public function testSuperAdminCreatesListsUpdatesAndDeletesAdminUser(): void
    {
        $created = $this->withToken($this->superToken)->postJson('/api/v1/admin/users', [
            'first_name' => 'Nouvel',
            'last_name' => 'Admin',
            'email' => 'newadmin@ntshik.cd',
            'password' => 'secret123',
            'modules' => [
                'dashboard' => ['read' => true, 'create' => false, 'update' => false, 'delete' => false],
                'paiements' => ['read' => true, 'create' => false, 'update' => true, 'delete' => false],
            ],
        ]);

        $created->assertStatus(201)
            ->assertJsonPath('role', 'admin')
            ->assertJsonPath('full_name', 'Nouvel Admin')
            ->assertJsonPath('first_name', 'Nouvel')
            ->assertJsonPath('modules.paiements.update', true);

        $this->assertDatabaseHas('users', ['email' => 'newadmin@ntshik.cd', 'role' => 'admin']);
        $this->assertDatabaseHas('module_permissions', ['module' => 'dashboard', 'can_read' => 1]);

        $userId = $created->json('id');

        $this->withToken($this->superToken)
            ->getJson('/api/v1/admin/users')
            ->assertOk()
            ->assertJsonCount(1, 'users')
            ->assertJsonPath('users.0.email', 'newadmin@ntshik.cd');

        $this->withToken($this->superToken)->putJson('/api/v1/admin/users/'.$userId, [
            'first_name' => 'Admin',
            'last_name' => 'Renomme',
            'email' => 'newadmin@ntshik.cd',
            'password' => '',
            'modules' => [
                'journal' => ['read' => true, 'create' => false, 'update' => false, 'delete' => false],
            ],
        ])
            ->assertOk()
            ->assertJsonPath('full_name', 'Admin Renomme')
            ->assertJsonPath('modules.journal.read', true);

        $this->assertDatabaseMissing('module_permissions', ['user_id' => $userId, 'module' => 'paiements']);

        $this->withToken($this->superToken)
            ->deleteJson('/api/v1/admin/users/'.$userId)
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->assertDatabaseMissing('users', ['id' => $userId]);
    }

    public function testUserManagementIsRejectedFromAdminPortalUsersWithWrongRole(): void
    {
        $family = $this->makeFamilyUser();
        $familyToken = $family->createToken('ntshik')->plainTextToken;

        $this->withToken($familyToken)->getJson('/api/v1/admin/users')->assertStatus(403);
    }

    public function testLoginIsSplitByPortal(): void
    {
        $family = $this->makeFamilyUser('renedy@ntshik.cd');

        $this->postJson('/api/v1/auth/login', [
            'email' => 'renedy@ntshik.cd',
            'password' => 'password',
        ], ['X-App-Mode' => 'admin'])->assertStatus(422);

        $familyLogin = $this->postJson('/api/v1/auth/login', [
            'email' => 'renedy@ntshik.cd',
            'password' => 'password',
        ], ['X-App-Mode' => 'family'])->assertOk();

        $this->assertSame('family', $familyLogin->json('user.role'));

        $admin = $this->makeAdminUser('kabeya@ntshik.cd');

        $this->postJson('/api/v1/auth/login', [
            'email' => 'kabeya@ntshik.cd',
            'password' => 'password',
        ], ['X-App-Mode' => 'family'])->assertStatus(422);

        $adminLogin = $this->postJson('/api/v1/auth/login', [
            'email' => 'kabeya@ntshik.cd',
            'password' => 'password',
        ], ['X-App-Mode' => 'admin'])->assertOk();

        $this->assertSame('admin', $adminLogin->json('user.role'));

        $superLogin = $this->postJson('/api/v1/auth/login', [
            'email' => 'super@ntshik.cd',
            'password' => 'password',
        ], ['X-App-Mode' => 'admin'])->assertOk();

        $this->assertSame('superadmin', $superLogin->json('user.role'));
        $this->assertNotEmpty($superLogin->json('user.permissions'));
    }

    public function testDisabledAccountCannotLogin(): void
    {
        $admin = $this->makeAdminUser('desactive@ntshik.cd');
        $admin->update(['is_active' => false]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'desactive@ntshik.cd',
            'password' => 'password',
        ], ['X-App-Mode' => 'admin'])->assertStatus(422);
    }

    public function testRegisterIsRejectedOnAdminPortalAndAlwaysCreatesFamily(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'first_name' => 'Nouveau',
            'last_name' => 'Parent',
            'email' => 'newparent@ntshik.cd',
            'password' => 'password',
        ], ['X-App-Mode' => 'admin'])->assertStatus(422);

        $registered = $this->postJson('/api/v1/auth/register', [
            'first_name' => 'Nouveau',
            'last_name' => 'Parent',
            'email' => 'newparent@ntshik.cd',
            'password' => 'password',
        ], ['X-App-Mode' => 'family'])->assertStatus(201);

        $this->assertSame('family', $registered->json('user.role'));
        $this->assertDatabaseHas('families', ['parent_name' => 'Nouveau Parent']);
    }

    public function testSuperAdminProfilePayloadCarriesModulesAndPermissions(): void
    {
        $this->withToken($this->superToken)
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('role', 'superadmin')
            ->assertJsonPath('modules.0', 'dashboard');
    }

    public function testAdminCanDownloadPaymentReceiptPdf(): void
    {
        $payment = $this->makePayment();

        $admin = $this->makeAdminUser('receipt-admin@ntshik.cd');
        ModulePermission::create([
            'user_id' => $admin->id,
            'module' => 'paiements',
            'can_read' => true,
            'can_create' => false,
            'can_update' => false,
            'can_delete' => false,
        ]);
        $token = $admin->createToken('ntshik')->plainTextToken;

        $this->withToken($token)
            ->get('/api/v1/admin/payments/'.$payment->id.'/recu')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf')
            ->assertHeader('Content-Disposition', "attachment; filename=\"recu-{$payment->reference}.pdf\"");
    }

    public function testAdminWithoutPaiementsGrantCannotDownloadReceipt(): void
    {
        $payment = $this->makePayment();

        $admin = $this->makeAdminUser('receipt-nogrant@ntshik.cd');
        ModulePermission::create([
            'user_id' => $admin->id,
            'module' => 'dashboard',
            'can_read' => true,
            'can_create' => false,
            'can_update' => false,
            'can_delete' => false,
        ]);
        $token = $admin->createToken('ntshik')->plainTextToken;

        $this->withToken($token)
            ->get('/api/v1/admin/payments/'.$payment->id.'/recu')
            ->assertStatus(403);
    }

    public function testFamilyCanDownloadReceiptForOwnPaymentOnly(): void
    {
        $ownPayment = $this->makePayment('1A');
        $otherPayment = $this->makePayment('1B');

        $familyUser = User::create([
            'full_name' => 'Parent Reçu',
            'email' => 'parent-recu@ntshik.cd',
            'password' => Hash::make('password'),
            'role' => 'family',
            'family_id' => $ownPayment->family_id,
        ]);
        $token = $familyUser->createToken('ntshik')->plainTextToken;

        $this->withToken($token)
            ->get("/api/v1/payments/{$ownPayment->id}/recu")
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');

        $this->withToken($token)
            ->get("/api/v1/payments/{$otherPayment->id}/recu")
            ->assertStatus(404);
    }

    private function makePayment(string $className = '1A'): Payment
    {
        $class = SchoolClass::create([
            'name' => $className,
            'level' => 'primaire',
            'tranche1' => 120,
            'tranche2' => 0,
            'tranche3' => 0,
            'books' => 0,
        ]);

        $family = Family::create(['parent_name' => 'Parent Reçu', 'phone' => '+243810000000']);

        $student = Student::create([
            'first_name' => 'Enfant',
            'last_name' => 'Reçu',
            'gender' => 'F',
            'birth_date' => '2019-05-05',
            'birth_place' => 'Kinshasa',
            'family_id' => $family->id,
            'class_id' => $class->id,
            'matricule' => 'TEST-'.strtoupper(\Illuminate\Support\Str::random(6)),
            'status' => 'active',
        ]);

        return Payment::create([
            'reference' => 'REC-TEST-'.rand(1000, 9999),
            'family_id' => $family->id,
            'student_id' => $student->id,
            'amount' => 200,
            'method' => 'especes',
            'date' => now()->toDateString(),
            'term' => 1,
            'category' => 'inscription',
            'status' => 'confirmed',
        ]);
    }
}