<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('students', 'photo')) {
            Schema::table('students', function (Blueprint $table) {
                $table->string('photo')->nullable()->after('matricule');
            });
        }

        if (! Schema::hasColumn('notifications', 'ref')) {
            Schema::table('notifications', function (Blueprint $table) {
                $table->string('ref')->nullable()->after('message');
                $table->index('ref');
            });
        }
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn('photo');
        });
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndex(['ref']);
            $table->dropColumn('ref');
        });
    }
};