<?php

namespace App\Http\Controllers;

use App\Models\Family;
use App\Models\User;
use App\Support\Payloads;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        if (($request->header('X-App-Mode') ?? $request->input('app_mode')) === 'admin') {
            throw ValidationException::withMessages([
                'app_mode' => ['L’inscription est réservée à l’espace famille. Les comptes administration sont créés par le superadministrateur.'],
            ]);
        }

        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'postnom' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'phone' => ['nullable', 'string', 'max:50'],
        ]);

        $fullName = User::composeFullName($data['first_name'], $data['last_name'], $data['postnom'] ?? null);

        $family = Family::create([
            'parent_name' => $fullName,
            'phone' => $data['phone'] ?? null,
        ]);

        $user = User::create([
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'postnom' => $data['postnom'] ?? null,
            'full_name' => $fullName,
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => User::ROLE_FAMILY,
            'family_id' => $family->id,
        ]);

        return response()->json([
            'token' => $user->createToken('ntshik')->plainTextToken,
            'user' => Payloads::profile($user),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Identifiants invalides.'],
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Ce compte a été désactivé.'],
            ]);
        }

        $portal = $request->header('X-App-Mode') ?? $request->input('app_mode');

        if ($portal === 'admin' && ! $user->isAdmin()) {
            throw ValidationException::withMessages([
                'email' => ['Ce compte famille doit se connecter depuis l’espace famille.'],
            ]);
        }

        if ($portal === 'family' && $user->isAdmin()) {
            throw ValidationException::withMessages([
                'email' => ['Ce compte administration doit se connecter depuis le portail administration.'],
            ]);
        }

        return response()->json([
            'token' => $user->createToken('ntshik')->plainTextToken,
            'user' => Payloads::profile($user),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(Payloads::profile($request->user()));
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['ok' => true]);
    }
}