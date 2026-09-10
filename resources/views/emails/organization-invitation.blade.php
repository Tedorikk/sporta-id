<x-mail::message>
# You've been invited

@if ($inviter)
**{{ $inviter->name }}** has invited you to join **{{ $organization->name }}** on {{ config('app.name') }} as a {{ $invitation->role }}.
@else
You've been invited to join **{{ $organization->name }}** on {{ config('app.name') }} as a {{ $invitation->role }}.
@endif

<x-mail::button :url="$url">
Accept invitation
</x-mail::button>

This link expires on {{ $invitation->expires_at->format('j M Y, H:i') }}. If you weren't expecting this, you can ignore this email.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
