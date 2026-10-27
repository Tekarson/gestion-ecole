<?php

namespace Database\Seeders;

use App\Models\AuditLog;
use App\Models\Family;
use App\Models\FeeSetting;
use App\Models\Notification;
use App\Models\Payment;
use App\Models\SchoolClass;
use App\Models\Setting;
use App\Models\Student;
use App\Models\TermPayment;
use App\Models\TermPeriod;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Grille tarifaire du cahier des charges : 15 classes, minerval en 3
     * tranches, livres par niveau. Montants en dollars.
     */
    private const CLASSES = [
        ['name' => 'PS', 'level' => 'Préscolaire', 'tranche1' => 1000, 'tranche2' => 700, 'tranche3' => 700, 'books' => 110],
        ['name' => 'MS', 'level' => 'Préscolaire', 'tranche1' => 1000, 'tranche2' => 700, 'tranche3' => 700, 'books' => 200],
        ['name' => 'GS', 'level' => 'Préscolaire', 'tranche1' => 1000, 'tranche2' => 700, 'tranche3' => 700, 'books' => 200],
        ['name' => 'CP', 'level' => 'Primaire', 'tranche1' => 1000, 'tranche2' => 700, 'tranche3' => 700, 'books' => 0],
        ['name' => 'CE1', 'level' => 'Primaire', 'tranche1' => 1300, 'tranche2' => 900, 'tranche3' => 800, 'books' => 420],
        ['name' => 'CE2', 'level' => 'Primaire', 'tranche1' => 1300, 'tranche2' => 900, 'tranche3' => 800, 'books' => 420],
        ['name' => 'CM1', 'level' => 'Primaire', 'tranche1' => 1300, 'tranche2' => 900, 'tranche3' => 800, 'books' => 420],
        ['name' => 'CM2', 'level' => 'Primaire', 'tranche1' => 1300, 'tranche2' => 900, 'tranche3' => 800, 'books' => 420],
        ['name' => '6e', 'level' => 'Primaire', 'tranche1' => 1700, 'tranche2' => 950, 'tranche3' => 850, 'books' => 400],
        ['name' => '7e', 'level' => 'Secondaire', 'tranche1' => 1700, 'tranche2' => 950, 'tranche3' => 850, 'books' => 400],
        ['name' => '8e', 'level' => 'Secondaire', 'tranche1' => 1700, 'tranche2' => 950, 'tranche3' => 850, 'books' => 400],
        ['name' => '3e', 'level' => 'Secondaire', 'tranche1' => 1700, 'tranche2' => 1400, 'tranche3' => 1100, 'books' => 400],
        ['name' => '2de', 'level' => 'Secondaire', 'tranche1' => 1700, 'tranche2' => 1400, 'tranche3' => 1100, 'books' => 400],
        ['name' => '1re', 'level' => 'Secondaire', 'tranche1' => 1700, 'tranche2' => 1400, 'tranche3' => 1100, 'books' => 400],
        ['name' => 'Terminale IB', 'level' => 'Secondaire', 'tranche1' => 2000, 'tranche2' => 1750, 'tranche3' => 1550, 'books' => 400],
    ];

    public function run(): void
    {
        Setting::set('school_name', 'Complexe Scolaire Bel Avenir');
        Setting::set('school_year', '2026-2027');
        Setting::set('current_term', 1);

        // Règles familiales (§24-25) : montants fixes, seul le 6e enfant
        // (inscrit en dernier) est exonéré du minerval.
        Setting::set('discount_rules', [
            'byCount' => ['4' => 500, '5' => 1000],
            'exemptSixth' => true,
        ]);

        // ----- Comptes ----------
        $makeUser = function (string $email, string $first, string $last, ?string $postnom, string $role, ?int $familyId = null) {
            return User::updateOrCreate(['email' => $email], [
                'first_name' => $first,
                'last_name' => $last,
                'postnom' => $postnom,
                'full_name' => User::composeFullName($first, $last, $postnom),
                'password' => Hash::make('password'),
                'role' => $role,
                'family_id' => $familyId,
                'is_active' => true,
            ]);
        };

        $superAdmin = $makeUser('admin@ntshik.cd', 'Claudel', 'MWAMBA', null, 'superadmin');

        // ----- Back-office admin démo, avec modules limités (§26) -----
        $demoAdmin = $makeUser('admin2@ntshik.cd', 'Renedy', 'Kabeya', null, 'admin');

        $grants = [
            'dashboard' => ['read' => true, 'create' => false, 'update' => false, 'delete' => false],
            'familles' => ['read' => true, 'create' => true, 'update' => true, 'delete' => false],
            'paiements' => ['read' => true, 'create' => true, 'update' => true, 'delete' => false],
            'journal' => ['read' => true, 'create' => false, 'update' => false, 'delete' => false],
        ];

        foreach ($grants as $module => $flags) {
            $demoAdmin->modulePermissions()->updateOrCreate(
                ['module' => $module],
                [
                    'can_read' => $flags['read'],
                    'can_create' => $flags['create'],
                    'can_update' => $flags['update'],
                    'can_delete' => $flags['delete'],
                ],
            );
        }

        // ---- Familles (4) : 2, 4, 5 et 6 enfants pour illustrer §24-25 ----
        $renedy = Family::create(['parent_name' => 'Renedy Karume', 'phone' => '+243812345678', 'city' => 'Goma']);
        $clarisse = Family::create(['parent_name' => 'Clarisse Kabasele', 'phone' => '+243823456789', 'city' => 'Goma']);
        $joseph = Family::create(['parent_name' => 'Joseph Katembo', 'phone' => '+243834567890', 'city' => 'Goma']);
        $mbuyi = Family::create(['parent_name' => 'Louange Mbuyi', 'phone' => '+243845678901', 'city' => 'Goma']);

        $makeUser('renedy@ntshik.cd', 'Renedy', 'Karume', null, 'family', $renedy->id);
        $makeUser('clarisse@ntshik.cd', 'Clarisse', 'Kabasele', null, 'family', $clarisse->id);
        $makeUser('joseph@ntshik.cd', 'Joseph', 'Katembo', null, 'family', $joseph->id);
        $makeUser('mbuyi@ntshik.cd', 'Louange', 'Mbuyi', null, 'family', $mbuyi->id);

        // ---- Classes (15) ----
        $classRows = [];
        foreach (self::CLASSES as $class) {
            $classRows[] = SchoolClass::create($class);
        }

        // ---- Frais fixes (4) ----
        $feeSettings = [
            ['label' => 'inscription', 'amount' => 200, 'category' => 'inscription', 'term' => null],
            ['label' => 'uniforme', 'amount' => 40, 'category' => 'fixed', 'term' => null],
            ['label' => 'assurance', 'amount' => 20, 'category' => 'fixed', 'term' => null],
            ['label' => 'divers', 'amount' => 150, 'category' => 'fixed', 'term' => null],
        ];
        foreach ($feeSettings as $setting) {
            FeeSetting::create([...$setting, 'school_year' => '2026-2027']);
        }

        // ---- Tranches (3) avec fenêtres (§6) ----
        $periods = [];
        $periodData = [
            // Tranche 1 ouverte dès l'inscription.
            ['name' => 'Tranche 1', 'term' => 1, 'due_date' => null, 'opens_at' => null, 'closes_at' => null, 'at_enrollment' => true],
            ['name' => 'Tranche 2', 'term' => 2, 'due_date' => '2026-12-04', 'opens_at' => '2026-08-20', 'closes_at' => '2026-12-04', 'at_enrollment' => false],
            ['name' => 'Tranche 3', 'term' => 3, 'due_date' => '2027-03-16', 'opens_at' => '2026-12-06', 'closes_at' => '2027-03-16', 'at_enrollment' => false],
        ];
        foreach ($periodData as $period) {
            $p = TermPeriod::create($period);
            $periods[$p->term] = $p;
            TermPayment::create(['term_id' => $p->id, 'label' => 'Minerval '.$p->name, 'amount' => 150, 'due_date' => $period['due_date'] ?? now()->addMonths(3)]);
        }

        // ---- Élèves (17) : familles de 2, 4, 5 et 6 enfants ----
        $students = [
            ['first_name' => 'Ruth', 'last_name' => 'Renedy', 'postnom' => 'Bahati', 'gender' => 'F', 'family' => $renedy, 'class' => $classRows[3], 'matricule' => '2026-0001'],   // CP
            ['first_name' => 'Idrissa', 'last_name' => 'Renedy', 'postnom' => null, 'gender' => 'M', 'family' => $renedy, 'class' => $classRows[8], 'matricule' => '2026-0002'], // 6e
            ['first_name' => 'Grace', 'last_name' => 'Clarisse', 'postnom' => 'Mateso', 'gender' => 'F', 'family' => $clarisse, 'class' => $classRows[1], 'matricule' => '2026-0003'], // MS
            ['first_name' => 'Benjamin', 'last_name' => 'Clarisse', 'postnom' => null, 'gender' => 'M', 'family' => $clarisse, 'class' => $classRows[4], 'matricule' => '2026-0004'], // CE1
            ['first_name' => 'Naomi', 'last_name' => 'Clarisse', 'postnom' => 'Akili', 'gender' => 'F', 'family' => $clarisse, 'class' => $classRows[7], 'matricule' => '2026-0005'],   // CM2
            ['first_name' => 'Daniel', 'last_name' => 'Clarisse', 'postnom' => null, 'gender' => 'M', 'family' => $clarisse, 'class' => $classRows[11], 'matricule' => '2026-0006'],  // 3e
            ['first_name' => 'Job', 'last_name' => 'Katembo', 'postnom' => null, 'gender' => 'M', 'family' => $joseph, 'class' => $classRows[0], 'matricule' => '2026-0007'],    // PS
            ['first_name' => 'Sarah', 'last_name' => 'Katembo', 'postnom' => 'Amani', 'gender' => 'F', 'family' => $joseph, 'class' => $classRows[3], 'matricule' => '2026-0008'],  // CP
            ['first_name' => 'Esther', 'last_name' => 'Katembo', 'postnom' => null, 'gender' => 'F', 'family' => $joseph, 'class' => $classRows[6], 'matricule' => '2026-0009'], // CM1
            ['first_name' => 'Emmanuel', 'last_name' => 'Katembo', 'postnom' => null, 'gender' => 'M', 'family' => $joseph, 'class' => $classRows[10], 'matricule' => '2026-0010'], // 8e
            ['first_name' => 'Divine', 'last_name' => 'Katembo', 'postnom' => 'Chance', 'gender' => 'F', 'family' => $joseph, 'class' => $classRows[13], 'matricule' => '2026-0011'], // 1re
            ['first_name' => 'Patience', 'last_name' => 'Mbuyi', 'postnom' => null, 'gender' => 'F', 'family' => $mbuyi, 'class' => $classRows[2], 'matricule' => '2026-0012'],   // GS
            ['first_name' => 'Rachel', 'last_name' => 'Mbuyi', 'postnom' => 'Kavira', 'gender' => 'F', 'family' => $mbuyi, 'class' => $classRows[5], 'matricule' => '2026-0013'], // CE2
            ['first_name' => 'Samuel', 'last_name' => 'Mbuyi', 'postnom' => null, 'gender' => 'M', 'family' => $mbuyi, 'class' => $classRows[9], 'matricule' => '2026-0014'],  // 7e
            ['first_name' => 'Anne', 'last_name' => 'Mbuyi', 'postnom' => 'Neema', 'gender' => 'F', 'family' => $mbuyi, 'class' => $classRows[14], 'matricule' => '2026-0015'],  // Terminale
            ['first_name' => 'Moise', 'last_name' => 'Mbuyi', 'postnom' => null, 'gender' => 'M', 'family' => $mbuyi, 'class' => $classRows[8], 'matricule' => '2026-0016'],   // 6e
            ['first_name' => 'Josué', 'last_name' => 'Mbuyi', 'postnom' => null, 'gender' => 'M', 'family' => $mbuyi, 'class' => $classRows[12], 'matricule' => '2026-0017'],  // 2de (6e enfant → exonéré)
        ];

        $studentRows = [];
        $i = 1;
        foreach ($students as $data) {
            $studentRows[] = Student::create([
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'postnom' => $data['postnom'],
                'gender' => $data['gender'],
                'birth_date' => sprintf('2015-%02d-15', (($i - 1) % 12) + 1),
                'birth_place' => 'Goma',
                'family_id' => $data['family']->id,
                'class_id' => $data['class']->id,
                'matricule' => $data['matricule'],
                'is_exempt' => false,
                'status' => 'active',
            ]);
            $i++;
        }

        // ---- Paiements (23), références REC-2026-000101…000123 ----
        $year = '2026';
        $payments = [
            // Renedy (2 enfants) : places confirmées.
            ['ref' => "REC-{$year}-000101", 'student' => $studentRows[0], 'family' => $renedy, 'nature' => 'inscription', 'amount' => 200, 'method' => 'especes', 'date' => '2026-09-01'],
            ['ref' => "REC-{$year}-000102", 'student' => $studentRows[0], 'family' => $renedy, 'nature' => 'tranche1', 'amount' => 1000, 'method' => 'mobile_money', 'date' => '2026-09-01'],
            ['ref' => "REC-{$year}-000103", 'student' => $studentRows[1], 'family' => $renedy, 'nature' => 'inscription', 'amount' => 200, 'method' => 'especes', 'date' => '2026-09-02'],
            ['ref' => "REC-{$year}-000104", 'student' => $studentRows[1], 'family' => $renedy, 'nature' => 'tranche1', 'amount' => 1700, 'method' => 'especes', 'date' => '2026-09-02'],
            // Clarisse (4 enfants) : 500 $ de réduction, Daniel en attente de tranche 1.
            ['ref' => "REC-{$year}-000105", 'student' => $studentRows[2], 'family' => $clarisse, 'nature' => 'inscription', 'amount' => 200, 'method' => 'guichet', 'date' => '2026-09-03'],
            ['ref' => "REC-{$year}-000106", 'student' => $studentRows[2], 'family' => $clarisse, 'nature' => 'tranche1', 'amount' => 1000, 'method' => 'mobile_money', 'date' => '2026-09-03'],
            ['ref' => "REC-{$year}-000107", 'student' => $studentRows[3], 'family' => $clarisse, 'nature' => 'inscription', 'amount' => 200, 'method' => 'especes', 'date' => '2026-09-05'],
            ['ref' => "REC-{$year}-000108", 'student' => $studentRows[3], 'family' => $clarisse, 'nature' => 'tranche1', 'amount' => 1300, 'method' => 'mobile_money', 'date' => '2026-09-06'],
            ['ref' => "REC-{$year}-000109", 'student' => $studentRows[5], 'family' => $clarisse, 'nature' => 'inscription', 'amount' => 200, 'method' => 'especes', 'date' => '2026-09-10'],
            // Joseph (5 enfants) : 1000 $ de réduction, tranche 1 d'Emmanuel en attente.
            ['ref' => "REC-{$year}-000110", 'student' => $studentRows[6], 'family' => $joseph, 'nature' => 'inscription', 'amount' => 200, 'method' => 'especes', 'date' => '2026-09-07'],
            ['ref' => "REC-{$year}-000111", 'student' => $studentRows[6], 'family' => $joseph, 'nature' => 'tranche1', 'amount' => 1000, 'method' => 'carte', 'date' => '2026-09-07'],
            ['ref' => "REC-{$year}-000112", 'student' => $studentRows[7], 'family' => $joseph, 'nature' => 'inscription', 'amount' => 200, 'method' => 'especes', 'date' => '2026-09-08'],
            ['ref' => "REC-{$year}-000113", 'student' => $studentRows[7], 'family' => $joseph, 'nature' => 'tranche1', 'amount' => 1000, 'method' => 'virement', 'date' => '2026-09-08'],
            ['ref' => "REC-{$year}-000114", 'student' => $studentRows[8], 'family' => $joseph, 'nature' => 'inscription', 'amount' => 200, 'method' => 'especes', 'date' => '2026-09-09'],
            ['ref' => "REC-{$year}-000115", 'student' => $studentRows[8], 'family' => $joseph, 'nature' => 'tranche1', 'amount' => 1300, 'method' => 'mobile_money', 'date' => '2026-09-09'],
            ['ref' => "REC-{$year}-000116", 'student' => $studentRows[9], 'family' => $joseph, 'nature' => 'inscription', 'amount' => 200, 'method' => 'especes', 'date' => '2026-09-12'],
            ['ref' => "REC-{$year}-000117", 'student' => $studentRows[9], 'family' => $joseph, 'nature' => 'tranche1', 'amount' => 1700, 'method' => 'mobile_money', 'date' => '2026-09-12', 'status' => 'pending'],
            // Mbuyi (6 enfants) : 6e enfant (Josué) exonéré du minerval.
            ['ref' => "REC-{$year}-000118", 'student' => $studentRows[11], 'family' => $mbuyi, 'nature' => 'inscription', 'amount' => 200, 'method' => 'especes', 'date' => '2026-09-13'],
            ['ref' => "REC-{$year}-000119", 'student' => $studentRows[11], 'family' => $mbuyi, 'nature' => 'tranche1', 'amount' => 1000, 'method' => 'especes', 'date' => '2026-09-13'],
            ['ref' => "REC-{$year}-000120", 'student' => $studentRows[12], 'family' => $mbuyi, 'nature' => 'inscription', 'amount' => 200, 'method' => 'mobile_money', 'date' => '2026-09-14'],
            ['ref' => "REC-{$year}-000121", 'student' => $studentRows[12], 'family' => $mbuyi, 'nature' => 'tranche1', 'amount' => 1300, 'method' => 'especes', 'date' => '2026-09-14'],
            ['ref' => "REC-{$year}-000122", 'student' => $studentRows[14], 'family' => $mbuyi, 'nature' => 'inscription', 'amount' => 200, 'method' => 'especes', 'date' => '2026-09-15'],
            ['ref' => "REC-{$year}-000123", 'student' => $studentRows[15], 'family' => $mbuyi, 'nature' => 'inscription', 'amount' => 200, 'method' => 'carte', 'date' => '2026-09-16'],
        ];

        foreach ($payments as $data) {
            Payment::create([
                'reference' => $data['ref'],
                'family_id' => $data['family']->id,
                'student_id' => $data['student']->id,
                'amount' => $data['amount'],
                'method' => $data['method'],
                'date' => $data['date'],
                'term' => $data['nature'] === 'tranche1' ? 1 : ($data['nature'] === 'tranche2' ? 2 : ($data['nature'] === 'tranche3' ? 3 : null)),
                'category' => $data['nature'],
                'school_year' => '2026-2027',
                'status' => $data['status'] ?? 'confirmed',
            ]);

            AuditLog::create([
                'user_id' => $superAdmin->id,
                'family_id' => $data['family']->id,
                'action' => 'payment.received',
                'details' => ['reference' => $data['ref'], 'amount' => $data['amount']],
            ]);
        }

        // ---- Journal (5) ----
        AuditLog::create(['user_id' => $superAdmin->id, 'action' => 'seed.created', 'details' => ['year' => '2026-2027']]);
        AuditLog::create(['user_id' => $superAdmin->id, 'action' => 'settings.updated', 'details' => ['fee_settings' => 4, 'classes' => 15]]);
        AuditLog::create(['user_id' => $superAdmin->id, 'action' => 'student.created', 'details' => ['matricule' => '2026-0001']]);
        AuditLog::create(['user_id' => $superAdmin->id, 'action' => 'student.created', 'details' => ['matricule' => '2026-0006']]);
        AuditLog::create(['user_id' => $superAdmin->id, 'action' => 'student.created', 'details' => ['matricule' => '2026-0017']]);

        // ---- Notifications (6) ----
        Notification::create([
            'user_id' => $renedy->users()->first()->id,
            'title' => 'Bienvenue sur NTSHIK',
            'message' => 'Votre espace famille est prêt. Vous pouvez inscrire vos enfants et suivre les paiements.',
        ]);
        Notification::create([
            'user_id' => $renedy->users()->first()->id,
            'title' => 'Nouvelle année scolaire',
            'message' => 'Les frais de l’année 2026-2027 sont disponibles. Pensez à confirmer la place de vos enfants.',
        ]);
        Notification::create([
            'user_id' => $clarisse->users()->first()->id,
            'title' => 'Réduction familiale appliquée',
            'message' => 'Votre famille de 4 enfants bénéficie de 500 $ de réduction sur le minerval.',
        ]);
        Notification::create([
            'user_id' => $joseph->users()->first()->id,
            'title' => 'Réduction familiale appliquée',
            'message' => 'Votre famille de 5 enfants bénéficie de 1 000 $ de réduction sur le minerval.',
        ]);
        Notification::create([
            'user_id' => $mbuyi->users()->first()->id,
            'title' => '6e enfant exonéré',
            'message' => 'Votre famille compte 6 enfants : le dernier inscrit bénéficie de l’exonération du minerval.',
        ]);
        Notification::create([
            'user_id' => $mbuyi->users()->first()->id,
            'title' => 'Paiement en attente',
            'message' => 'Une tranche 1 d’Emmanuel attend la confirmation de l’administration.',
        ]);
    }
}