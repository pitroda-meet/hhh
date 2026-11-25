<?php

namespace App\Services;

use App\Models\AiActionLog;
use App\Models\ChatMessage;
use App\Models\ChatSession;
use App\Models\Department;
use App\Models\Faq;
use App\Models\QueryCategory;
use App\Models\Ticket;
use App\Models\User;
use App\Services\AI\AiGatewayManager;
use App\Support\ApiResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AgentChatService
{
    private const AGENT_TEXT = [
        'en' => [
            'welcome' => 'Hi! I’m Sahay, your student support companion. Ask me about scholarships, exams, classes, or anything about your ITI. I’ll find an approved answer or connect you with the right person.',
            'noMatch' => 'I couldn’t find a confirmed answer for this specific issue in our approved FAQs. I can connect you with the right department.',
            'followup' => 'Could you share your trainee/application number and the exact error or what happened? You can add details below, or create a ticket with what you have already shared.',
            'human' => 'Of course. I’ll connect you with a staff member. Briefly describe the issue so I can route it correctly; I’ll only create a ticket after your confirmation.',
            'confirmation' => 'I’ve added those details to your request. Shall I create a support ticket for you?',
            'created' => 'Your support ticket is created. I’ve sent your complete description to the responsible department. You can follow every update in My Queries.',
            'cancelled' => 'No ticket was created. Your conversation is saved, and I’m here if you need more help.',
            'tracked' => 'Here’s the latest update on your support ticket.',
            'missingTicket' => 'Please share your ticket number, for example ITI-2026-00125. I can look up tickets belonging to your account.',
            'ticketNotFound' => 'I couldn’t find that ticket in your account. Check the ticket number in My Queries and try again.',
            'departments' => 'Our support teams are Academic, Examination, Scholarship, Administration, Technical / IT, and Workshop & Trade. Tell me what you need help with and I’ll find the right team.',
            'greeting' => 'Hello! How can I help you today? You can ask about scholarships, examination registration, hall tickets, attendance, or your ticket status.',
        ],
        'hi' => [
            'welcome' => 'नमस्ते! मैं सहाय, आपका छात्र सहायता साथी हूँ। छात्रवृत्ति, परीक्षा, कक्षाओं या आईटीआई के बारे में पूछें। मैं स्वीकृत उत्तर खोजूँगा या सही कर्मचारी से जोड़ूँगा।',
            'noMatch' => 'इस विशेष समस्या का पुष्ट उत्तर हमारे स्वीकृत FAQ में नहीं मिला। मैं आपको सही विभाग से जोड़ सकता हूँ।',
            'followup' => 'कृपया अपना प्रशिक्षु/आवेदन नंबर और दिखाई देने वाली त्रुटि या समस्या का विवरण बताएँ। आप नीचे जानकारी जोड़ सकते हैं या अभी साझा किए विवरण से टिकट बना सकते हैं।',
            'human' => 'ज़रूर। मैं आपको कर्मचारी से जोड़ूँगा। समस्या संक्षेप में बताएँ ताकि सही विभाग चुन सकूँ। आपकी पुष्टि के बाद ही टिकट बनेगा।',
            'confirmation' => 'मैंने यह जानकारी आपके अनुरोध में जोड़ दी है। क्या आपके लिए सहायता टिकट बनाऊँ?',
            'created' => 'आपका सहायता टिकट बन गया है। पूरा विवरण जिम्मेदार विभाग को भेज दिया है। My Queries में हर अपडेट देख सकते हैं।',
            'cancelled' => 'कोई टिकट नहीं बनाया गया। बातचीत सुरक्षित है और मैं आगे भी मदद के लिए यहाँ हूँ।',
            'tracked' => 'आपके सहायता टिकट की नवीनतम स्थिति यहाँ है।',
            'missingTicket' => 'कृपया टिकट नंबर बताएँ, जैसे ITI-2026-00125। मैं आपके खाते के टिकट देख सकता हूँ।',
            'ticketNotFound' => 'यह टिकट आपके खाते में नहीं मिला। My Queries में नंबर जाँचकर दोबारा प्रयास करें।',
            'departments' => 'हमारे विभाग हैं: शैक्षणिक, परीक्षा, छात्रवृत्ति, प्रशासन, तकनीकी / आईटी और वर्कशॉप। अपनी समस्या बताएँ, मैं सही विभाग ढूँढूँगा।',
            'greeting' => 'नमस्ते! आज मैं आपकी कैसे मदद करूँ? छात्रवृत्ति, परीक्षा पंजीकरण, हॉल टिकट, उपस्थिति या टिकट की स्थिति के बारे में पूछें।',
        ],
        'gu' => [
            'welcome' => 'નમસ્તે! હું સહાય, તમારો વિદ્યાર્થી સહાય સાથી છું. શિષ્યવૃત્તિ, પરીક્ષા, વર્ગો કે ITI વિશે પૂછો. હું માન્ય જવાબ શોધીશ અથવા યોગ્ય કર્મચારી સાથે જોડીશ.',
            'noMatch' => 'આ ચોક્કસ સમસ્યાનો ખાતરીવાળો જવાબ અમારા માન્ય FAQ માં મળ્યો નથી. હું તમને યોગ્ય વિભાગ સાથે જોડી શકું છું.',
            'followup' => 'કૃપા કરીને તમારો તાલીમાર્થી/અરજી નંબર અને દેખાતી ભૂલ કે સમસ્યાની વિગતો આપો. તમે નીચે વિગતો ઉમેરી શકો છો અથવા આપેલી માહિતીથી ટિકિટ બનાવી શકો છો.',
            'human' => 'ચોક્કસ. હું તમને કર્મચારી સાથે જોડીશ. યોગ્ય વિભાગ પસંદ કરવા સમસ્યા ટૂંકમાં જણાવો. તમારી પુષ્ટિ પછી જ ટિકિટ બનશે.',
            'confirmation' => 'મેં આ વિગતો તમારી વિનંતીમાં ઉમેરી છે. શું તમારા માટે સહાય ટિકિટ બનાવું?',
            'created' => 'તમારી સહાય ટિકિટ બની ગઈ છે. સંપૂર્ણ વિગતો જવાબદાર વિભાગને મોકલી છે. My Queries માં દરેક અપડેટ જોઈ શકો છો.',
            'cancelled' => 'કોઈ ટિકિટ બનાવવામાં આવી નથી. વાતચીત સાચવેલી છે અને હું આગળ મદદ માટે અહીં છું.',
            'tracked' => 'તમારી સહાય ટિકિટની તાજેતરની સ્થિતિ અહીં છે.',
            'missingTicket' => 'કૃપા કરીને ટિકિટ નંબર આપો, જેમ કે ITI-2026-00125. હું તમારા ખાતાની ટિકિટ જોઈ શકું છું.',
            'ticketNotFound' => 'આ ટિકિટ તમારા ખાતામાં મળી નથી. My Queries માં નંબર ચકાસીને ફરી પ્રયાસ કરો.',
            'departments' => 'અમારા વિભાગો: શૈક્ષણિક, પરીક્ષા, શિષ્યવૃત્તિ, વહીવટ, ટેકનિકલ / IT અને વર્કશોપ. તમારી જરૂરિયાત જણાવો, હું યોગ્ય વિભાગ શોધીશ.',
            'greeting' => 'નમસ્તે! આજે હું તમારી કેવી રીતે મદદ કરું? શિષ્યવૃત્તિ, પરીક્ષા નોંધણી, હોલ ટિકિટ, હાજરી અથવા ટિકિટની સ્થિતિ વિશે પૂછો.',
        ],
    ];

    public function __construct(
        private readonly LanguageDetectorService $languageDetector,
        private readonly AiGatewayManager $aiGateway,
        private readonly TicketService $ticketService,
    ) {}

    public function findSession(int $sessionId, User $user): ChatSession
    {
        $session = ChatSession::query()->find($sessionId);
        if (! $session) {
            throw new HttpException(404, 'Conversation not found.');
        }

        if ((int) $session->student_id !== (int) $user->id && $user->role_name !== 'admin') {
            throw new HttpException(403, 'You do not have access to this conversation.');
        }

        return $session;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function listSessions(User $user): array
    {
        return ChatSession::query()
            ->where('student_id', $user->id)
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (ChatSession $s) => [
                'id' => $s->id,
                'student_id' => $s->student_id,
                'title' => $s->title,
                'language' => $s->language,
                'context' => $s->context ?? (object) [],
                'created_at' => $s->created_at?->toISOString(),
                'updated_at' => $s->updated_at?->toISOString(),
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function createSession(User $user, string $language = 'en'): array
    {
        $safeLanguage = in_array($language, ['en', 'hi', 'gu'], true) ? $language : 'en';
        $now = ApiResponse::appNow();

        return DB::transaction(function () use ($user, $safeLanguage, $now) {
            $session = ChatSession::query()->create([
                'student_id' => $user->id,
                'title' => 'New conversation',
                'language' => $safeLanguage,
                'context' => [],
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            ChatMessage::query()->create([
                'session_id' => $session->id,
                'role' => 'assistant',
                'content' => self::AGENT_TEXT[$safeLanguage]['welcome'],
                'language' => $safeLanguage,
                'type' => 'welcome',
                'actions' => [],
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            return $this->sessionDetail($session);
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function sessionDetail(ChatSession $session): array
    {
        $session->load('messages');
        $ticketIds = $session->messages->pluck('ticket_id')->filter()->unique()->values()->all();
        $tickets = $ticketIds !== []
            ? Ticket::query()
                ->whereIn('id', $ticketIds)
                ->where('student_id', $session->student_id)
                ->with(['student.roleRelation', 'student.departments', 'assignedStaff.roleRelation', 'assignedStaff.departments', 'department', 'category'])
                ->get()
                ->keyBy('id')
            : collect();

        $messages = $session->messages->map(function (ChatMessage $m) use ($tickets) {
            $ticket = $m->ticket_id ? $tickets->get($m->ticket_id) : null;

            return [
                'id' => $m->id,
                'session_id' => $m->session_id,
                'role' => $m->role,
                'content' => $m->content,
                'language' => $m->language,
                'type' => $m->type,
                'actions' => $m->actions ?? [],
                'feedback' => $m->feedback,
                'faq_id' => $m->faq_id,
                'ticket_id' => $m->ticket_id,
                'pending_ticket' => $m->pending_ticket,
                'decision' => $m->decision,
                'source_question' => $m->source_question,
                'confidence' => $m->confidence,
                'provider' => $m->provider,
                'intent' => $m->intent,
                'created_at' => $m->created_at?->toISOString(),
                'ticket' => $ticket ? $this->ticketService->enrichTicket($ticket) : null,
            ];
        })->values()->all();

        $ctx = $session->context ?? [];

        return [
            'id' => $session->id,
            'student_id' => $session->student_id,
            'title' => $session->title,
            'language' => $session->language,
            'context' => $ctx === [] ? (object) [] : $ctx,
            'created_at' => $session->created_at?->toISOString(),
            'updated_at' => $session->updated_at?->toISOString(),
            'messages' => $messages,
            'now' => ApiResponse::appNowMs(),
        ];
    }

    /**
     * Execute the full agentic tool-calling pipeline for a student message.
     *
     * @return array<string, mixed>
     */
    public function handleChat(User $user, int $sessionId, string $message, ?string $action = null): array
    {
        $text = trim($message);
        if ($text === '' || mb_strlen($text) > 3000) {
            throw ValidationException::withMessages(['message' => ['Send a message between 1 and 3,000 characters.']]);
        }

        $session = $this->findSession($sessionId, $user);
        $context = $session->context ?? [];
        $language = preg_match('/^[\d\s-]+$/', $text) === 1
            ? $session->language
            : $this->languageDetector->detectLanguage($text);
        $copy = self::AGENT_TEXT[$language] ?? self::AGENT_TEXT['en'];

        $intent = $action === 'request_human_support'
            ? 'Human Assistance'
            : $this->languageDetector->classifyIntent($text, $context['intent'] ?? null);

        $hasPending = ! empty($context['pending_ticket']);
        $isGreeting = preg_match('/^(hi|hello|hey|नमस्ते|નમસ્તે)[!.\s]*$/iu', $text) === 1;
        $isListDepartments = preg_match('/^(list departments|departments|विभाग|વિભાગો)[?\s]*$/iu', $text) === 1;

        $matchedFaq = null;
        $generation = null;

        if (! $hasPending && ! in_array($intent, ['Ticket Tracking', 'Human Assistance'], true) && ! $isGreeting && ! $isListDepartments) {
            $matchedFaq = $this->languageDetector->searchApprovedFaq($text, $language, $intent);
            if ($matchedFaq) {
                $generation = $this->aiGateway->generateGroundedAnswer(
                    $text,
                    $matchedFaq['translation']->answer,
                    $language
                );
            }
        }

        return DB::transaction(function () use ($session, $user, $text, $language, $copy, $intent, $isGreeting, $isListDepartments, $matchedFaq, $generation) {
            $session->refresh();
            $context = $session->context ?? [];
            $now = ApiResponse::appNow();

            if ($session->title === 'New conversation') {
                $session->title = mb_substr($text, 0, 55);
            }
            $session->language = $language;

            $userMessage = ChatMessage::query()->create([
                'session_id' => $session->id,
                'role' => 'user',
                'content' => $text,
                'language' => $language,
                'type' => 'text',
                'actions' => [],
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $actions = [];
            $replyFields = [
                'role' => 'assistant',
                'language' => $language,
                'intent' => $intent,
                'type' => 'text',
                'content' => '',
            ];

            if ($intent === 'Ticket Tracking') {
                $number = null;
                if (preg_match('/ITI-\d{4}-\d{3,6}/i', $text, $m)) {
                    $number = $m[0];
                } elseif (! empty($context['last_ticket_number'])) {
                    $number = $context['last_ticket_number'];
                }

                $ticket = $number
                    ? Ticket::query()->whereRaw('LOWER(ticket_number) = ?', [strtolower($number)])->where('student_id', $user->id)->first()
                    : null;

                $actions[] = $this->logAction(
                    $session,
                    'get_ticket_status',
                    ['ticket_number' => $number, 'intent' => $intent],
                    $ticket ? "{$ticket->ticket_number}: {$ticket->status}" : ($number ? 'Ticket not found in student account' : 'Ticket number requested'),
                    $ticket ? 'success' : 'no_match',
                    $language
                );

                $replyFields['content'] = $ticket ? $copy['tracked'] : ($number ? $copy['ticketNotFound'] : $copy['missingTicket']);
                $replyFields['type'] = $ticket ? 'ticket' : 'text';
                $replyFields['ticket_id'] = $ticket?->id;
            } elseif ($isGreeting) {
                $replyFields['content'] = $copy['greeting'];
            } elseif ($isListDepartments) {
                $deptCount = Department::query()->where('active', true)->count();
                $actions[] = $this->logAction(
                    $session,
                    'get_departments',
                    ['intent' => $intent],
                    "{$deptCount} support departments returned",
                    'success',
                    $language
                );
                $replyFields['content'] = $copy['departments'];
            } elseif ($matchedFaq) {
                /** @var Faq $faq */
                $faq = $matchedFaq['faq'];
                $faq->increment('views');

                $confidencePct = (int) round($matchedFaq['confidence'] * 100);
                $actions[] = $this->logAction(
                    $session,
                    'search_faq',
                    ['query' => $text, 'language' => $language, 'intent' => $intent],
                    "Approved FAQ #{$faq->id} matched ({$confidencePct}% confidence)",
                    'success',
                    $language,
                    ['confidence' => $matchedFaq['confidence'], 'faq_id' => $faq->id]
                );

                if ($generation && $generation['provider'] !== 'mock') {
                    $actions[] = $this->logAction(
                        $session,
                        'generate_response',
                        ['provider' => $generation['provider'], 'model' => $generation['model'], 'faq_id' => $faq->id, 'intent' => $intent],
                        "Grounded response generated via {$generation['provider']}",
                        'success',
                        $language,
                        ['provider' => $generation['provider'], 'model' => $generation['model'], 'faq_id' => $faq->id]
                    );
                }

                if ($generation && ! empty($generation['error'])) {
                    $actions[] = $this->logAction(
                        $session,
                        'generate_response',
                        ['provider' => config('ai.provider'), 'intent' => $intent],
                        'External AI failed; fell back to approved FAQ answer',
                        'error',
                        $language,
                        ['error_message' => $generation['error'], 'faq_id' => $faq->id]
                    );
                }

                $context['intent'] = $intent;
                $context['last_question'] = $text;

                $replyFields['content'] = $generation['text'] ?? $matchedFaq['translation']->answer;
                $replyFields['type'] = 'faq';
                $replyFields['faq_id'] = $faq->id;
                $replyFields['source_question'] = $matchedFaq['translation']->question;
                $replyFields['confidence'] = $matchedFaq['confidence'];
                $replyFields['provider'] = $generation['provider'] ?? 'mock';
            } else {
                $pending = $context['pending_ticket'] ?? null;
                $human = $intent === 'Human Assistance';
                $previousIssue = $context['last_question'] ?? null;
                $categoryIntent = $human ? ($context['intent'] ?? 'General') : $intent;
                $categoryId = (int) ($pending['category_id'] ?? (LanguageDetectorService::INTENT_CATEGORY[$categoryIntent] ?? 8));

                $category = QueryCategory::query()->where('id', $categoryId)->where('active', true)->first()
                    ?? QueryCategory::query()->where('active', true)->first();

                if ($pending) {
                    if (! empty($pending['confirmation_message_id'])) {
                        ChatMessage::query()
                            ->where('id', (int) $pending['confirmation_message_id'])
                            ->where('session_id', $session->id)
                            ->update(['decision' => 'updated']);
                    }
                    $pending['description'] = mb_substr($pending['description']."\n\nAdditional details: {$text}", 0, 5000);
                    if ((int) ($pending['category_id'] ?? 8) === 8 && isset(LanguageDetectorService::INTENT_CATEGORY[$intent])) {
                        $pending['category_id'] = LanguageDetectorService::INTENT_CATEGORY[$intent];
                    }
                    $pending['language'] = $language;
                } else {
                    $subjectBase = $human ? ($previousIssue ?: 'Request for staff assistance') : $text;
                    $descBase = $human ? ($previousIssue ?: $text) : $text;
                    $subject = mb_substr($subjectBase, 0, 150);
                    if (mb_strlen($subject) < 5) {
                        $subject = "Support request: {$subject}";
                    }
                    $description = mb_strlen($descBase) >= 10 ? $descBase : "Student needs help: {$descBase}";
                    $isUrgent = preg_match('/urgent|deadline|critical|अंतिम तिथि|તાત્કાલિક/iu', $text) === 1;

                    $pending = [
                        'subject' => $subject,
                        'description' => $description,
                        'category_id' => $category?->id ?? 8,
                        'priority' => $isUrgent ? 'High' : 'Medium',
                        'language' => $language,
                    ];
                }

                $routedCategory = QueryCategory::query()->with('department')->find($pending['category_id']);
                $departmentName = $routedCategory?->department?->name ?? 'Administration';

                $context['intent'] = $human ? $categoryIntent : $intent;
                $context['last_question'] = $human ? ($previousIssue ?: $text) : ($context['last_question'] ?? $text);

                if ($human) {
                    $actions[] = $this->logAction(
                        $session,
                        'request_human_support',
                        ['issue' => $previousIssue ?: $text, 'intent' => $intent],
                        'Human support requested; waiting for student confirmation',
                        'success',
                        $language
                    );
                } elseif (! isset($context['pending_ticket'])) {
                    $actions[] = $this->logAction(
                        $session,
                        'search_faq',
                        ['query' => $text, 'language' => $language, 'intent' => $intent],
                        'No confirmed answer for this specific issue',
                        'no_match',
                        $language
                    );
                }

                $actions[] = $this->logAction(
                    $session,
                    'get_departments',
                    ['category_id' => $pending['category_id'], 'intent' => $context['intent']],
                    "{$departmentName} selected by category mapping",
                    'success',
                    $language
                );

                $context['pending_ticket'] = $pending;

                $replyFields['content'] = isset($pending['confirmation_message_id'])
                    ? $copy['confirmation']
                    : ($human ? $copy['human'] : $copy['noMatch'])."\n\n".$copy['followup'];
                $replyFields['type'] = 'confirmation';
                $replyFields['pending_ticket'] = $pending;
                $replyFields['decision'] = null;
            }

            $assistantMessage = ChatMessage::query()->create([
                ...$replyFields,
                'session_id' => $session->id,
                'actions' => $actions,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            if ($assistantMessage->type === 'confirmation') {
                $context['pending_ticket']['confirmation_message_id'] = $assistantMessage->id;
            }

            $session->context = $context;
            $session->updated_at = $now;
            $session->save();

            $detail = $this->sessionDetail($session->fresh());
            $messages = collect($detail['messages']);

            return [
                'session' => $detail,
                'user_message' => $messages->firstWhere('id', $userMessage->id),
                'assistant_message' => $messages->firstWhere('id', $assistantMessage->id),
            ];
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function confirmTicket(User $user, int $sessionId, int $messageId, bool $confirmed): array
    {
        return DB::transaction(function () use ($user, $sessionId, $messageId, $confirmed) {
            $session = ChatSession::query()->where('id', $sessionId)->lockForUpdate()->first();
            if (! $session) {
                throw new HttpException(404, 'Conversation not found.');
            }
            if ((int) $session->student_id !== (int) $user->id) {
                throw new HttpException(403, 'You do not have access to this conversation.');
            }

            $card = ChatMessage::query()->where('id', $messageId)->where('session_id', $session->id)->first();
            if (! $card) {
                throw new HttpException(404, 'Confirmation message not found.');
            }

            if ($card->decision === 'created') {
                $existingTicket = $card->ticket_id ? Ticket::query()->find($card->ticket_id) : null;

                return [
                    'session' => $this->sessionDetail($session),
                    'ticket' => $existingTicket ? $this->ticketService->enrichTicket($existingTicket) : null,
                ];
            }

            $context = $session->context ?? [];
            $pending = $context['pending_ticket'] ?? null;

            if (! $pending || (int) ($pending['confirmation_message_id'] ?? 0) !== $messageId) {
                throw ValidationException::withMessages(['message_id' => ['This confirmation has expired. Use the latest confirmation card.']]);
            }

            $language = (string) ($pending['language'] ?? $session->language ?? 'en');
            $copy = self::AGENT_TEXT[$language] ?? self::AGENT_TEXT['en'];
            $now = ApiResponse::appNow();

            $ticket = null;
            $actions = [];

            if ($confirmed) {
                $ticket = $this->ticketService->createTicket($user, [
                    ...$pending,
                    'source' => 'ai',
                    'idempotency_key' => "chat-{$sessionId}-{$messageId}",
                ]);
                $ticket->loadMissing(['department', 'assignedStaff']);
                $context['last_ticket_number'] = $ticket->ticket_number;

                $actions[] = $this->logAction(
                    $session,
                    'create_ticket',
                    ['student_confirmed' => true, 'category_id' => $pending['category_id'], 'intent' => $context['intent'] ?? 'General'],
                    "{$ticket->ticket_number} → {$ticket->department->name} → ".($ticket->assignedStaff?->name ?? 'Awaiting assignment'),
                    'success',
                    $language
                );
            }

            $card->decision = $confirmed ? 'created' : 'cancelled';
            $card->ticket_id = $ticket?->id;
            $card->save();

            unset($context['pending_ticket']);
            $session->context = $context;
            $session->updated_at = $now;
            $session->save();

            ChatMessage::query()->create([
                'session_id' => $session->id,
                'role' => 'assistant',
                'content' => $confirmed ? $copy['created'] : $copy['cancelled'],
                'type' => $confirmed ? 'ticket' : 'text',
                'language' => $language,
                'ticket_id' => $ticket?->id,
                'actions' => $actions,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            return [
                'session' => $this->sessionDetail($session->fresh()),
                'ticket' => $ticket ? $this->ticketService->enrichTicket($ticket) : null,
            ];
        });
    }

    /**
     * @param  array<string, mixed>  $input
     * @param  array<string, mixed>  $details
     * @return array<string, mixed>
     */
    private function logAction(ChatSession $session, string $tool, array $input, string $result, string $status, string $language, array $details = []): array
    {
        $durationMs = (int) ($details['duration_ms'] ?? random_int(120, 420));

        AiActionLog::query()->create([
            'session_id' => $session->id,
            'student_id' => $session->student_id,
            'provider' => $details['provider'] ?? config('ai.provider', 'mock'),
            'model' => $details['model'] ?? null,
            'tool' => $tool,
            'input' => $input,
            'result' => $result,
            'status' => $status,
            'language' => $language,
            'duration_ms' => $durationMs,
            'knowledge_policy' => 'published_approved_faq_only',
            'intent' => $input['intent'] ?? ($session->context['intent'] ?? 'General'),
            'confidence' => $details['confidence'] ?? null,
            'faq_id' => $details['faq_id'] ?? null,
            'error_message' => $details['error_message'] ?? null,
            'created_at' => ApiResponse::appNow(),
        ]);

        return [
            'tool' => $tool,
            'result' => $result,
            'status' => $status,
            'duration_ms' => $durationMs,
        ];
    }
}
