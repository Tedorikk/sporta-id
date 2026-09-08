import { Form, Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, Trash2, UserPlus } from 'lucide-react';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { index as organizationsIndex } from '@/routes/organizations';
import { destroy, store, update } from '@/routes/organizations/members';
import { store as storeAccount } from '@/routes/organizations/members/accounts';
import type { Organization, OrganizationRole } from '@/types';

type Member = {
    id: number;
    name: string;
    email: string;
    role: OrganizationRole;
    is_self: boolean;
};

/**
 * Only an owner may hand out the owner role, so the option is hidden from
 * admins — the server rejects it either way.
 */
function RoleField({
    id,
    roles,
    isOwner,
    error,
}: {
    id: string;
    roles: OrganizationRole[];
    isOwner: boolean;
    error?: string;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>Role</Label>
            <Select name="role" defaultValue="member">
                <SelectTrigger id={id} className="w-full sm:w-36">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {roles
                        .filter((role) => isOwner || role !== 'owner')
                        .map((role) => (
                            <SelectItem
                                key={role}
                                value={role}
                                className="capitalize"
                            >
                                {role}
                            </SelectItem>
                        ))}
                </SelectContent>
            </Select>
            <InputError message={error} />
        </div>
    );
}

interface Props {
    organization: Organization;
    members: Member[];
    roles: OrganizationRole[];
    canManage: boolean;
    isOwner: boolean;
}

export default function OrganizationMembers({
    organization,
    members,
    roles,
    canManage,
    isOwner,
}: Props) {
    const ownerCount = members.filter((m) => m.role === 'owner').length;

    return (
        <div className="mx-auto flex h-full w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
            <Head title={`Members · ${organization.name}`} />

            <div className="flex items-center gap-4">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    asChild
                >
                    <Link
                        href={organizationsIndex()}
                        aria-label="Back to organizations"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Members
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {organization.name} · everyone here can see and work on
                        this organization's events.
                    </p>
                </div>
            </div>

            {canManage && (
                <Tabs
                    defaultValue="existing"
                    className="gap-0 rounded-lg border p-4"
                >
                    <TabsList className="grid w-full grid-cols-2 sm:w-80">
                        <TabsTrigger value="existing">Add existing</TabsTrigger>
                        <TabsTrigger value="new">Create account</TabsTrigger>
                    </TabsList>

                    <TabsContent value="existing" className="mt-4">
                        <Form {...store.form(organization.id)} resetOnSuccess>
                            {({ processing, errors }) => (
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                                    <div className="grid flex-1 gap-2">
                                        <Label htmlFor="email">
                                            Add an existing account by email
                                        </Label>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            required
                                            placeholder="teammate@example.com"
                                        />
                                        <InputError message={errors.email} />
                                    </div>

                                    <RoleField
                                        id="role"
                                        roles={roles}
                                        isOwner={isOwner}
                                        error={errors.role}
                                    />

                                    <Button type="submit" disabled={processing}>
                                        {processing ? (
                                            <Spinner />
                                        ) : (
                                            <UserPlus className="mr-2 size-4" />
                                        )}
                                        Add
                                    </Button>
                                </div>
                            )}
                        </Form>
                    </TabsContent>

                    <TabsContent value="new" className="mt-4">
                        <Form
                            {...storeAccount.form(organization.id)}
                            resetOnSuccess
                        >
                            {({ processing, errors }) => (
                                <div className="flex flex-col gap-4">
                                    <p className="text-sm text-muted-foreground">
                                        For people who will not sign up on their
                                        own. They can log in straight away with
                                        the password you set — share it with
                                        them privately and ask them to change it
                                        in their account settings.
                                    </p>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="new-name">
                                                Name
                                            </Label>
                                            <Input
                                                id="new-name"
                                                name="name"
                                                required
                                                autoComplete="off"
                                                placeholder="Jamie Rivera"
                                            />
                                            <InputError message={errors.name} />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="new-email">
                                                Email
                                            </Label>
                                            <Input
                                                id="new-email"
                                                name="email"
                                                type="email"
                                                required
                                                autoComplete="off"
                                                placeholder="jamie@example.com"
                                            />
                                            <InputError
                                                message={errors.email}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="new-password">
                                                Password
                                            </Label>
                                            <Input
                                                id="new-password"
                                                name="password"
                                                type="password"
                                                required
                                                autoComplete="new-password"
                                            />
                                            <InputError
                                                message={errors.password}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="new-password-confirmation">
                                                Confirm password
                                            </Label>
                                            <Input
                                                id="new-password-confirmation"
                                                name="password_confirmation"
                                                type="password"
                                                required
                                                autoComplete="new-password"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                                        <RoleField
                                            id="new-role"
                                            roles={roles}
                                            isOwner={isOwner}
                                            error={errors.role}
                                        />

                                        <Button
                                            type="submit"
                                            disabled={processing}
                                        >
                                            {processing ? (
                                                <Spinner />
                                            ) : (
                                                <UserPlus className="mr-2 size-4" />
                                            )}
                                            Create account
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </Form>
                    </TabsContent>
                </Tabs>
            )}

            <div className="divide-y rounded-lg border">
                {members.map((member) => {
                    const isLastOwner =
                        member.role === 'owner' && ownerCount === 1;

                    return (
                        <div
                            key={member.id}
                            className="flex items-center justify-between gap-4 px-4 py-3"
                        >
                            <div>
                                <p className="flex items-center gap-2 text-sm font-medium">
                                    {member.name}
                                    {member.is_self && (
                                        <Badge variant="outline">You</Badge>
                                    )}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {member.email}
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                {canManage && !isLastOwner ? (
                                    <Select
                                        value={member.role}
                                        onValueChange={(role) =>
                                            router.patch(
                                                update.url([
                                                    organization.id,
                                                    member.id,
                                                ]),
                                                { role },
                                                { preserveScroll: true },
                                            )
                                        }
                                    >
                                        <SelectTrigger className="w-32 capitalize">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {roles
                                                .filter(
                                                    (role) =>
                                                        isOwner ||
                                                        role !== 'owner',
                                                )
                                                .map((role) => (
                                                    <SelectItem
                                                        key={role}
                                                        value={role}
                                                        className="capitalize"
                                                    >
                                                        {role}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <Badge
                                        variant="secondary"
                                        className="capitalize"
                                    >
                                        {member.role}
                                    </Badge>
                                )}

                                {canManage && !isLastOwner && (
                                    <DeleteConfirmationDialog
                                        trigger={
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                aria-label={`Remove ${member.name}`}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        }
                                        title="Remove member"
                                        description={`Remove ${member.name} from ${organization.name}? They will lose access to its events.`}
                                        confirmationValue={member.name}
                                        onConfirm={() =>
                                            router.delete(
                                                destroy.url([
                                                    organization.id,
                                                    member.id,
                                                ]),
                                                { preserveScroll: true },
                                            )
                                        }
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
