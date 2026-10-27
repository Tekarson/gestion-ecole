<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();
            $table->foreignId('family_id')->constrained('families')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->decimal('amount', 10, 2);
            $table->enum('method', ['mobile_money', 'carte', 'guichet', 'especes'])->default('especes');
            $table->date('date');
            $table->unsignedTinyInteger('term')->nullable();
            $table->string('category')->default('fee');
            $table->enum('status', ['pending', 'confirmed', 'cancelled'])->default('confirmed');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};