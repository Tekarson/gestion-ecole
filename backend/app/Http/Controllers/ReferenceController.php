<?php

namespace App\Http\Controllers;

use App\Services\ReferenceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReferenceController extends Controller
{
    public function index(Request $request, ReferenceService $references): JsonResponse
    {
        return response()->json([
            'school' => \App\Support\Payloads::school(),
            'classes' => \App\Support\Payloads::classes(\App\Models\SchoolClass::all()),
            'feeSettings' => \App\Support\Payloads::feeControls(\App\Models\FeeSetting::all()),
            'periods' => \App\Models\TermPeriod::orderBy('term')->get()
                ->map(fn ($p) => \App\Support\Payloads::period($p))
                ->all(),
        ]);
    }
}