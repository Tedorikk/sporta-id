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
import { index as organizationsIndex } from '@/routes/organizations';
import { destroy, store, update } from '@/routes/organizations/members';
import type { Organization, OrganizationRole } from '@/types';

type Member = {
    id: number;
    name: string;
    email: string;
    role: OrganizationRole;
    is_self: boolean;
};

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
                    <p className="text-muted-foreground text-sm">
                        {organization.name} · everyone here can see and work on
                        this organization's events.
                    </p>
                </div>
            </div>

            {canManage && (
                <Form
                    {...store.form(organization.id)}
                    resetOnSuccess
                    className="rounded-lg border p-4"
                >
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

                            <div className="grid gap-2">
                                <Label htmlFor="role">Role</Label>
                                <Select name="role" defaultValue="member">
                                    <SelectTrigger
                                        id="role"
                                        className="w-full sm:w-36"
                                    >
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
                                <InputError message={errors.role} />
                            </div>

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
                                <p className="text-muted-foreground text-xs">
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
