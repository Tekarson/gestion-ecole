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

    /**
     * Superadmin : correction du nom du parent et du téléphone de la famille.
     */
    public function update(Request $request, Family $family): JsonResponse
    {
        $data = $request->validate([
            'parent_name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
        ]);

        $family->update($data);

        \App\Models\AuditLog::create([
            'user_id' => $request->user()?->id,
            'family_id' => $family->id,
            'action' => 'family.updated',
            'details' => ['family' => $family->parent_name],
        ]);

        return response()->json(['id' => (string) $family->id, 'parent_name' => $family->parent_name, 'phone' => $family->phone]);
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