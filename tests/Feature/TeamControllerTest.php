<?php

use App\Models\BasketballEvent;
use App\Models\BasketballEventCategory;
use App\Models\Event;
use App\Models\User;

test('cannot access team create page if no categories exist', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $basketballEvent = BasketballEvent::create([
        'pool_drawing_date' => now(),
    ]);

    $event = new Event([
        'name' => 'Basketball Event Without Categories',
        'description' => 'Test Event Description',
        'contact_person' => 'John Doe',
        'category' => 'BASKETBALL',
        'is_published' => true,
        'start_date' => now()->addDays(2)->format('Y-m-d'),
        'end_date' => now()->addDays(5)->format('Y-m-d'),
    ]);
    $event->specific()->associate($basketballEvent);
    $event->save();

    $response = $this->get(route('teams.create', $event));

    $response->assertRedirect(route('teams.index', $event));
    $response->assertSessionHas('toast', [
        'title' => 'Error',
        'description' => 'Please create at least one event category first.',
    ]);
});

test('cannot store team if no categories exist', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $basketballEvent = BasketballEvent::create([
        'pool_drawing_date' => now(),
    ]);

    $event = new Event([
        'name' => 'Basketball Event Without Categories',
        'description' => 'Test Event Description',
        'contact_person' => 'John Doe',
        'category' => 'BASKETBALL',
        'is_published' => true,
        'start_date' => now()->addDays(2)->format('Y-m-d'),
        'end_date' => now()->addDays(5)->format('Y-m-d'),
    ]);
    $event->specific()->associate($basketballEvent);
    $event->save();

    $response = $this->post(route('teams.store', $event), [
        'name' => 'Team Alpha',
        'status' => 'pending',
    ]);

    $response->assertRedirect(route('teams.index', $event));
    $response->assertSessionHas('toast', [
        'title' => 'Error',
        'description' => 'Please create at least one event category first.',
    ]);
});

test('can access team create page and store team if categories exist', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $basketballEvent = BasketballEvent::create([
        'pool_drawing_date' => now(),
    ]);

    $event = new Event([
        'name' => 'Basketball Event With Categories',
        'description' => 'Test Event Description',
        'contact_person' => 'John Doe',
        'category' => 'BASKETBALL',
        'is_published' => true,
        'start_date' => now()->addDays(2)->format('Y-m-d'),
        'end_date' => now()->addDays(5)->format('Y-m-d'),
    ]);
    $event->specific()->associate($basketballEvent);
    $event->save();

    $category = BasketballEventCategory::create([
        'basketball_event_id' => $basketballEvent->id,
        'name' => 'Under 18',
        'slug' => 'under-18',
        'min_team' => 2,
        'min_player_per_team' => 5,
        'status' => 'PENDING',
    ]);

    $response = $this->get(route('teams.create', $event));
    $response->assertOk();

    $response = $this->post(route('teams.store', $event), [
        'name' => 'Team Alpha',
        'status' => 'pending',
        'basketball_event_category_id' => $category->id,
    ]);

    $response->assertRedirect(route('teams.index', $event));
    $response->assertSessionHas('toast', [
        'title' => 'Success',
        'description' => 'Team added successfully.',
    ]);
});
