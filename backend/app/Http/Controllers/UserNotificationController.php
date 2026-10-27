<?php

namespace App\Http\Controllers;

use App\Support\Payloads;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class UserNotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $notifications = $request->user()->notifications()
            ->orderByDesc('created_at')
            ->get();

        return response()->json($notifications->map(fn ($n) => Payloads::notification($n)));
    }

    public function markRead(Request $request, string $notification): JsonResponse
    {
        $notification = $request->user()->notifications()
            ->where('id', $notification)
            ->first();

        if (! $notification) {
            throw new NotFoundHttpException();
        }

        if ($notification->read_at === null) {
            $notification->update(['read_at' => now()]);
        }

        return response()->json(['ok' => true]);
    }
}