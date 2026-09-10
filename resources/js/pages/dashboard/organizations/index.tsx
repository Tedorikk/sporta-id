import { Form, Head, Link, router } from '@inertiajs/react';
import { Building2, Check, Plus, Users } from 'lucide-react';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store, switchMethod } from '@/routes/organizations';
import { index as membersIndex } from '@/routes/organizations/members';
import type { OrganizationRole } from '@/types';

type OrganizationRow = {
    id: number;
    name: string;
    slug: string;
    role: OrganizationRole;
    events_count: number;
    is_current: boolean;
};

interface Props {
    organizations: OrganizationRow[];
}

export default function OrganizationsIndex({ organizations }: Props) {
    return (
        <div className="mx-auto flex h-full w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
            <Head title="Organizations" />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Organizations
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Events belong to an organization. Switch between the
                        ones you are a member of, or create another.
                    </p>
                </div>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            New Organization
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <Form {...store.form()} resetOnSuccess>
                            {({ processing, errors }) => (
                                <>
                                    <DialogHeader>
                                        <DialogTitle>
                                            New organization
                                        </DialogTitle>
                                        <DialogDescription>
                                            You will become its owner and start
                                            working in it right away.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="grid gap-2 py-4">
                                        <Label htmlFor="name">Name</Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            required
                                            autoFocus
                                            placeholder="Your club, school or company"
                                        />
                                        <InputError message={errors.name} />
                                    </div>

                                    <DialogFooter>
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                        >
                                            {processing && <Spinner />}
                                            Create
                                        </Button>
                                    </DialogFooter>
                                </>
                            )}
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            {organizations.length === 0 ? (
                <div className="rounded-lg border border-dashed px-6 py-12 text-center">
                    <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-3 text-sm font-medium">
                        You are not a member of any organization yet
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Create one to start adding events.
                    </p>
                </div>
            ) : (
                <div className="divide-y rounded-lg border">
                    {organizations.map((organization) => (
                        <div
                            key={organization.id}
                            className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                                    <Building2 className="size-4" />
                                </div>
                                <div>
                                    <p className="flex items-center gap-2 text-sm font-medium">
                                        {organization.name}
                                        {organization.is_current && (
                                            <Badge variant="secondary">
                                                <Check className="mr-1 size-3" />
                                                Current
                                            </Badge>
                                        )}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        <span className="capitalize">
                                            {organization.role}
                                        </span>
                                        {' · '}
                                        {organization.events_count === 1
                                            ? '1 event'
                                            : `${organization.events_count} events`}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={membersIndex(organization.id)}>
                                        <Users className="mr-2 size-4" />
                                        Members
                                    </Link>
                                </Button>
                                {!organization.is_current && (
                                    <Button
                                        size="sm"
                                        onClick={() =>
                                            router.put(
                                                switchMethod.url(
                                                    organization.id,
                                                ),
                                            )
                                        }
                                    >
                                        Switch
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
