<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Services\FeeService;
use App\Support\Payloads;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request, FeeService $fees): JsonResponse
    {
        $classes = SchoolClass::all();
        $bySection = $classes
            ->groupBy('level')
            ->map(fn ($list, string $level) => ['name' => $level, 'count' => $list->count()])
            ->values()
            ->all();

        $studentCount = Student::enrolled()->count();
        $familyCount = \App\Models\Family::count();

        $pending = Payment::where('status', 'pending')
            ->with(['student.schoolClass', 'family'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($p) => Payloads::payment($p));

        $totalPaid = Payment::where('status', 'confirmed')->sum('amount');

        $revenueByYear = Payment::where('status', 'confirmed')
            ->whereNotNull('school_year')
            ->get(['school_year', 'amount'])
            ->groupBy('school_year')
            ->map(function ($group) {
                return [
                    'year' => (string) $group->first()->school_year,
                    'totalPaid' => round((float) $group->sum('amount') * 100) / 100,
                    'count' => $group->count(),
                ];
            })
            ->sortKeysDesc()
            ->values()
            ->all();

        $totalDue = 0.0;
        $placeConfirmed = 0;
        $totalDiscount = 0.0;
        $families4 = 0;
        $families5 = 0;
        $exemptSixth = 0;
        foreach (\App\Models\Family::all() as $family) {
            $finance = $fees->familyFinance((int) $family->id);
            $totalDue += $finance['totalNet'] ?? $finance['totalDue'];
            $totalDiscount += $finance['discount'] ?? 0.0;
            $childCount = $finance['childCount'] ?? 0;
            if ($childCount === 4) {
                $families4++;
            } elseif ($childCount === 5) {
                $families5++;
            }
            $exemptSixth += $finance['exemptCount'] ?? 0;
        }
        $pendingStudents = 0;
        foreach (Student::with('payments')->enrolled()->get() as $student) {
            $finance = $fees->studentFinance($student, $student->payments);
            if ($finance['placeConfirmed']) {
                $placeConfirmed++;
            } else {
                $pendingStudents++;
            }
        }

        return response()->json([
            'stats' => [
                'studentCount' => $studentCount,
                'familyCount' => $familyCount,
                'pendingCount' => $pending->count(),
                'totalPaid' => round((float) $totalPaid * 100) / 100,
                'totalDue' => round($totalDue * 100) / 100,
                'placeConfirmed' => $placeConfirmed,
                'pendingStudents' => $pendingStudents,
                'totalDiscount' => round($totalDiscount * 100) / 100,
                'families4' => $families4,
                'families5' => $families5,
                'exemptSixth' => $exemptSixth,
            ],
            'bySection' => $bySection,
            'revenueByYear' => $revenueByYear,
            'pending' => $pending->values(),
        ]);
    }

    public function journal(Request $request): JsonResponse
    {
        $logs = \App\Models\AuditLog::with('user')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($logs->map(fn ($l) => Payloads::audit($l)));
    }
}