<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Payment;
use App\Models\Student;
use App\Models\TermPeriod;
use App\Services\FeeService;
use App\Services\NotificationService;
use App\Services\ReferenceService;
use App\Support\Payloads;
use App\Support\ReceiptPdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class PaymentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $payments = Payment::where('family_id', $request->user()->family_id)
            ->with(['student.schoolClass', 'family'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json($payments->map(fn ($p) => Payloads::payment($p)));
    }

    public function show(Request $request, string $payment): JsonResponse
    {
        $payment = Payment::with(['student.schoolClass', 'family'])
            ->where('id', $payment)
            ->where('family_id', $request->user()->family_id)
            ->first();

        if (! $payment) {
            throw new NotFoundHttpException();
        }

        return response()->json(Payloads::payment($payment));
    }

    public function recu(Request $request, string $payment): Response
    {
        $payment = Payment::with(['student.schoolClass', 'family', 'student'])
            ->where('id', $payment)
            ->where('family_id', $request->user()->family_id)
            ->first();

        if (! $payment) {
            throw new NotFoundHttpException();
        }

        if ($payment->status !== 'confirmed') {
            abort(403, 'Le reçu n’est disponible qu’après confirmation du paiement.');
        }

        $pdf = ReceiptPdf::generate($payment);

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"recu-{$payment->reference}.pdf\"",
        ]);
    }

    public function store(Request $request, ReferenceService $references, FeeService $fees): JsonResponse
    {
        $data = $request->validate([
            'student_id' => ['required', 'string'],
            'nature' => ['required', 'string', 'max:100'],
            'amount' => ['required', 'numeric', 'min:1'],
            'method' => ['required', 'in:mobile_money,carte,guichet,especes,virement'],
        ]);

        $student = Student::where('id', $data['student_id'])
            ->where('family_id', $request->user()->family_id)
            ->first();

        if (! $student) {
            throw new NotFoundHttpException('Enfant introuvable.');
        }

        $term = match ($data['nature']) {
            'tranche2' => 2,
            'tranche3' => 3,
            default => 1,
        };

        // La tranche doit être dans sa fenêtre de paiement (§6).
        if (in_array($term, [2, 3], true)) {
            $period = TermPeriod::where('term', $term)->first();
            if ($period !== null) {
                if ($period->opens_at !== null && now()->lt($period->opens_at->startOfDay())) {
                    abort(422, "La «{$period->name}» s'ouvre le {$period->opens_at->format('d/m/Y')}.");
                }
                if ($period->closes_at !== null && now()->gt($period->closes_at->endOfDay())) {
                    abort(422, "La «{$period->name}» est close depuis le {$period->closes_at->format('d/m/Y')}.");
                }
            }
        }

        // Le montant ne doit pas dépasser le solde restant de la nature (§17).
        $remaining = $fees->natureRemaining($student, $data['nature']);
        if ($remaining !== null && $remaining <= 0) {
            abort(422, 'Cette dépense est déjà soldée.');
        }
        if ($remaining !== null && (float) $data['amount'] > $remaining + 0.001) {
            abort(422, sprintf('Ce montant dépasse le solde restant (%s $).', number_format($remaining, 0)));
        }

        $payment = Payment::create([
            'reference' => $references->nextPaymentReference(),
            'family_id' => $request->user()->family_id,
            'student_id' => $student->id,
            'amount' => $data['amount'],
            'method' => $data['method'],
            'date' => now()->toDateString(),
            'term' => $term,
            'category' => $data['nature'],
            'school_year' => \App\Support\SchoolContext::activeYear(),
            'status' => 'pending',
        ]);

        AuditLog::create([
            'user_id' => $request->user()?->id,
            'family_id' => $request->user()->family_id,
            'action' => 'payment.received',
            'details' => [
                'reference' => $payment->reference,
                'student' => $student->full_name,
                'nature' => $data['nature'],
                'amount' => (float) $data['amount'],
                'method' => $data['method'],
            ],
        ]);

        NotificationService::notifyFamily(
            $request->user()->family_id,
            'Paiement envoyé',
            sprintf('Votre paiement de %s $ pour %s (%s) a été enregistré et attend la confirmation.', number_format((float) $data['amount'], 0), $student->full_name, Payloads::feeLabel($data['nature'])),
        );

        return response()->json(Payloads::payment($payment->load('student.schoolClass', 'family')), 201);
    }
}