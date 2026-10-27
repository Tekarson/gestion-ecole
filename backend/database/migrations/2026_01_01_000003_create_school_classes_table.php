<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('school_classes', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('level');
            $table->decimal('tranche1', 8, 2)->default(0);
            $table->decimal('tranche2', 8, 2)->default(0);
            $table->decimal('tranche3', 8, 2)->default(0);
            $table->decimal('books', 8, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('school_classes');
    }
};