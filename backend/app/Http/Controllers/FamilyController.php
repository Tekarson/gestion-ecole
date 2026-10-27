<?php

namespace App\Http\Controllers;

use App\Services\FeeService;
use App\Support\Payloads;
use App\Support\SchoolContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FamilyController extends Controller
{
    public function family(Request $request, FeeService $fees): JsonResponse
    {
        $user = $request->user();
        $familyId = (int) $user->family_id;

        $finance = $fees->familyFinance($familyId);

        $payments = $user->family->payments()
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($p) => Payloads::payment($p));

        $notifications = $user->notifications()
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($n) => Payloads::notification($n));

        return response()->json([
            'profile' => Payloads::profile($user),
            'school_year' => SchoolContext::activeYear(),
            'students' => $finance['children'],
            'finance' => collect($finance)->except('children')->all(),
            'payments' => $payments,
            'notifications' => $notifications,
        ]);
    }
}