<?php

namespace App\Policies;

use App\Models\Event;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class EventPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->organizations()->exists();
    }

    public function view(User $user, Event $event): Response
    {
        return $this->sameOrganization($user, $event);
    }

    public function create(User $user): bool
    {
        return $user->hasOrganizationRole($user->current_organization_id, Organization::MANAGER_ROLES);
    }

    public function update(User $user, Event $event): Response
    {
        return $this->manages($user, $event);
    }

    public function delete(User $user, Event $event): Response
    {
        return $this->manages($user, $event);
    }

    /**
     * Cross-organization access is denied as 404 so an outsider cannot confirm
     * that a given event id exists.
     */
    private function sameOrganization(User $user, Event $event): Response
    {
        return $user->belongsToOrganization($event->organization_id)
            ? Response::allow()
            : Response::denyAsNotFound();
    }

    private function manages(User $user, Event $event): Response
    {
        $membership = $this->sameOrganization($user, $event);

        if ($membership->denied()) {
            return $membership;
        }

        return $user->hasOrganizationRole($event->organization_id, Organization::MANAGER_ROLES)
            ? Response::allow()
            : Response::deny('Only organization owners and admins can change this event.');
    }
}
