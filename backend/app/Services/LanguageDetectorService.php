<?php

namespace App\Services;

use App\Models\Faq;

class LanguageDetectorService
{
    public const INTENT_CATEGORY = [
        'Academic' => 1,
        'Examination' => 2,
        'Scholarship' => 3,
        'Administrative' => 4,
        'Technical' => 5,
        'Workshop/Trade' => 6,
        'Student Welfare' => 7,
        'General' => 8,
    ];

    private const INTENT_KEYWORDS = [
        'Ticket Tracking' => ['iti-2026-', 'ticket status', 'track ticket', 'टिकट की स्थिति', 'टिकट स्थिति', 'ટિકિટની સ્થિતિ', 'ટિકિટ સ્ટેટસ'],
        'Human Assistance' => ['human', 'person', 'talk to staff', 'staff member', 'इंसान', 'कर्मचारी से बात', 'मानव', 'વ્યક્તિ', 'કર્મચારી સાથે', 'માનવ'],
        'Examination' => ['exam', 'hall ticket', 'admit card', 'ncvt', 'scvt', 'marksheet', 'registration', 'परीक्षा', 'पंजीकरण', 'हॉल टिकट', 'अंकतालिका', 'રજિસ્ટ્રેશન', 'પરીક્ષા', 'નોંધણી', 'હોલ ટિકિટ', 'માર્કશીટ'],
        'Scholarship' => ['scholarship', 'digital gujarat', 'stipend', 'छात्रवृत्ति', 'स्कॉलरशिप', 'શિષ્યવૃત્તિ', 'સ્કોલરશિપ', 'સ્કોલરશીપ'],
        'Academic' => ['attendance', 'syllabus', 'class', 'study', 'leave', 'timetable', 'उपस्थिति', 'पाठ्यक्रम', 'कक्षा', 'अध्ययन', 'छुट्टी', 'હાજરી', 'અભ્યાસ', 'વર્ગ', 'રજા', 'સમયપત્રક'],
        'Workshop/Trade' => ['workshop', 'machine', 'practical', 'ppe', 'lathe', 'welding', 'कार्यशाला', 'वर्कशॉप', 'मशीन', 'प्रैक्टिकल', 'વર્કશોપ', 'કાર્યશાળા', 'મશીન', 'પ્રેક્ટિકલ'],
        'Student Welfare' => ['apprentice', 'hostel', 'bus pass', 'placement', 'welfare', 'अप्रेंटिस', 'छात्रावास', 'हॉस्टल', 'बस', 'એપ્રેન્ટિસ', 'હોસ્ટેલ', 'બસ', 'પ્લેસમેન્ટ'],
        'Technical' => ['password', 'wifi', 'wi-fi', 'internet', 'computer', 'login', 'otp', 'पासवर्ड', 'वाईफाई', 'इंटरनेट', 'कंप्यूटर', 'लॉगिन', 'પાસવર્ડ', 'વાઈફાઈ', 'ઇન્ટરનેટ', 'કમ્પ્યુટર', 'લોગિન'],
        'Administrative' => ['fee', 'admission', 'certificate', 'bonafide', 'name correction', 'फीस', 'शुल्क', 'प्रवेश', 'प्रमाणपत्र', 'बोनाफाइड', 'ફી', 'પ્રવેશ', 'પ્રમાણપત્ર', 'બોનાફાઇડ'],
    ];

    private const STOP_WORDS = [
        'how', 'do', 'i', 'a', 'an', 'the', 'to', 'for', 'my', 'is', 'are', 'can', 'where', 'what', 'of', 'in', 'it', 'get', 'please', 'me', 'with', 'and', 'which', 'apply',
        'करें', 'कैसे', 'मैं', 'मेरा', 'मेरी', 'के', 'की', 'का', 'लिए', 'है', 'क्या', 'कहाँ', 'मुझे',
        'માટે', 'કેવી', 'રીતે', 'હું', 'મારી', 'મારો', 'છે', 'ક્યાં', 'શું', 'કરો',
    ];

    /**
     * Detect Gujarati (U+0A80–0AFF), Hindi/Devanagari (U+0900–097F), else English.
     */
    public function detectLanguage(string $text): string
    {
        if (preg_match('/[\x{0A80}-\x{0AFF}]/u', $text) === 1) {
            return 'gu';
        }

        if (preg_match('/[\x{0900}-\x{097F}]/u', $text) === 1) {
            return 'hi';
        }

        return 'en';
    }

    public function classifyIntent(string $text, ?string $previousIntent = null): string
    {
        $normalized = mb_strtolower($text, 'UTF-8');

        foreach (['Ticket Tracking', 'Human Assistance'] as $priorityIntent) {
            foreach (self::INTENT_KEYWORDS[$priorityIntent] as $keyword) {
                if (str_contains($normalized, $keyword)) {
                    return $priorityIntent;
                }
            }
        }

        $bestIntent = null;
        $bestScore = 0;

        foreach (self::INTENT_KEYWORDS as $name => $words) {
            if (! isset(self::INTENT_CATEGORY[$name])) {
                continue;
            }
            $score = 0;
            foreach ($words as $word) {
                if (str_contains($normalized, $word)) {
                    $score++;
                }
            }
            if ($score > $bestScore) {
                $bestScore = $score;
                $bestIntent = $name;
            }
        }

        if ($bestScore > 0 && $bestIntent !== null) {
            return $bestIntent;
        }

        if ($previousIntent !== null && isset(self::INTENT_CATEGORY[$previousIntent])) {
            return $previousIntent;
        }

        return 'General';
    }

    /**
     * Search published FAQs across all 3 translations using Unicode tokens & edit distance.
     *
     * @return array{faq: Faq, translation: \App\Models\FaqTranslation, score: float, matches: float, confidence: float}|null
     */
    public function searchApprovedFaq(string $text, string $language, string $intent): ?array
    {
        $queryTokens = $this->tokenize($text);
        $issueSpecific = preg_match(
            "/error|failed|not working|unable|cannot|can't|not able|mismatch|duplicate|त्रुटि|नहीं हो|नहीं कर|नहीं खुल|गलती|डुप्लिकेट|एरर|ભૂલ|નથી થ|નથી ખુલ|થતું નથી|એરર|ડુપ્લિકેટ|ખામી/iu",
            $text
        ) === 1;
        $forgotReset = preg_match('/forgot|reset|भूल|रीसेट|ભૂલી|રીસેટ/iu', $text) === 1;
        $issueWords = ['duplicate', 'mismatch', 'error', 'failed', 'डुप्लिकेट', 'त्रुटि', 'एरर', 'ડુપ્લિકેટ', 'એરર', 'ભૂલ'];

        $faqs = Faq::query()
            ->where('status', 'published')
            ->with('translations')
            ->orderBy('id')
            ->get();

        $results = [];
        $lowerText = mb_strtolower($text, 'UTF-8');

        foreach ($faqs as $faq) {
            $translations = $faq->translations;
            $translation = $translations->first(fn ($t) => $t->language === $language && ! empty($t->answer))
                ?? $translations->firstWhere('language', 'en');

            if (! $translation) {
                continue;
            }

            $tokens = [];
            foreach ($translations as $t) {
                foreach ($this->tokenize("{$t->question} {$t->keywords}") as $tok) {
                    $tokens[$tok] = true;
                }
            }
            $uniqueTokens = array_keys($tokens);

            $matches = 0.0;
            $strong = 0;

            foreach ($queryTokens as $token) {
                $exact = in_array($token, $uniqueTokens, true);
                $fuzzy = false;

                if (! $exact && mb_strlen($token, 'UTF-8') >= 5) {
                    $tokenLen = mb_strlen($token, 'UTF-8');
                    $maxDist = $tokenLen > 8 ? 2 : 1;
                    foreach ($uniqueTokens as $word) {
                        $wordLen = mb_strlen($word, 'UTF-8');
                        if (abs($wordLen - $tokenLen) <= 1 && $this->unicodeLevenshtein($token, $word) <= $maxDist) {
                            $fuzzy = true;
                            break;
                        }
                    }
                }

                if ($exact) {
                    $matches += 1.0;
                    if (mb_strlen($token, 'UTF-8') > 3) {
                        $strong++;
                    }
                } elseif ($fuzzy) {
                    $matches += 0.78;
                }
            }

            $specificInText = array_filter($issueWords, fn ($word) => str_contains($lowerText, $word));
            $haystack = mb_strtolower("{$translation->question} {$translation->keywords}", 'UTF-8');
            $matchedIssue = false;
            foreach ($specificInText as $word) {
                if (str_contains($haystack, $word)) {
                    $matchedIssue = true;
                    break;
                }
            }

            if ($issueSpecific && ! $matchedIssue && ! $forgotReset) {
                continue;
            }

            $coverage = $matches / max(count($queryTokens), 1);
            $categoryBoost = (isset(self::INTENT_CATEGORY[$intent]) && $faq->category_id === self::INTENT_CATEGORY[$intent]) ? 0.12 : 0.0;
            $score = $coverage + $categoryBoost + min($strong, 4) * 0.045;

            $results[] = [
                'faq' => $faq,
                'translation' => $translation,
                'score' => $score,
                'matches' => $matches,
            ];
        }

        usort($results, function (array $a, array $b) {
            return ($b['score'] <=> $a['score'])
                ?: ($b['matches'] <=> $a['matches'])
                ?: ($a['faq']->id <=> $b['faq']->id);
        });

        $best = $results[0] ?? null;

        if ($best && $best['score'] >= 0.5 && $best['matches'] >= 0.75) {
            $best['confidence'] = min(0.99, max(0.65, round($best['score'], 3)));

            return $best;
        }

        return null;
    }

    /**
     * @return array<int, string>
     */
    public function tokenize(string $text): array
    {
        $normalized = mb_strtolower($text, 'UTF-8');
        if (class_exists(\Normalizer::class)) {
            $norm = \Normalizer::normalize($normalized, \Normalizer::FORM_KC);
            if ($norm !== false) {
                $normalized = $norm;
            }
        }
        $cleaned = preg_replace('/[^\p{L}\p{N}\p{M}\s-]/u', ' ', $normalized) ?? $normalized;
        $parts = preg_split('/\s+/u', $cleaned, -1, PREG_SPLIT_NO_EMPTY) ?: [];

        return array_values(array_filter(
            $parts,
            fn (string $word) => mb_strlen($word, 'UTF-8') > 1 && ! in_array($word, self::STOP_WORDS, true)
        ));
    }

    private function unicodeLevenshtein(string $a, string $b): int
    {
        $charsA = preg_split('//u', $a, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $charsB = preg_split('//u', $b, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $lenA = count($charsA);
        $lenB = count($charsB);

        $previous = range(0, $lenB);
        for ($i = 1; $i <= $lenA; $i++) {
            $diagonal = $previous[0];
            $previous[0] = $i;
            for ($j = 1; $j <= $lenB; $j++) {
                $old = $previous[$j];
                $cost = $charsA[$i - 1] === $charsB[$j - 1] ? 0 : 1;
                $previous[$j] = min($previous[$j] + 1, $previous[$j - 1] + 1, $diagonal + $cost);
                $diagonal = $old;
            }
        }

        return $previous[$lenB];
    }
}
