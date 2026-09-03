<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const SLUG = 'legacy';

    /**
     * Uses the query builder rather than Eloquent so this migration keeps working
     * if the Organization model later gains required attributes or boot hooks.
     */
    public function up(): void
    {
        // RefreshDatabase replays every migration before each test; seeding a
        // default organization into an empty database would break assertions
        // about how many organizations a fresh registration creates.
        $hasExistingData = DB::table('users')->exists() || DB::table('events')->exists();

        if (! $hasExistingData) {
            return;
        }

        $organizationId = DB::table('organizations')->insertGetId([
            'name' => config('app.name').' (Legacy)',
            'slug' => self::SLUG,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $adminEmail = config('admin.email');
        $users = DB::table('users')->select('id', 'email')->orderBy('id')->get();

        // An organization with no owner can never be administered, so fall back
        // to the oldest account when no user matches the configured admin email.
        $ownerId = $users->firstWhere('email', $adminEmail)?->id ?? $users->first()?->id;

        // Every pre-tenancy user was a trusted admin with full access, so the
        // lowest role that preserves their existing capabilities is `admin`.
        $memberships = $users->map(fn ($user) => [
            'organization_id' => $organizationId,
            'user_id' => $user->id,
            'role' => $user->id === $ownerId ? 'owner' : 'admin',
            'created_at' => now(),
            'updated_at' => now(),
        ])->all();

        if ($memberships !== []) {
            DB::table('organization_user')->insert($memberships);
        }

        DB::table('events')->whereNull('organization_id')->update(['organization_id' => $organizationId]);
        DB::table('users')->whereNull('current_organization_id')->update(['current_organization_id' => $organizationId]);
    }

    public function down(): void
    {
        $organizationId = DB::table('organizations')->where('slug', self::SLUG)->value('id');

        if ($organizationId === null) {
            return;
        }

        DB::table('events')->where('organization_id', $organizationId)->update(['organization_id' => null]);
        DB::table('users')->where('current_organization_id', $organizationId)->update(['current_organization_id' => null]);
        DB::table('organization_user')->where('organization_id', $organizationId)->delete();
        DB::table('organizations')->where('id', $organizationId)->delete();
    }
};
