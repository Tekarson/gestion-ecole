<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fee_settings', function (Blueprint $table) {
            $table->id();
            $table->string('label')->unique();
            $table->decimal('amount', 8, 2);
            $table->string('category');
            $table->unsignedTinyInteger('term')->nullable();
            $table->string('school_year');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fee_settings');
    }
};