<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Fenêtres de paiement des tranches (§6) : configurables, certaines
        // ouvertes dès l'inscription.
        if (! Schema::hasColumns('term_periods', ['opens_at', 'closes_at', 'at_enrollment'])) {
            Schema::table('term_periods', function (Blueprint $table) {
                $table->date('opens_at')->nullable()->after('due_date');
                $table->date('closes_at')->nullable()->after('opens_at');
                $table->boolean('at_enrollment')->default(false)->after('closes_at');
                $table->date('due_date')->nullable()->change();
            });
        }

        // Payment methods become a free string so the school can add new
        // channels (e.g. "virement") without an enum migration. Re-declaring
        // the column is harmless when it is already a string.
        Schema::table('payments', function (Blueprint $table) {
            $table->string('method', 30)->default('especes')->change();
        });
    }

    public function down(): void
    {
        if (Schema::hasColumns('term_periods', ['opens_at', 'closes_at', 'at_enrollment'])) {
            Schema::table('term_periods', function (Blueprint $table) {
                $table->dropColumn(['opens_at', 'closes_at', 'at_enrollment']);
            });
        }
    }
};