<x-mail::message>
# You're registered

Hi {{ $registration->name }}, your registration for **{{ $registration->event->name }}** is confirmed.

- Category: {{ $registration->registrationCategory->name }}
- Participant: {{ $registration->name }}
- Event dates: {{ $registration->event->start_date?->format('j M Y') }}@if ($registration->event->end_date && $registration->event->end_date->ne($registration->event->start_date)) – {{ $registration->event->end_date->format('j M Y') }}@endif

@if ($payment)
## Payment receipt

- Order ID: {{ $payment->order_id }}
- Amount paid: Rp {{ number_format((float) $payment->amount, 0, ',', '.') }}
- Method: {{ $payment->payment_type ? str($payment->payment_type)->replace('_', ' ')->headline() : '—' }}
- Paid at: {{ $payment->paid_at?->format('j M Y, H:i') }}

Payment was processed securely by Midtrans.
@endif

@if ($registration->team?->basketball_event_category_id)
## Team roster

Add your players and staff before the roster deadline. Each member gets their
own ID card once added.

<x-mail::button :url="route('team-roster.show', $registration)">
Manage your roster
</x-mail::button>
@endif

@if ($registration->team)
<x-mail::button :url="route('teams.id-card', $registration->team)">
Open your team ID card
</x-mail::button>
@else
<x-mail::button :url="route('registrations.id-card', $registration)">
Open your ID card
</x-mail::button>
@endif

Keep this link — the QR code on your ID card is what we scan at the event. You can
also [check your registration status]({{ route('registrations.status', $registration) }}) at any time.

@if ($registration->event->contact_person)
Questions? Contact the organizer at {{ $registration->event->contact_person }}.
@endif

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
