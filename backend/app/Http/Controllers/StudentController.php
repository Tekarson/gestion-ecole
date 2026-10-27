<?php

namespace App\Http\Controllers;

use App\Models\SchoolClass;
use App\Models\Student;
use App\Services\FeeService;
use App\Services\ReferenceService;
use App\Support\Payloads;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class StudentController extends Controller
{
    protected function familyStudent(Request $request, string $id): Student
    {
        $student = Student::where('id', $id)
            ->where('family_id', $request->user()->family_id)
            ->first();

        if (! $student) {
            throw new NotFoundHttpException();
        }

        return $student;
    }

    public function index(Request $request, FeeService $fees): JsonResponse
    {
        $students = Student::where('family_id', $request->user()->family_id)
            ->orderBy('id')
            ->get();

        return response()->json($students->map(fn ($student) => $this->payload($student, $fees)));
    }

    public function show(Request $request, FeeService $fees, string $student): JsonResponse
    {
        $student = $this->familyStudent($request, $student);

        return response()->json($this->payload($student, $fees));
    }

    public function store(Request $request, FeeService $fees, ReferenceService $references): JsonResponse
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'postnom' => ['nullable', 'string', 'max:255'],
            'class_id' => ['required', 'exists:school_classes,id'],
        ]);

        $class = SchoolClass::findOrFail($data['class_id']);

        $student = Student::create([
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'postnom' => $data['postnom'] ?? null,
            'gender' => 'X',
            'family_id' => $request->user()->family_id,
            'class_id' => $class->id,
            'matricule' => $references->nextMatricule(),
            'is_exempt' => false,
            'status' => 'active',
        ]);

        return response()->json($this->payload($student, $fees), 201);
    }

    protected function payload(Student $student, FeeService $fees): array
    {
        $finance = $fees->studentFinance($student);

        return [
            'student' => Payloads::student($student),
            'cls' => $finance['cls'],
            'finance' => collect($finance)->except('cls')->all(),
        ];
    }
}