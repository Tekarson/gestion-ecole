<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('term_periods', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->unsignedTinyInteger('term')->unique();
            $table->date('due_date');
            $table->timestamps();
        });

        Schema::create('term_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('term_id')->constrained('term_periods')->cascadeOnDelete();
            $table->string('label');
            $table->decimal('amount', 8, 2);
            $table->date('due_date');
            $table->decimal('paid_fraction', 8, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('term_payments');
        Schema::dropIfExists('term_periods');
    }
};