<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\ModulePermission;
use App\Models\User;
use App\Support\Modules;
use App\Support\Payloads;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

/**
 * User management, superadmin only: creates admin accounts and grants them
 * modules with per-module CRUD permissions.
 */
class UserController extends Controller
{
    public function index(): JsonResponse
    {
        $users = User::whereIn('role', User::STAFF_ROLES)
            ->with('modulePermissions')
            ->orderBy('id')
            ->get();

        return response()->json([
            'users' => $users->map(fn (User $user) => Payloads::adminUser($user))->all(),
        ]);
    }

    public function modules(): JsonResponse
    {
        return response()->json([
            'modules' => Modules::labels(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateUser($request, null);

        $user = User::create([
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'postnom' => $data['postnom'] ?? null,
            'full_name' => User::composeFullName($data['first_name'], $data['last_name'], $data['postnom'] ?? null),
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => $data['role'] ?? User::ROLE_ADMIN,
            'is_active' => $data['is_active'] ?? true,
        ]);

        $this->syncModules($user, $data['modules'] ?? []);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'user.created',
            'details' => ['user' => $user->email],
        ]);

        return response()->json(Payloads::adminUser($user->load('modulePermissions')), 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $this->guardEditable($user);

        $data = $this->validateUser($request, $user->id);

        $attributes = [
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'postnom' => $data['postnom'] ?? null,
            'full_name' => User::composeFullName($data['first_name'], $data['last_name'], $data['postnom'] ?? null),
            'email' => $data['email'],
            'role' => $data['role'] ?? $user->role,
            'is_active' => $data['is_active'] ?? true,
        ];

        if (! empty($data['password'])) {
            $attributes['password'] = Hash::make($data['password']);
        }

        $user->update($attributes);
        $this->syncModules($user, $data['modules'] ?? []);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'user.updated',
            'details' => ['user' => $user->email],
        ]);

        return response()->json(Payloads::adminUser($user->fresh(['modulePermissions'])));
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->guardEditable($user);

        if ((string) $user->id === (string) $request->user()->id) {
            abort(422, 'Vous ne pouvez pas supprimer votre propre compte.');
        }

        AuditLog::create([
            'user_id' => $request->user()->id,
            'action' => 'user.deleted',
            'details' => ['user' => $user->email],
        ]);

        $user->delete();

        return response()->json(['ok' => true]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function validateUser(Request $request, ?string $ignoreId): array
    {
        return $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'postnom' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($ignoreId)],
            'password' => $ignoreId === null
                ? ['required', 'string', 'min:6']
                : ['nullable', 'string', 'min:6'],
            'role' => ['nullable', Rule::in(User::STAFF_ROLES)],
            'is_active' => ['boolean'],
            'modules' => ['array'],
            'modules.*.read' => ['boolean'],
            'modules.*.create' => ['boolean'],
            'modules.*.update' => ['boolean'],
            'modules.*.delete' => ['boolean'],
        ]);
    }

    /**
     * @param  array<string, array<string, bool>>  $modules
     */
    protected function syncModules(User $user, array $modules): void
    {
        $user->modulePermissions()->delete();

        foreach ($modules as $module => $flags) {
            if (! Modules::isValid($module)) {
                continue;
            }

            ModulePermission::create([
                'user_id' => $user->id,
                'module' => $module,
                'can_read' => (bool) ($flags['read'] ?? false),
                'can_create' => (bool) ($flags['create'] ?? false),
                'can_update' => (bool) ($flags['update'] ?? false),
                'can_delete' => (bool) ($flags['delete'] ?? false),
            ]);
        }
    }

    protected function guardEditable(User $user): void
    {
        if (! $user->isStaff()) {
            abort(422, 'Ce compte ne peut pas être modifié.');
        }
    }
}