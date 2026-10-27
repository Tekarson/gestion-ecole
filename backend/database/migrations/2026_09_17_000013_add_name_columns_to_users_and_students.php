<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('first_name')->nullable()->after('full_name');
            $table->string('last_name')->nullable()->after('first_name');
            $table->string('postnom')->nullable()->after('last_name');
        });

        Schema::table('students', function (Blueprint $table) {
            $table->string('postnom')->nullable()->after('last_name');
        });

        $rows = DB::table('users')->whereNull('first_name')->get(['id', 'full_name']);
        foreach ($rows as $row) {
            $parts = preg_split('/\s+/', trim((string) $row->full_name), -1, PREG_SPLIT_NO_EMPTY) ?: [];

            if ($parts === []) {
                continue;
            }

            $first = array_shift($parts);
            $last = $parts !== [] ? array_pop($parts) : null;
            $postnom = $parts !== [] ? implode(' ', $parts) : null;

            DB::table('users')->where('id', $row->id)->update([
                'first_name' => $first,
                'last_name' => $last,
                'postnom' => $postnom,
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['first_name', 'last_name', 'postnom']);
        });

        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn('postnom');
        });
    }
};