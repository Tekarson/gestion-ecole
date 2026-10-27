<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function testFamilyCanRegister(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'first_name' => 'Rachidi',
            'last_name' => 'Mwamba',
            'postnom' => 'Kasongo',
            'email' => 'rachidi@ntshik.cd',
            'password' => 'secret123',
            'phone' => '+243812345678',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['token', 'user' => ['id', 'full_name', 'first_name', 'last_name', 'postnom', 'email', 'role']])
            ->assertJsonPath('user.email', 'rachidi@ntshik.cd')
            ->assertJsonPath('user.role', 'family')
            ->assertJsonPath('user.full_name', 'Rachidi Mwamba Kasongo')
            ->assertJsonPath('user.first_name', 'Rachidi')
            ->assertJsonPath('user.last_name', 'Mwamba')
            ->assertJsonPath('user.postnom', 'Kasongo');

        $this->assertDatabaseHas('users', ['email' => 'rachidi@ntshik.cd', 'role' => 'family']);
        $this->assertDatabaseHas('families', ['parent_name' => 'Rachidi Mwamba Kasongo']);
        $this->assertDatabaseCount('families', 1);
    }

    public function testFamilyCanLogin(): void
    {
        User::create([
            'full_name' => 'Rachidi Mwamba',
            'email' => 'rachidi@ntshik.cd',
            'password' => Hash::make('secret123'),
            'role' => 'family',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'rachidi@ntshik.cd',
            'password' => 'secret123',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['token', 'user']);
    }

    public function testLoginFailsWithInvalidPassword(): void
    {
        User::create([
            'full_name' => 'Rachidi Mwamba',
            'email' => 'rachidi@ntshik.cd',
            'password' => Hash::make('secret123'),
            'role' => 'family',
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'rachidi@ntshik.cd',
            'password' => 'wrong-password',
        ])->assertStatus(422);
    }

    public function testMeReturnsProfile(): void
    {
        $user = User::create([
            'full_name' => 'Rachidi Mwamba',
            'email' => 'rachidi@ntshik.cd',
            'password' => Hash::make('secret123'),
            'role' => 'family',
        ]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('role', 'family')
            ->assertJsonPath('email', 'rachidi@ntshik.cd');
    }

    public function testLogoutRevokesToken(): void
    {
        $user = User::create([
            'full_name' => 'Rachidi Mwamba',
            'email' => 'rachidi@ntshik.cd',
            'password' => Hash::make('secret123'),
            'role' => 'family',
        ]);
        $token = $user->createToken('ntshik')->plainTextToken;

        $this->withToken($token)
            ->postJson('/api/v1/auth/logout')
            ->assertOk();

        // the sanctum guard caches the authenticated user within the same
        // test kernel; flush it so the next request re-checks the token
        app(\Illuminate\Contracts\Auth\Factory::class)->guard('sanctum')->forgetUser();

        $this->withToken($token)
            ->getJson('/api/v1/auth/me')
            ->assertStatus(401);
    }

    public function testLoginFromSameOriginWithoutCsrfCookie(): void
    {
        // Production sends the SPA Referer and relies on Bearer tokens only —
        // a stateful Sanctum request must NOT require an XSRF token here.
        config(['sanctum.stateful' => ['ntshik.unikinsolutions.cd']]);

        User::create([
            'full_name' => 'Rachidi Mwamba',
            'email' => 'rachidi@ntshik.cd',
            'password' => Hash::make('secret123'),
            'role' => 'family',
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => 'rachidi@ntshik.cd',
            'password' => 'secret123',
        ], ['Referer' => 'https://ntshik.unikinsolutions.cd/'])
            ->assertOk()
            ->assertJsonStructure(['token', 'user']);
    }

    public function testUnauthenticatedApiReturnsJson401EvenWithoutJsonAccept(): void
    {
        // fetch() sends `Accept: */*`; the API must still answer 401 JSON,
        // not bounce to a `login` route (which does not exist => 500).
        $this->get('/api/v1/family', ['Accept' => '*/*'])
            ->assertStatus(401)
            ->assertHeader('content-type', 'application/json')
            ->assertJson(['message' => 'Non authentifié.']);
    }
}