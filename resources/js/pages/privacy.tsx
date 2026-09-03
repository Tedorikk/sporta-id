import { LegalPage, LegalSection } from '@/components/public/legal-page';
import { CONTACT_ADDRESS, CONTACT_EMAIL } from '@/data/contact-info';

export default function Privacy() {
    return (
        <LegalPage
            eyebrow="Legal"
            title="Privacy Policy"
            subtitle="What we collect when you register, and what we do with it."
            lastUpdated="3 September 2026"
        >
            <LegalSection heading="1. Who controls your data">
                <p>
                    Sporta Indonesia, {CONTACT_ADDRESS}, is responsible for the personal data collected through this
                    website. Questions about this policy can be sent to {CONTACT_EMAIL}.
                </p>
            </LegalSection>

            <LegalSection heading="2. What we collect">
                <ul className="list-disc space-y-1 pl-5">
                    <li>
                        Registration details you enter into an event form — typically name, email address, phone
                        number, and whatever else that specific event asks for, such as shirt size, date of birth,
                        emergency contact, a photo, or a supporting document.
                    </li>
                    <li>
                        Payment status information returned to us by Midtrans — the order number, amount, payment
                        method, and whether the payment succeeded. We never receive your card number, CVV, or
                        banking credentials.
                    </li>
                    <li>Messages you send us through the contact form.</li>
                </ul>
            </LegalSection>

            <LegalSection heading="3. Why we use it">
                <p>
                    To register you for the event you chose, to issue your participant ID card and check you in on
                    the day, to process and reconcile your payment, to contact you about the event you registered
                    for, and to meet our record-keeping obligations.
                </p>
            </LegalSection>

            <LegalSection heading="4. Who we share it with">
                <p>
                    We share what is necessary with Midtrans to process payments, and with the organizing team and
                    officials of the specific event you registered for. Participant names and team names may appear
                    in public start lists, schedules, and results for that event. We do not sell your personal data,
                    and we do not share it for unrelated marketing.
                </p>
            </LegalSection>

            <LegalSection heading="5. How long we keep it">
                <p>
                    Registration and payment records are kept for as long as needed to run the event and to satisfy
                    accounting and legal requirements — normally five years from the event date — after which they
                    are deleted or anonymised.
                </p>
            </LegalSection>

            <LegalSection heading="6. Your rights">
                <p>
                    You can ask us to show you the data we hold about you, correct anything inaccurate, or delete
                    data we no longer need to keep. Email {CONTACT_EMAIL} and we will respond within 14 days.
                </p>
            </LegalSection>

            <LegalSection heading="7. Security and cookies">
                <p>
                    The site is served over HTTPS and access to registration data is restricted to authorised
                    organizer accounts. We use cookies only to keep your session working and to remember display
                    preferences — not for advertising or cross-site tracking.
                </p>
            </LegalSection>
        </LegalPage>
    );
}
