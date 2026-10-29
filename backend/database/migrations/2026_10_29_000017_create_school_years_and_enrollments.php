<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Années académiques : une seule est active ; `tariffs` garde les frais
        // et les barèmes des classes propres à chaque année.
        if (! Schema::hasTable('school_years')) {
            Schema::create('school_years', function (Blueprint $table) {
                $table->id();
                $table->string('name')->unique();
                $table->date('starts_on')->nullable();
                $table->date('ends_on')->nullable();
                $table->boolean('is_active')->default(false);
                $table->json('tariffs')->nullable();
                $table->timestamps();
            });
        }

        // Année d'inscription en cours de l'élève (les autres sont archivées).
        if (! Schema::hasColumn('students', 'school_year')) {
            Schema::table('students', function (Blueprint $table) {
                $table->string('school_year')->nullable()->after('status');
                $table->index('school_year');
            });
        }

        // Historique des inscriptions : une ligne par élève et par année.
        if (! Schema::hasTable('enrollments')) {
            Schema::create('enrollments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('student_id')->constrained()->cascadeOnDelete();
                $table->string('school_year');
                $table->foreignId('class_id')->nullable()->constrained('school_classes')->nullOnDelete();
                $table->timestamps();
                $table->unique(['student_id', 'school_year']);
            });
        }

        $active = $this->currentYear();

        DB::table('students')->whereNull('school_year')->update(['school_year' => $active]);

        foreach (DB::table('students')->get(['id', 'class_id', 'school_year']) as $student) {
            DB::table('enrollments')->updateOrInsert(
                ['student_id' => $student->id, 'school_year' => $student->school_year],
                ['class_id' => $student->class_id, 'created_at' => now(), 'updated_at' => now()],
            );
        }

        $years = collect([$active])
            ->merge(DB::table('payments')->whereNotNull('school_year')->distinct()->pluck('school_year'))
            ->merge(DB::table('fee_settings')->whereNotNull('school_year')->distinct()->pluck('school_year'))
            ->filter()
            ->unique();

        foreach ($years as $name) {
            if (DB::table('school_years')->where('name', $name)->exists()) {
                continue;
            }
            DB::table('school_years')->insert([
                'name' => $name,
                'starts_on' => preg_match('/^(\d{4})-/', $name, $m) ? $m[1].'-09-01' : null,
                'ends_on' => preg_match('/-(\d{4})$/', $name, $m) ? $m[1].'-07-02' : null,
                'is_active' => $name === $active,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('enrollments');
        if (Schema::hasColumn('students', 'school_year')) {
            Schema::table('students', function (Blueprint $table) {
                $table->dropIndex(['school_year']);
                $table->dropColumn('school_year');
            });
        }
        Schema::dropIfExists('school_years');
    }

    private function currentYear(): string
    {
        $stored = DB::table('settings')->where('key', 'school_year')->value('value');
        $year = $stored !== null ? trim((string) $stored, '"') : (string) config('services.school.year');

        return $year !== '' ? $year : date('Y').'-'.(date('Y') + 1);
    }
};
