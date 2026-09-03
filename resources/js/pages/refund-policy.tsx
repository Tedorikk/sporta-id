import { LegalPage, LegalSection } from '@/components/public/legal-page';
import { CONTACT_EMAIL, CONTACT_PHONE } from '@/data/contact-info';

export default function RefundPolicy() {
    return (
        <LegalPage
            eyebrow="Legal"
            title="Refund & Cancellation Policy"
            subtitle="When a registration fee can be refunded, and how to ask for one."
            lastUpdated="3 September 2026"
        >
            <LegalSection heading="1. Before payment settles">
                <p>
                    A registration that has not been paid can simply be left unpaid — it expires automatically after
                    24 hours and no charge is made. You do not need to contact us to cancel an unpaid registration.
                </p>
            </LegalSection>

            <LegalSection heading="2. If we cancel or postpone an event">
                <p>
                    If we cancel an event, every paid participant receives a full refund of the registration fee. If
                    we postpone an event, your registration is automatically moved to the new date; if the new date
                    does not suit you, you may request a full refund instead within 14 days of the postponement being
                    announced.
                </p>
            </LegalSection>

            <LegalSection heading="3. If you cancel your own registration">
                <p>
                    Because event capacity, race packs, and venue costs are committed in advance,
                    participant-initiated cancellations are refunded on this scale, counted from the first day of the
                    event:
                </p>
                <ul className="list-disc space-y-1 pl-5">
                    <li>More than 30 days before the event: 100% of the registration fee.</li>
                    <li>15–30 days before the event: 50% of the registration fee.</li>
                    <li>Fewer than 15 days before the event, or after it has started: no refund.</li>
                </ul>
                <p>
                    Where an event page publishes its own refund terms, those terms apply to that event instead of
                    this scale.
                </p>
            </LegalSection>

            <LegalSection heading="4. Duplicate or failed charges">
                <p>
                    If you are charged twice for the same registration, or charged for a registration that was never
                    confirmed, contact us with the payment proof and we will refund the incorrect charge in full.
                    This applies regardless of how close the event is.
                </p>
            </LegalSection>

            <LegalSection heading="5. How to request a refund">
                <p>
                    Email {CONTACT_EMAIL} (or message {CONTACT_PHONE}) with the participant name, the event and
                    category you registered for, the order number from your payment confirmation, and the reason for
                    the request.
                </p>
                <p>
                    We confirm receipt within 2 working days and, once approved, submit the refund within 7 working
                    days. Refunds are returned through the original payment method via Midtrans. Depending on your
                    bank or e-wallet provider, the funds may take a further 7–14 working days to appear.
                </p>
            </LegalSection>

            <LegalSection heading="6. Non-refundable items">
                <p>
                    Payment gateway charges already incurred on a refunded transaction, and merchandise that has
                    already been collected or shipped, are not refundable.
                </p>
            </LegalSection>
        </LegalPage>
    );
}
