<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\Student;

/**
 * Generates the school's unique references:
 *  - student matricule: "2026-0001"
 *  - payment reference: "REC-2026-000001" (count starts at 101)
 */
class ReferenceService
{
    public function nextMatricule(?string $year = null): string
    {
        $year ??= $this->startYear();

        $last = Student::where('matricule', 'like', $year.'-%')
            ->orderByDesc('matricule')
            ->value('matricule');

        $number = 1;
        if ($last !== null) {
            $parts = explode('-', (string) $last);
            $number = ((int) end($parts)) + 1;
        }

        return sprintf('%s-%04d', $year, $number);
    }

    public function nextPaymentReference(?string $year = null): string
    {
        $year ??= $this->startYear();

        $count = Payment::where('reference', 'like', 'REC-'.$year.'-%')->count();

        return sprintf('REC-%s-%06d', $year, $count + 1);
    }

    public function shortYear(?string $year = null): string
    {
        return substr($this->startYear($year), -2);
    }

    /**
     * Start year of the current school year, e.g. "2026" for "2026-2027".
     */
    public function startYear(?string $schoolYear = null): string
    {
        $schoolYear ??= config('services.school.year');

        return substr(trim((string) $schoolYear), 0, 4);
    }
}