import { Form, Head, Link } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';
import { accept } from '@/routes/invitations';
import type { OrganizationRole } from '@/types';

/**
 * Mirrors InvitationAcceptanceController::state. Only 'register' and 'ready'
 * can be submitted; the rest are dead ends that explain themselves.
 */
type State =
    | 'register'
    | 'ready'
    | 'needs_login'
    | 'wrong_account'
    | 'expired'
    | 'accepted';

interface Props {
    token: string;
    email: string;
    role: OrganizationRole;
    organization: { id: number; name: string };
    state: State;
    passwordRules: string;
}

function Notice({
    children,
    action,
}: {
    children: React.ReactNode;
    action?: React.ReactNode;
}) {
    return (
        <div className="grid gap-4">
            <p className="text-sm text-muted-foreground">{children}</p>
            {action}
        </div>
    );
}

export default function AcceptInvitation({
    token,
    email,
    role,
    organization,
    state,
    passwordRules,
}: Props) {
    return (
        <>
            <Head title={`Join ${organization.name}`} />

            {state === 'expired' && (
                <Notice
                    action={
                        <Button asChild className="w-full">
                            <Link href={login()}>Go to log in</Link>
                        </Button>
                    }
                >
                    This invitation has expired. Ask an organizer of{' '}
                    {organization.name} to send you a new one.
                </Notice>
            )}

            {state === 'accepted' && (
                <Notice
                    action={
                        <Button asChild className="w-full">
                            <Link href={login()}>Go to log in</Link>
                        </Button>
                    }
                >
                    This invitation has already been used. If that was you, just
                    log in.
                </Notice>
            )}

            {state === 'wrong_account' && (
                <Notice>
                    This invitation is for <strong>{email}</strong>, but you are
                    signed in as someone else. Log out, then open the link
                    again.
                </Notice>
            )}

            {state === 'needs_login' && (
                <Notice
                    action={
                        <Button asChild className="w-full">
                            <Link href={login()}>Log in</Link>
                        </Button>
                    }
                >
                    <strong>{email}</strong> already has an account. Log in with
                    it, then open this link again to join {organization.name}.
                </Notice>
            )}

            {state === 'ready' && (
                <Form {...accept.form(token)}>
                    {({ processing }) => (
                        <div className="grid gap-4">
                            <p className="text-sm text-muted-foreground">
                                You have been invited to join{' '}
                                <strong>{organization.name}</strong> as a {role}
                                .
                            </p>
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={processing}
                            >
                                {processing && <Spinner />}
                                Join {organization.name}
                            </Button>
                        </div>
                    )}
                </Form>
            )}

            {state === 'register' && (
                <Form {...accept.form(token)}>
                    {({ processing, errors }) => (
                        <div className="grid gap-6">
                            <p className="text-sm text-muted-foreground">
                                You have been invited to join{' '}
                                <strong>{organization.name}</strong> as a {role}
                                . Pick a password to finish setting up your
                                account.
                            </p>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    className="block w-full"
                                    readOnly
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    required
                                    autoFocus
                                    autoComplete="name"
                                    placeholder="Your name"
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">Password</Label>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    autoComplete="new-password"
                                    className="block w-full"
                                    placeholder="Password"
                                    passwordrules={passwordRules}
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation">
                                    Confirm password
                                </Label>
                                <PasswordInput
                                    id="password_confirmation"
                                    name="password_confirmation"
                                    autoComplete="new-password"
                                    className="block w-full"
                                    placeholder="Confirm password"
                                    passwordrules={passwordRules}
                                />
                                <InputError
                                    message={errors.password_confirmation}
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={processing}
                            >
                                {processing && <Spinner />}
                                Create account and join
                            </Button>
                        </div>
                    )}
                </Form>
            )}
        </>
    );
}

AcceptInvitation.layout = {
    title: 'Accept invitation',
    description: 'Join your organization on Sporta',
};
