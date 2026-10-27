<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Nouveaux frais demandés par l'école (montants à saisir dans Paramètres).
     */
    private const NEW_FEES = [
        'gymnastique' => 'fixed',
        'journal_classe' => 'fixed',
        'uniforme_plus' => 'fixed',
        'attestation_frequentation' => 'fixed',
        'camp_ete' => 'other',
        'examen' => 'other',
    ];

    public function up(): void
    {
        // Enfant d'enseignant : pas de frais d'ouverture de dossier.
        if (! Schema::hasColumn('students', 'is_teacher_child')) {
            Schema::table('students', function (Blueprint $table) {
                $table->boolean('is_teacher_child')->default(false)->after('is_exempt');
            });
        }

        // Ayant droit : paie les frais connexes, pas le minerval.
        if (! Schema::hasColumn('students', 'is_entitled')) {
            Schema::table('students', function (Blueprint $table) {
                $table->boolean('is_entitled')->default(false)->after('is_teacher_child');
            });
        }

        $year = DB::table('fee_settings')->value('school_year')
            ?? DB::table('settings')->where('key', 'school_year')->value('value')
            ?? config('services.school.year');
        $year = trim((string) $year, '"');

        foreach (self::NEW_FEES as $label => $category) {
            if (DB::table('fee_settings')->where('label', $label)->exists()) {
                continue;
            }
            DB::table('fee_settings')->insert([
                'label' => $label,
                'amount' => 0,
                'category' => $category,
                'term' => null,
                'school_year' => $year,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('fee_settings')->whereIn('label', array_keys(self::NEW_FEES))->delete();

        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn(['is_teacher_child', 'is_entitled']);
        });
    }
};
