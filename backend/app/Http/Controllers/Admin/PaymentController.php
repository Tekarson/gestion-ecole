<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Payment;
use App\Models\Student;
use App\Services\FeeService;
use App\Services\NotificationService;
use App\Services\ReferenceService;
use App\Support\Payloads;
use App\Support\ReceiptPdf;
use App\Support\SchoolContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class PaymentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $payments = Payment::with(['student.schoolClass', 'family'])
            ->when($request->has('status') && $request->input('status') !== 'all', function ($q) use ($request) {
                $q->where('status', $request->input('status'));
            })
            ->orderByDesc('created_at')
            ->get();

        return response()->json($payments->map(fn ($p) => Payloads::payment($p)));
    }

    public function store(Request $request, ReferenceService $references, FeeService $fees): JsonResponse
    {
        $data = $request->validate([
            'student_id' => ['required', 'string'],
            'nature' => ['required', 'string', 'max:100'],
            'amount' => ['required', 'numeric', 'min:1'],
            'method' => ['required', 'in:mobile_money,carte,guichet,especes,virement'],
        ]);

        $student = Student::find($data['student_id']);

        if (! $student) {
            throw new NotFoundHttpException('Élève introuvable.');
        }

        // Le montant ne doit pas dépasser le solde restant du type de frais.
        $remaining = $fees->natureRemaining($student, $data['nature']);
        if ($remaining !== null && $remaining <= 0) {
            abort(422, 'Ces frais sont déjà soldés pour cet élève.');
        }
        if ($remaining !== null && (float) $data['amount'] > $remaining + 0.001) {
            abort(422, sprintf('Ce montant dépasse le solde restant (%s $).', number_format($remaining, 0)));
        }

        $payment = Payment::create([
            'reference' => $references->nextPaymentReference(),
            'family_id' => $student->family_id,
            'student_id' => $student->id,
            'amount' => $data['amount'],
            'method' => $data['method'],
            'date' => now()->toDateString(),
            'term' => match ($data['nature']) {
                'tranche2' => 2,
                'tranche3' => 3,
                default => 1,
            },
            'category' => $data['nature'],
            'school_year' => SchoolContext::activeYear(),
            'status' => 'confirmed',
        ]);

        AuditLog::create([
            'user_id' => $request->user()?->id,
            'family_id' => $student->family_id,
            'action' => 'payment.recorded',
            'details' => [
                'reference' => $payment->reference,
                'student' => $student->full_name,
                'nature' => $data['nature'],
                'amount' => (float) $data['amount'],
                'method' => $data['method'],
            ],
        ]);

        NotificationService::notifyFamily(
            $student->family_id,
            'Paiement enregistré',
            sprintf('Un montant de %s $ a été enregistré pour %s (%s).', number_format((float) $data['amount'], 0), $student->full_name, \App\Support\Payloads::feeLabel($data['nature'])),
        );

        return response()->json(Payloads::payment($payment->load('student.schoolClass', 'family')), 201);
    }

    public function recu(Request $request, string $payment): Response
    {
        $payment = Payment::with(['student.schoolClass', 'family', 'student'])->findOrFail($payment);

        if ($payment->status !== 'confirmed') {
            abort(403, 'Le reçu n’est disponible qu’après confirmation du paiement.');
        }

        $pdf = ReceiptPdf::generate($payment);

        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"recu-{$payment->reference}.pdf\"",
        ]);
    }

    public function updateStatus(Request $request, string $payment): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:confirmed,cancelled'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $payment = Payment::with(['student.schoolClass', 'family'])->findOrFail($payment);

        if ($payment->status === $data['status']) {
            return response()->json(Payloads::payment($payment));
        }

        $payment->update(['status' => $data['status']]);

        \App\Models\AuditLog::create([
            'user_id' => $request->user()?->id,
            'family_id' => $payment->family_id,
            'action' => "payment.{$data['status']}",
            'details' => [
                'reference' => $payment->reference,
                'student' => $payment->student?->full_name,
                'nature' => $payment->category,
                'amount' => (float) $payment->amount,
                'note' => $data['note'] ?? null,
            ],
        ]);

        if ($data['status'] === 'confirmed') {
            NotificationService::notifyFamily(
                $payment->family_id,
                'Paiement confirmé',
                sprintf('Votre paiement %s de %s $ est maintenant confirmé. Le reçu est disponible.', $payment->reference, number_format((float) $payment->amount, 0)),
            );

            // Confirmation de la réservation de la place (§22) dès que
            // inscription + tranche 1 sont réglés.
            if ($payment->student) {
                $student = $payment->student->load('payments');
                $fees = app(\App\Services\FeeService::class);
                if ($fees->studentFinance($student, $student->payments)['placeConfirmed']) {
                    NotificationService::notifyFamily(
                        $payment->family_id,
                        'Place réservée',
                        sprintf('La place de %s est réservée : l’inscription financière est confirmée. Bienvenue !', $student->full_name),
                        "place.confirmed.{$payment->school_year}.{$student->id}"
                    );
                }
            }
        } elseif ($data['status'] === 'cancelled') {
            NotificationService::notifyFamily(
                $payment->family_id,
                'Paiement annulé',
                sprintf('Votre paiement %s de %s $ a été annulé. Contactez l’administration pour plus de détails.', $payment->reference, number_format((float) $payment->amount, 0)),
            );
        }

        return response()->json(Payloads::payment($payment->refresh()));
    }
}