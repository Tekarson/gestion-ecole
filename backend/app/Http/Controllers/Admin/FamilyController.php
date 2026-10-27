<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Family;
use App\Services\FeeService;
use App\Support\Payloads;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FamilyController extends Controller
{
    public function index(Request $request, FeeService $fees): JsonResponse
    {
        $families = Family::orderBy('parent_name')->get();

        $result = [];
        foreach ($families as $family) {
            $finance = $fees->familyFinance((int) $family->id);
            $user = $family->users()->first();

            $result[] = [
                'profile' => [
                    'id' => (string) $family->id,
                    'full_name' => $family->parent_name,
                    'email' => $user?->email ?? '',
                    'phone' => $family->phone,
                    'role' => 'parent',
                ],
                'students' => $finance['children'],
                'finance' => collect($finance)->except('children')->all(),
            ];
        }

        return response()->json($result);
    }

    public function show(Request $request, FeeService $fees, string $family): JsonResponse
    {
        $family = Family::findOrFail($family);
        $finance = $fees->familyFinance((int) $family->id);
        $user = $family->users()->first();

        return response()->json([
            'profile' => [
                'id' => (string) $family->id,
                'full_name' => $family->parent_name,
                'email' => $user?->email ?? '',
                'phone' => $family->phone,
                'role' => 'parent',
            ],
            'students' => $finance['children'],
            'finance' => collect($finance)->except('children')->all(),
        ]);
    }
}