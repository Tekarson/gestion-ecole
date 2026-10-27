<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('school_year', 20)->nullable()->index()->after('category');
        });

        // Backfill existing payments from their payment date:
        // from September a payment belongs to YYYY-(YYYY+1), otherwise to (YYYY-1)-YYYY.
        $rows = DB::table('payments')
            ->select('id', 'date')
            ->whereNull('school_year')
            ->get();

        foreach ($rows as $row) {
            [$year] = explode('-', (string) $row->date);
            $year = (int) $year;
            $schoolYear = $year <= 8
                ? ($year - 1).'-'.$year
                : $year.'-'.($year + 1);

            DB::table('payments')
                ->where('id', $row->id)
                ->update(['school_year' => $schoolYear]);
        }
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropIndex(['school_year']);
            $table->dropColumn('school_year');
        });
    }
};