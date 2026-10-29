<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Family;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Services\FeeService;
use App\Services\ReferenceService;
use App\Support\Payloads;
use App\Support\SchoolContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentController extends Controller
{
    public function index(): JsonResponse
    {
        $students = Student::with(['schoolClass', 'family'])
            ->orderBy(SchoolClass::select('name')
                ->whereColumn('school_classes.id', 'students.class_id')
                ->take(1))
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();

        return response()->json($students->map(fn (Student $s) => Payloads::adminStudent($s)));
    }

    public function store(Request $request, ReferenceService $references): JsonResponse
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'postnom' => ['nullable', 'string', 'max:100'],
            'gender' => ['nullable', 'in:M,F'],
            'birth_date' => ['nullable', 'date'],
            'class_id' => ['required', 'string', 'exists:school_classes,id'],
            'family_id' => ['required', 'string', 'exists:families,id'],
            'status' => ['nullable', 'in:active,inactive'],
            'photo' => ['nullable', 'string', 'max:1000'],
            'is_teacher_child' => ['nullable', 'boolean'],
            'is_entitled' => ['nullable', 'boolean'],
        ]);

        $year = $references->startYear(SchoolContext::activeYear());

        $student = Student::create([
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'postnom' => $data['postnom'] ?? null,
            'gender' => $data['gender'] ?? null,
            'birth_date' => $data['birth_date'] ?? null,
            'class_id' => $data['class_id'],
            'family_id' => $data['family_id'],
            'photo' => $data['photo'] ?? null,
            'matricule' => $references->nextMatricule($year),
            'is_exempt' => false,
            'is_teacher_child' => (bool) ($data['is_teacher_child'] ?? false),
            'is_entitled' => (bool) ($data['is_entitled'] ?? false),
            'status' => $data['status'] ?? 'active',
        ]);

        AuditLog::create([
            'user_id' => $request->user()?->id,
            'action' => 'student.created',
            'details' => ['student' => $student->full_name, 'matricule' => $student->matricule],
        ]);

        return response()->json(Payloads::adminStudent($student->load('schoolClass', 'family')), 201);
    }

    /**
     * Situation financière d'un élève (lignes de frais restant à payer),
     * utilisée par le guichet pour n'afficher que ce qui est encore dû.
     */
    public function finance(Student $student, FeeService $fees): JsonResponse
    {
        return response()->json($fees->studentFinance($student->load('schoolClass', 'payments')));
    }

    /**
     * Téléversement d'une photo d'élève ; renvoie l'URL publique à enregistrer.
     */
    public function uploadPhoto(Request $request): JsonResponse
    {
        $request->validate([
            'photo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ]);

        $file = $request->file('photo');
        $dir = public_path('uploads/students');
        if (! is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        $name = now()->format('YmdHis').'-'.bin2hex(random_bytes(6)).'.'.strtolower($file->getClientOriginalExtension() ?: 'jpg');
        $file->move($dir, $name);

        return response()->json(['url' => url('uploads/students/'.$name)], 201);
    }

    public function update(Request $request, Student $student): JsonResponse
    {
        $data = $request->validate([
            'first_name' => ['sometimes', 'string', 'max:100'],
            'last_name' => ['sometimes', 'string', 'max:100'],
            'postnom' => ['sometimes', 'nullable', 'string', 'max:100'],
            'gender' => ['sometimes', 'nullable', 'in:M,F'],
            'birth_date' => ['sometimes', 'nullable', 'date'],
            'class_id' => ['sometimes', 'string', 'exists:school_classes,id'],
            'family_id' => ['sometimes', 'nullable', 'string', 'exists:families,id'],
            'status' => ['sometimes', 'in:active,inactive'],
            'is_exempt' => ['sometimes', 'boolean'],
            'is_teacher_child' => ['sometimes', 'boolean'],
            'is_entitled' => ['sometimes', 'boolean'],
            'photo' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);

        // Identité (noms, genre, famille) : modifiable par le superadmin uniquement.
        if (! $request->user()->isSuperAdmin()) {
            $data = array_diff_key($data, array_flip(['first_name', 'last_name', 'postnom', 'gender', 'family_id']));
        }

        $student->fill(array_filter($data, fn ($value) => $value !== null));
        if (array_key_exists('postnom', $data)) {
            $student->postnom = $data['postnom'];
        }
        if (array_key_exists('photo', $data)) {
            $student->photo = $data['photo'];
        }
        $student->save();

        AuditLog::create([
            'user_id' => $request->user()?->id,
            'action' => 'student.updated',
            'details' => ['student' => $student->full_name, 'fields' => array_keys($data)],
        ]);

        return response()->json(Payloads::adminStudent($student->load('schoolClass', 'family')));
    }
}