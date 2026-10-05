<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates incoming Xendit webhook requests.
 *
 * Ensures the webhook has the correct structure and required fields
 * before processing. Authentication is handled in the controller.
 */
class XenditWebhookRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Authorization handled via x-callback-token in controller
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'event' => 'required|string',
            'business_id' => 'required|string',
            'created' => 'required|string',
            'data' => 'required|array',
            'data.payment_session_id' => 'required_if:event,payment_session.completed,payment_session.expired|string',
            'data.reference_id' => 'required|string',
            'data.status' => 'required|string',
            'data.amount' => 'required_if:event,payment_session.completed|numeric',
            'data.currency' => 'required_if:event,payment_session.completed|string',
        ];
    }

    /**
     * Get custom messages for validation errors.
     */
    public function messages(): array
    {
        return [
            'event.required' => 'Webhook event type is required',
            'business_id.required' => 'Business ID is required',
            'data.required' => 'Webhook data payload is required',
            'data.payment_session_id.required_if' => 'Payment session ID is required for this event',
            'data.reference_id.required' => 'Reference ID is required',
            'data.amount.required_if' => 'Amount is required for completed payments',
        ];
    }

    /**
     * Check if this is a supported event type.
     */
    public function isSupportedEvent(): bool
    {
        return in_array($this->input('event'), [
            'payment_session.completed',
            'payment_session.expired',
        ]);
    }

    /**
     * Get the event type.
     */
    public function getEventType(): string
    {
        return $this->input('event');
    }

    /**
     * Get the session ID from the webhook data.
     */
    public function getSessionId(): ?string
    {
        return $this->input('data.payment_session_id');
    }

    /**
     * Get the reference ID from the webhook data.
     */
    public function getReferenceId(): string
    {
        return $this->input('data.reference_id');
    }

    /**
     * Get the business ID from the webhook.
     */
    public function getBusinessId(): string
    {
        return $this->input('business_id');
    }
}
