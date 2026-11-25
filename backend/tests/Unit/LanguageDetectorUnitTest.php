<?php

namespace Tests\Unit;

use App\Services\LanguageDetectorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LanguageDetectorUnitTest extends TestCase
{
    use RefreshDatabase;

    public function test_detects_gujarati_hindi_and_english_unicode_scripts(): void
    {
        $detector = app(LanguageDetectorService::class);

        $this->assertSame('gu', $detector->detectLanguage('શિષ્યવૃત્તિ માટે અરજી કેવી રીતે કરવી?'));
        $this->assertSame('hi', $detector->detectLanguage('परीक्षा पंजीकरण की जानकारी'));
        $this->assertSame('en', $detector->detectLanguage('Where is my hall ticket?'));
    }

    public function test_classifies_multilingual_intents_and_fuzzy_matches_published_faqs(): void
    {
        $this->seed();
        $detector = app(LanguageDetectorService::class);

        $this->assertSame('Examination', $detector->classifyIntent('मेरे परीक्षा पंजीकरण में त्रुटि आ रही है'));
        $this->assertSame('Workshop/Trade', $detector->classifyIntent('workshop machine fault'));
        $this->assertSame('Human Assistance', $detector->classifyIntent('Talk to a human'));

        $typoMatch = $detector->searchApprovedFaq('How do I apply for a scholrship?', 'en', 'Scholarship');
        $this->assertNotNull($typoMatch);
        $this->assertSame(1, $typoMatch['faq']->id);

        $issueSpecificMiss = $detector->searchApprovedFaq('My exam registration shows a duplicate record error', 'en', 'Examination');
        $this->assertNull($issueSpecificMiss);
    }
}
