import { Link } from '@inertiajs/react';
import { LegalPage, LegalSection } from '@/components/public/legal-page';
import {
    CONTACT_ADDRESS,
    CONTACT_EMAIL,
    CONTACT_PHONE,
} from '@/data/contact-info';

export default function Terms() {
    return (
        <LegalPage
            eyebrow="Legal"
            title="Terms & Conditions"
            subtitle="The terms that apply when you register for an event on this website."
            lastUpdated="3 September 2026"
        >
            <LegalSection heading="1. Who we are">
                <p>
                    This website is operated by Sporta Indonesia, an event
                    organizer based at {CONTACT_ADDRESS}. You can reach us at{' '}
                    {CONTACT_EMAIL} or {CONTACT_PHONE}. By registering for any
                    event listed here you agree to these terms.
                </p>
            </LegalSection>

            <LegalSection heading="2. What we sell">
                <p>
                    We sell participation slots for the sports and arts events
                    we organize. Each event page lists its registration
                    categories, the price of each category in Indonesian Rupiah
                    (IDR), and whether the price is charged per person or per
                    team. The price shown on the event page is the final amount
                    payable — we do not add service or handling fees at
                    checkout.
                </p>
                <p>
                    A registration entitles the named participant (or team) to
                    take part in the event on the dates stated, together with
                    any entry items described on the event page, such as a race
                    pack, bib number, or participant ID card.
                </p>
            </LegalSection>

            <LegalSection heading="3. How to register">
                <p>
                    Choose an event, choose a registration category, complete
                    the registration form, and submit it. Your slot is reserved
                    as soon as the form is submitted. For a paid category you
                    are then taken to the payment page to pay the amount shown.
                    Your registration is only confirmed once we receive
                    confirmation that payment has settled.
                </p>
                <p>
                    An unpaid registration is held for 24 hours. If payment has
                    not settled within that time, the registration expires and
                    the slot is released to other participants.
                </p>
            </LegalSection>

            <LegalSection heading="4. Payment">
                <p>
                    Online payments are processed by Midtrans, a licensed
                    payment gateway supervised by Bank Indonesia. Available
                    methods include bank transfer and virtual account, e-wallet,
                    QRIS, and credit or debit card. We do not receive or store
                    your card or banking credentials — those are handled
                    entirely by Midtrans and the issuing institution.
                </p>
                <p>
                    All prices are in Indonesian Rupiah (IDR) and are inclusive
                    of any applicable taxes.
                </p>
            </LegalSection>

            <LegalSection heading="5. Your registration details">
                <p>
                    You are responsible for the accuracy of the details you
                    submit. Registrations are personal to the named participant
                    and may not be transferred or resold to another person
                    without our written agreement. We may reject or cancel a
                    registration that contains false information, that
                    duplicates an existing registration, or that breaches an
                    event's own published rules.
                </p>
            </LegalSection>

            <LegalSection heading="6. Changes to an event">
                <p>
                    We may change the schedule, venue, or format of an event
                    where circumstances require it, and will announce any such
                    change on the event page and to the contact details you
                    registered with. If an event is cancelled outright, the{' '}
                    <Link
                        href="/refund-policy"
                        className="text-red-400 underline-offset-2 hover:underline"
                    >
                        Refund &amp; Cancellation Policy
                    </Link>{' '}
                    applies.
                </p>
            </LegalSection>

            <LegalSection heading="7. Participation and safety">
                <p>
                    Sports events carry inherent physical risk. By registering
                    you confirm that the participant is physically fit to take
                    part and agrees to follow the instructions of event
                    officials. Participants take part at their own risk, save
                    for loss or injury caused by our own negligence.
                </p>
            </LegalSection>

            <LegalSection heading="8. Contact and complaints">
                <p>
                    For any question about a registration or a payment, contact
                    us at {CONTACT_EMAIL} or {CONTACT_PHONE}, quoting the name
                    you registered under and the event name. We aim to respond
                    within 2 working days.
                </p>
            </LegalSection>
        </LegalPage>
    );
}
