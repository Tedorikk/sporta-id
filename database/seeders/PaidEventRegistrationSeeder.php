<?php

namespace Database\Seeders;

use App\Models\Event;
use App\Models\RegistrationCategory;
use Illuminate\Database\Seeder;

/**
 * A standalone demo event with one paid, individual-subject registration
 * category — for exercising the public register -> Midtrans Snap -> webhook
 * flow end to end (e.g. for a payment-provider review). Not called from
 * DatabaseSeeder; run explicitly:
 *   php artisan db:seed --class=PaidEventRegistrationSeeder
 */
class PaidEventRegistrationSeeder extends Seeder
{
    public function run(): void
    {
        $event = Event::create([
            'name' => 'Sporta Fun Run 2027',
            'description' => 'A 5K community fun run through Pontianak, open to all ages and fitness levels. Register online to lock in your race pack, bib number, and finisher medal.',
            'contact_person' => '+62 811-5639-555',
            'is_published' => true,
            'start_date' => now()->addMonth()->format('Y-m-d'),
            'end_date' => now()->addMonth()->format('Y-m-d'),
        ]);

        $event->registrationCategories()->create([
            'name' => '5K Individual Run',
            'subject_type' => RegistrationCategory::SUBJECT_INDIVIDUAL,
            'price' => 150000,
            'quota' => 200,
            'registration_open' => true,
            'form_pages' => [
                ['key' => 'page-1', 'title' => 'Details', 'fields' => [
                    ['key' => 'shirt_size', 'label' => 'Shirt Size', 'type' => 'select', 'required' => true, 'options' => ['S', 'M', 'L', 'XL']],
                    ['key' => 'emergency_contact', 'label' => 'Emergency Contact Number', 'type' => 'phone', 'required' => true],
                ]],
            ],
        ]);

        $this->command?->info("Seeded \"{$event->name}\" (event #{$event->id}) with a paid 5K registration category.");
    }
}
