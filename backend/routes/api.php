<?php

use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\FamilyController;
use App\Http\Controllers\Admin\PaymentController as AdminPaymentController;
use App\Http\Controllers\Admin\SettingsController;
use App\Http\Controllers\Admin\StudentController as AdminStudentController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\FamilyController as FamilyControllerAlias;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\ReferenceController;
use App\Http\Controllers\StudentController;
use App\Http\Controllers\UserNotificationController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('auth/login', [AuthController::class, 'login']);
    Route::post('auth/register', [AuthController::class, 'register']);
    Route::get('refs', [ReferenceController::class, 'index']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('auth/logout', [AuthController::class, 'logout']);

        Route::middleware('role:family')->group(function () {
            Route::get('family', [FamilyControllerAlias::class, 'family']);
            Route::get('students', [StudentController::class, 'index']);
            Route::post('students', [StudentController::class, 'store']);
            Route::get('students/{student}', [StudentController::class, 'show']);

            Route::get('payments', [PaymentController::class, 'index']);
            Route::post('payments', [PaymentController::class, 'store']);
            Route::get('payments/{payment}', [PaymentController::class, 'show']);
            Route::get('payments/{payment}/recu', [PaymentController::class, 'recu']);

            Route::get('notifications', [UserNotificationController::class, 'index']);
            Route::patch('notifications/{notification}/read', [UserNotificationController::class, 'markRead']);
        });

        // Back-office, opened to `admin` and `superadmin`, gated per module.
        Route::middleware('role:admin')->group(function () {
            Route::middleware('can:dashboard,read')->get('admin/dashboard', [DashboardController::class, 'index']);
            Route::middleware('can:eleves,read')->get('admin/students', [AdminStudentController::class, 'index']);
            Route::middleware('can:eleves,create')->post('admin/students', [AdminStudentController::class, 'store']);
            Route::middleware('can:eleves,update')->put('admin/students/{student}', [AdminStudentController::class, 'update']);
            Route::middleware('can:familles,read')->get('admin/families', [FamilyController::class, 'index']);
            Route::middleware('can:paiements,read')->get('admin/payments', [AdminPaymentController::class, 'index']);
            Route::middleware('can:paiements,create')->post('admin/payments', [AdminPaymentController::class, 'store']);
            Route::middleware('can:paiements,read')->get('admin/payments/{payment}/recu', [AdminPaymentController::class, 'recu']);
            Route::middleware('can:paiements,update')->patch('payments/{payment}/status', [AdminPaymentController::class, 'updateStatus']);
            Route::middleware('can:journal,read')->get('admin/audit', [DashboardController::class, 'journal']);
            Route::middleware('can:parametres,read')->get('admin/settings', [SettingsController::class, 'index']);
            Route::middleware('can:parametres,update')->put('admin/settings', [SettingsController::class, 'update']);
            Route::middleware('can:parametres,update')->post('admin/school/year-close', [SettingsController::class, 'closeYear']);
        });

        // User management, superadmin only.
        Route::middleware('role:superadmin')->group(function () {
            Route::get('admin/modules', [UserController::class, 'modules']);
            Route::get('admin/users', [UserController::class, 'index']);
            Route::post('admin/users', [UserController::class, 'store']);
            Route::put('admin/users/{user}', [UserController::class, 'update']);
            Route::delete('admin/users/{user}', [UserController::class, 'destroy']);
        });
    });
});