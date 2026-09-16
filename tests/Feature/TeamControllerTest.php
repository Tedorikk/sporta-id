<?php

use App\Models\BasketballEvent;
use App\Models\BasketballEventCategory;
use App\Models\Event;
use App\Models\Organization;

test('cannot access team create page if no categories exist', function () {
    $basketballEvent = BasketballEvent::create([
        'pool_drawing_date' => now(),
    ]);

    $event = new Event([
        'organization_id' => Organization::factory()->create()->id,
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

    $this->actingAs(organizerOf($event));

    $response = $this->get(route('teams.create', $event));

    $response->assertRedirect(route('teams.index', $event));
    $response->assertSessionHas('toast', [
        'title' => 'Error',
        'description' => 'Please create at least one event category first.',
    ]);
});

test('cannot store team if no categories exist', function () {
    $basketballEvent = BasketballEvent::create([
        'pool_drawing_date' => now(),
    ]);

    $event = new Event([
        'organization_id' => Organization::factory()->create()->id,
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

    $this->actingAs(organizerOf($event));

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
    $basketballEvent = BasketballEvent::create([
        'pool_drawing_date' => now(),
    ]);

    $event = new Event([
        'organization_id' => Organization::factory()->create()->id,
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

    $this->actingAs(organizerOf($event));

    $category = BasketballEventCategory::factory()->forEvent($event)->create(['name' => 'Under 18']);

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
