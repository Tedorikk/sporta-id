<x-mail::message>
# New registration

**{{ $registration->name }}** just registered for **{{ $registration->registrationCategory->name }}**
({{ $registration->registrationCategory->event->name }}).

- Email: {{ $registration->email ?? '—' }}
- Phone: {{ $registration->phone ?? '—' }}
- Status: {{ str($registration->status)->headline() }}

@if (! empty($registration->form_data))
@foreach ($registration->registrationCategory->inputFields() as $field)
@continue(! array_key_exists($field['key'], $registration->form_data ?? []))
- {{ $field['label'] }}: {{ $registration->form_data[$field['key']] }}
@endforeach
@endif

<x-mail::button :url="route('registration_categories.show', [$registration->event, $registration->registrationCategory])">
View registrations
</x-mail::button>

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
