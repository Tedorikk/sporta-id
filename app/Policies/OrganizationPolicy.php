<?php

namespace App\Policies;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class OrganizationPolicy
{
    public function view(User $user, Organization $organization): Response
    {
        return $user->belongsToOrganization($organization)
            ? Response::allow()
            : Response::denyAsNotFound();
    }

    public function update(User $user, Organization $organization): bool
    {
        return $user->hasOrganizationRole($organization, Organization::MANAGER_ROLES);
    }

    public function delete(User $user, Organization $organization): bool
    {
        return $user->hasOrganizationRole($organization, [Organization::ROLE_OWNER]);
    }

    public function viewMembers(User $user, Organization $organization): bool
    {
        return $user->belongsToOrganization($organization);
    }

    public function addMember(User $user, Organization $organization): bool
    {
        return $user->hasOrganizationRole($organization, Organization::MANAGER_ROLES);
    }

    /**
     * Creating an account reaches past this organization — the user it makes
     * can be added anywhere afterwards — so it stays its own ability rather
     * than folding into addMember, even though both sit with managers today.
     */
    public function createMemberAccount(User $user, Organization $organization): bool
    {
        return $user->hasOrganizationRole($organization, Organization::MANAGER_ROLES);
    }

    /**
     * Only an owner may grant or revoke the owner role, and the last owner may
     * not be demoted — otherwise the organization becomes unadministrable.
     */
    public function updateMember(User $user, Organization $organization, User $target, string $newRole): Response
    {
        if (! $user->hasOrganizationRole($organization, Organization::MANAGER_ROLES)) {
            return Response::deny('Only organization owners and admins can change roles.');
        }

        $targetRole = $target->roleIn($organization);

        if ($targetRole === null) {
            return Response::denyAsNotFound();
        }

        $touchesOwnership = $newRole === Organization::ROLE_OWNER || $targetRole === Organization::ROLE_OWNER;

        if ($touchesOwnership && ! $user->hasOrganizationRole($organization, [Organization::ROLE_OWNER])) {
            return Response::deny('Only an owner can grant or revoke the owner role.');
        }

        if ($targetRole === Organization::ROLE_OWNER
            && $newRole !== Organization::ROLE_OWNER
            && $organization->ownerCount() <= 1) {
            return Response::deny('An organization must always have at least one owner.');
        }

        return Response::allow();
    }

    public function removeMember(User $user, Organization $organization, User $target): Response
    {
        if (! $user->hasOrganizationRole($organization, Organization::MANAGER_ROLES)) {
            return Response::deny('Only organization owners and admins can remove members.');
        }

        $targetRole = $target->roleIn($organization);

        if ($targetRole === null) {
            return Response::denyAsNotFound();
        }

        if ($targetRole === Organization::ROLE_OWNER) {
            if (! $user->hasOrganizationRole($organization, [Organization::ROLE_OWNER])) {
                return Response::deny('Only an owner can remove another owner.');
            }

            if ($organization->ownerCount() <= 1) {
                return Response::deny('An organization must always have at least one owner.');
            }
        }

        return Response::allow();
    }
}
