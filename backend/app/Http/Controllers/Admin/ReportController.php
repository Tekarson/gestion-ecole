<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Family;
use App\Services\FeeService;
use App\Support\SchoolContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    /**
     * Solvables / insolvables : pour chaque élève actif, ce qui est dû, payé
     * et restant, sur tous les frais (`all`), sur le minerval (`minerval`)
     * ou sur un seul type de frais (`inscription`, `assurance`, `tranche1`…).
     */
    public function solvency(Request $request, FeeService $fees): JsonResponse
    {
        $data = $request->validate([
            'nature' => ['nullable', 'string', 'max:100'],
        ]);
        $nature = $data['nature'] ?? 'all';

        $rows = [];
        $natures = [];
        foreach (Family::orderBy('parent_name')->get() as $family) {
            $finance = $fees->familyFinance((int) $family->id);

            foreach ($finance['children'] as $child) {
                $f = $child['finance'];
                foreach ($f['lines'] as $line) {
                    $natures[$line['key']] = $line['label'];
                }

                [$due, $paid] = match ($nature) {
                    'all' => [(float) ($f['childNet'] ?? $f['totalDue']), (float) $f['totalPaid']],
                    'minerval' => [(float) $f['minervalDue'], (float) $f['minervalPaid']],
                    default => $this->lineAmounts($f['lines'], $nature),
                };

                // Élève non concerné par ce type de frais (rien de dû, rien de payé).
                if ($due <= 0.0 && $paid <= 0.0) {
                    continue;
                }

                $remaining = round(max(0.0, $due - $paid) * 100) / 100;
                $rows[] = [
                    'student_id' => (string) $child['student']['id'],
                    'student_name' => trim(($child['student']['first_name'] ?? '').' '.($child['student']['last_name'] ?? '').' '.($child['student']['postnom'] ?? '')),
                    'matricule' => $child['student']['matricule'] ?? null,
                    'class_name' => $child['cls']['name'] ?? null,
                    'family_id' => (string) $family->id,
                    'parent_name' => $family->parent_name,
                    'phone' => $family->phone,
                    'due' => round($due * 100) / 100,
                    'paid' => round($paid * 100) / 100,
                    'remaining' => $remaining,
                    'solvent' => $remaining <= 0.0,
                ];
            }
        }

        asort($natures);

        return response()->json([
            'school_year' => SchoolContext::activeYear(),
            'nature' => $nature,
            'natures' => collect($natures)->map(fn ($label, $key) => ['key' => $key, 'label' => $label])->values()->all(),
            'rows' => $rows,
        ]);
    }

    /**
     * @return array{0: float, 1: float}
     */
    private function lineAmounts(array $lines, string $nature): array
    {
        foreach ($lines as $line) {
            if ($line['key'] === $nature) {
                return [(float) $line['due'], (float) $line['paid']];
            }
        }

        return [0.0, 0.0];
    }
}
