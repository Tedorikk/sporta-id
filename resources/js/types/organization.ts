export type OrganizationRole = 'owner' | 'admin' | 'member';

export type Organization = {
    id: number;
    name: string;
    slug: string;
};

/** An organization as it appears in the authenticated user's own list. */
export type OrganizationMembership = Organization & {
    role: OrganizationRole;
};
