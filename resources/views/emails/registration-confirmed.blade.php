<x-mail::message>
# {{ __('You’re registered') }}

{{ __('Hi :name, your registration for **:event** is confirmed.', ['name' => $registration->name, 'event' => $registration->event->name]) }}

- {{ __('Category') }}: {{ $registration->registrationCategory->name }}
- {{ __('Participant') }}: {{ $registration->name }}
- {{ __('Event dates') }}: {{ $registration->event->start_date?->translatedFormat('j M Y') }}@if ($registration->event->end_date && $registration->event->end_date->ne($registration->event->start_date)) – {{ $registration->event->end_date->translatedFormat('j M Y') }}@endif

@if ($payment)
## {{ __('Payment receipt') }}

- {{ __('Order ID') }}: {{ $payment->order_id }}
- {{ __('Amount paid') }}: Rp {{ number_format((float) $payment->amount, 0, ',', '.') }}
- {{ __('Method') }}: {{ $payment->payment_type ? str($payment->payment_type)->replace('_', ' ')->headline() : '—' }}
- {{ __('Paid at') }}: {{ $payment->paid_at?->translatedFormat('j M Y, H:i') }}

{{ __('Payment was processed securely by Midtrans.') }}
@endif

@if ($registration->team?->basketball_event_category_id)
## {{ __('Team roster') }}

{{ __('Add your players and staff before the roster deadline. Each member gets their own ID card once added.') }}
@if ($rosterIncomplete && $rosterClosesAt)

**{{ __('Your roster is not complete yet — finish it before :deadline.', ['deadline' => $rosterClosesAt->translatedFormat('j M Y, H:i')]) }}**
@elseif ($rosterIncomplete)

**{{ __('Your roster is not complete yet.') }}**
@endif

<x-mail::button :url="route('team-roster.show', $registration)">
{{ __('Manage your roster') }}
</x-mail::button>
@endif

@if ($registration->team)
<x-mail::button :url="route('teams.id-card', $registration->team)">
{{ __('Open your team ID card') }}
</x-mail::button>
@else
<x-mail::button :url="route('registrations.id-card', $registration)">
{{ __('Open your ID card') }}
</x-mail::button>
@endif

{{ __('Keep this link — the QR code on your ID card is what we scan at the event. You can also [check your registration status](:url) at any time.', ['url' => route('registrations.status', $registration)]) }}

@if ($registration->event->contact_person)
{{ __('Questions? Contact the organizer at :contact.', ['contact' => $registration->event->contact_person]) }}
@endif

{{ __('Thanks,') }}<br>
{{ config('app.name') }}
</x-mail::message>
