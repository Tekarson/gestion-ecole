<?php

namespace App\Support;

use App\Models\Payment;
use App\Support\SchoolContext;
use Dompdf\Dompdf;

/**
 * Generates a payment receipt PDF on the backend with dompdf (pure PHP),
 * so no python/Chrome/system dependency is required at runtime.
 */
class ReceiptPdf
{
    private const METHOD_LABELS = [
        'mobile_money' => 'Mobile Money',
        'carte' => 'Carte bancaire',
        'especes' => 'Espèces',
        'guichet' => 'Guichet',
        'virement' => 'Virement bancaire',
    ];

    private const TRANCHE_LABELS = [
        1 => 'Tranche 1',
        2 => 'Tranche 2',
        3 => 'Tranche 3',
    ];

    private const STATUS_LABELS = [
        'en_attente' => 'En attente',
        'confirme' => 'Confirmé',
        'annule' => 'Annulé',
    ];

    private const MONTHS_SHORT = [
        1 => 'janv.', 2 => 'févr.', 3 => 'mars', 4 => 'avr.', 5 => 'mai', 6 => 'juin',
        7 => 'juil.', 8 => 'août', 9 => 'sept.', 10 => 'oct.', 11 => 'nov.', 12 => 'déc.',
    ];

    /**
     * Build the PDF bytes for a payment.
     */
    public static function generate(Payment $payment): string
    {
        $payment->loadMissing(['student', 'family', 'student.schoolClass']);

        $status = match ($payment->status) {
            'pending' => 'en_attente',
            'cancelled' => 'annule',
            default => 'confirme',
        };

        $amount = number_format((float) $payment->amount, 0, ',', ' ');

        $matricule = $payment->student?->matricule;
        $tranche = null;
        if (str_starts_with((string) $payment->category, 'tranche')) {
            $tranche = $payment->term;
        }

        // Solde restant du compte de l'élève, paiement confirmé inclus.
        $solde = null;
        if ($payment->status === 'confirmed' && $payment->student) {
            $solde = (new \App\Services\FeeService)->studentFinance($payment->student, $payment->student->payments)['balance'];
        }

        $payload = [
            'school_name' => config('services.school.name'),
            'school_year' => SchoolContext::activeYear(),
            'reference' => $payment->reference,
            'student_name' => $payment->student?->full_name ?? '—',
            'matricule' => $matricule,
            'class_name' => $payment->student?->schoolClass?->name,
            'parent_name' => $payment->family?->parent_name ?? '—',
            'nature' => Payloads::feeLabel($payment->category),
            'tranche' => $tranche !== null ? (self::TRANCHE_LABELS[$tranche] ?? null) : null,
            'method' => self::METHOD_LABELS[$payment->method] ?? $payment->method,
            'status' => $status,
            'status_label' => self::STATUS_LABELS[$status] ?? $status,
            'date' => self::dateFr($payment->created_at?->toDateString()),
            'amount' => $amount,
            'solde' => $solde !== null ? number_format($solde, 0, ',', ' ') : null,
            'note' => is_string($payment->note) ? $payment->note : null,
        ];

        $dompdf = new Dompdf();
        $dompdf->loadHtml(self::html($payload), 'UTF-8');
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        return $dompdf->output();
    }

    private static function html(array $p): string
    {
        $e = static fn ($v) => htmlspecialchars((string) ($v ?? ''), ENT_QUOTES, 'UTF-8');
        $rows = '';

        foreach ([
            'Élève' => $p['student_name'],
            'Matricule' => $p['matricule'],
            'Classe' => $p['class_name'],
            'Famille / Responsable' => $p['parent_name'],
            'Objet du paiement' => $p['nature'],
            'Tranche' => $p['tranche'],
            'Moyen de paiement' => $p['method'],
            'Date' => $p['date'],
            'Statut' => $p['status_label'],
        ] as $label => $value) {
            if ($value === null || $value === '' || $value === '—') {
                continue;
            }
            $rows .= '<tr><td class="k">'.$e($label).'</td><td class="v">'.$e($value).'</td></tr>';
        }

        $note = $p['note'] ? '<div class="note"><strong>Note :</strong> '.$e($p['note']).'</div>' : '';

        $soldeBlock = $p['solde'] !== null
            ? '<div class="solde">Solde restant sur le compte de l’élève après ce paiement : <strong>'.$e($p['solde']).' $</strong></div>'
            : '';

        return <<<HTML
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4 portrait; margin: 14mm 16mm 18mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "DejaVu Sans", sans-serif;
    font-size: 10.5pt;
    color: #1e1b4b;
  }

  .header {
    border-bottom: 3px solid #4f46e5;
    padding-bottom: 6mm;
  }
  .header table { width: 100%; border-collapse: collapse; }
  .brand-name {
    font-size: 15pt;
    font-weight: bold;
    color: #312e81;
  }
  .brand-sub { font-size: 9pt; color: #6b7280; margin-top: 1mm; }
  .ledger { text-align: right; vertical-align: top; }
  .ledger .title { font-size: 13pt; font-weight: bold; color: #4f46e5; }
  .ledger .year { font-size: 9pt; color: #6b7280; margin-top: 1mm; }

  .ref-band {
    margin-top: 6mm;
    background: #eef2ff;
    border: 1px solid #c7d2fe;
    border-left: 4px solid #4f46e5;
    padding: 3mm 5mm;
  }
  .ref-band table { width: 100%; border-collapse: collapse; }
  .ref-band .k { font-size: 8pt; text-transform: uppercase; color: #4f46e5; font-weight: bold; }
  .ref-band .v { font-size: 14pt; font-weight: bold; color: #312e81; }
  .paid-seal {
    font-size: 9pt;
    font-weight: bold;
    text-transform: uppercase;
    padding: 2mm 5mm;
    color: #ffffff;
  }
  .paid-seal.confirme { background: #059669; }
  .paid-seal.en_attente { background: #d97706; }
  .paid-seal.annule    { background: #b91c1c; }

  table.info {
    width: 100%;
    border-collapse: collapse;
    margin-top: 6mm;
  }
  table.info td { padding: 3mm 0; border-bottom: 1px dashed #e5e7eb; vertical-align: top; }
  table.info .k { color: #6b7280; width: 38%; }
  table.info .v { font-weight: bold; color: #1e1b4b; }

  .amount-box {
    margin-top: 7mm;
    background: #4f46e5;
    color: #ffffff;
    padding: 5mm 7mm;
  }
  .amount-box table { width: 100%; border-collapse: collapse; }
  .amount-box .k { font-size: 10pt; text-transform: uppercase; }
  .amount-box .v { font-size: 20pt; font-weight: bold; text-align: right; }

  .solde {
    margin-top: 4mm;
    background: #eef2ff;
    border: 1px solid #c7d2fe;
    padding: 3mm 5mm;
    font-size: 9.5pt;
    color: #312e81;
    text-align: right;
  }
  .solde strong { color: #312e81; }

  .note {
    margin-top: 5mm;
    background: #fffbeb;
    border: 1px solid #fcd34d;
    padding: 3mm 5mm;
    font-size: 9.5pt;
    color: #92400e;
  }

  .footer {
    margin-top: 10mm;
    border-top: 1px solid #e5e7eb;
    padding-top: 4mm;
    text-align: center;
    font-size: 9pt;
    color: #6b7280;
  }
  .footer .strong { color: #4f46e5; font-weight: bold; }
</style>
</head>
<body>
  <div class="header">
    <table>
      <tr>
        <td>
          <div class="brand-name">{$e($p['school_name'])}</div>
          <div class="brand-sub">Gestion des frais scolaires &bull; Année scolaire {$e($p['school_year'])}</div>
        </td>
        <td class="ledger">
          <div class="title">Reçu de paiement</div>
          <div class="year">Année scolaire {$e($p['school_year'])}</div>
        </td>
      </tr>
    </table>
  </div>

  <div class="ref-band">
    <table>
      <tr>
        <td>
          <div class="k">Référence</div>
          <div class="v">{$e($p['reference'])}</div>
        </td>
        <td style="text-align:right; vertical-align:middle;">
          <span class="paid-seal {$e($p['status'])}">{$e($p['status_label'])}</span>
        </td>
      </tr>
    </table>
  </div>

  <table class="info">{$rows}</table>

  <div class="amount-box">
    <table>
      <tr>
        <td class="k">Montant payé</td>
        <td class="v">{$e($p['amount'])} $</td>
      </tr>
    </table>
  </div>

  {$soldeBlock}

  {$note}

  <div class="footer">
    <span class="strong">{$e($p['school_name'])}</span> — Merci pour votre confiance. Ce reçu fait foi dans les livres de l'établissement.<br />
    Référence : {$e($p['reference'])} &bull; Émis le {$e($p['date'])}
  </div>
</body>
</html>
HTML;
    }

    private static function dateFr(?string $date): string
    {
        if (! $date) {
            return '';
        }

        [$year, $month, $day] = explode('-', $date);

        return sprintf('%s %s %s', $day, self::MONTHS_SHORT[(int) $month] ?? '', $year);
    }
}