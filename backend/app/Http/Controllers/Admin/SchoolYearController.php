<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SchoolYear;
use App\Models\Student;
use App\Services\SchoolYearService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SchoolYearController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(self::payload());
    }

    public function store(Request $request, SchoolYearService $years): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:20', 'regex:/^\d{4}-\d{4}$/'],
            'starts_on' => ['nullable', 'date'],
            'ends_on' => ['nullable', 'date', 'after_or_equal:starts_on'],
            'activate' => ['nullable', 'boolean'],
        ], [
            'name.regex' => 'Le nom de l’année doit avoir la forme AAAA-AAAA (ex. 2027-2028).',
        ]);

        $year = $years->create($data['name'], $data['starts_on'] ?? null, $data['ends_on'] ?? null, $request->user()?->id);
        if (! empty($data['activate'])) {
            $years->activate($year, $request->user()?->id);
        }

        return response()->json(self::payload(), 201);
    }

    public function update(Request $request, SchoolYear $schoolYear, SchoolYearService $years): JsonResponse
    {
        $data = $request->validate([
            'starts_on' => ['nullable', 'date'],
            'ends_on' => ['nullable', 'date', 'after_or_equal:starts_on'],
        ]);

        $years->update($schoolYear, $data['starts_on'] ?? null, $data['ends_on'] ?? null);

        return response()->json(self::payload());
    }

    public function activate(Request $request, SchoolYear $schoolYear, SchoolYearService $years): JsonResponse
    {
        $years->activate($schoolYear, $request->user()?->id);

        return response()->json(self::payload());
    }

    /**
     * @return array<string, mixed>
     */
    public static function payload(): array
    {
        $counts = Student::where('status', 'active')
            ->selectRaw('school_year, count(*) as total')
            ->groupBy('school_year')
            ->pluck('total', 'school_year');

        return [
            'years' => SchoolYear::orderByDesc('name')->get()->map(fn (SchoolYear $y) => [
                'id' => (string) $y->id,
                'name' => $y->name,
                'starts_on' => $y->starts_on?->toDateString(),
                'ends_on' => $y->ends_on?->toDateString(),
                'is_active' => (bool) $y->is_active,
                'students' => (int) ($counts[$y->name] ?? 0),
            ])->values()->all(),
        ];
    }
}
