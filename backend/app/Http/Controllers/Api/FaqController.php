<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Faq;
use App\Models\FaqFeedback;
use App\Models\FaqTranslation;
use App\Models\QueryCategory;
use App\Models\Ticket;
use App\Models\User;
use App\Services\TicketRoutingService;
use App\Services\TicketService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FaqController extends Controller
{
    public function __construct(
        private readonly TicketService $ticketService,
        private readonly TicketRoutingService $routingService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $manage = filter_var($request->query('manage', false), FILTER_VALIDATE_BOOL) && $user->role_name === 'admin';

        $query = Faq::query()->with(['category', 'translations', 'suggestedBy']);

        if (! $manage) {
            $query->where('status', 'published');
        }

        $status = $request->query('status');
        if ($status && $status !== 'All') {
            $query->where('status', $status);
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', (int) $request->query('category_id'));
        }

        if ($request->filled('search') && trim((string) $request->query('search')) !== '') {
            $term = '%'.trim((string) $request->query('search')).'%';
            $query->whereHas('translations', function ($q) use ($term) {
                $q->where('question', 'like', $term)
                    ->orWhere('answer', 'like', $term)
                    ->orWhere('keywords', 'like', $term);
            });
        }

        $faqs = $query->orderBy('id')->get();
        $userVotes = FaqFeedback::query()
            ->where('user_id', $user->id)
            ->whereIn('faq_id', $faqs->pluck('id'))
            ->pluck('value', 'faq_id');

        $data = $faqs->map(fn (Faq $faq) => $this->enrichFaq($faq, $userVotes[$faq->id] ?? null))->values();

        return ApiResponse::success($data);
    }

    public function store(Request $request): JsonResponse
    {
        return $this->saveFaq($request, null);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        return $this->saveFaq($request, $id);
    }

    public function destroy(int $id): JsonResponse
    {
        $faq = Faq::query()->find($id);
        if (! $faq) {
            return ApiResponse::error('FAQ not found.', 404);
        }

        $faq->delete();

        return ApiResponse::success(['deleted' => true]);
    }

    public function suggest(Request $request, string $id): JsonResponse
    {
        $ticket = $this->ticketService->findAccessibleTicket($id, $request->user());
        $question = trim((string) $request->input('question', ''));
        $answer = trim((string) $request->input('answer', ''));

        if ($question === '' || $answer === '') {
            throw ValidationException::withMessages([
                'question' => ['Enter a reusable question and an answer.'],
            ]);
        }

        $actor = $request->user();
        $now = ApiResponse::appNow();

        $faq = DB::transaction(function () use ($ticket, $actor, $question, $answer, $now) {
            $faq = Faq::query()->create([
                'category_id' => $ticket->category_id,
                'status' => 'suggested',
                'suggested_by' => $actor->id,
                'approved_by' => null,
                'source_ticket_id' => $ticket->id,
                'views' => 0,
                'helpful' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            foreach (['en', 'hi', 'gu'] as $lang) {
                FaqTranslation::query()->create([
                    'faq_id' => $faq->id,
                    'language' => $lang,
                    'question' => $lang === 'en' ? $question : '',
                    'answer' => $lang === 'en' ? $answer : '',
                    'keywords' => '',
                ]);
            }

            $adminIds = User::query()
                ->where('active', true)
                ->whereHas('roleRelation', fn ($q) => $q->where('name', 'admin'))
                ->pluck('id')
                ->all();

            $this->routingService->notifyUsers($adminIds, [
                'type' => 'faq',
                'title' => 'A new FAQ is ready for review',
                'message' => "{$actor->name} suggested: {$question}",
            ]);

            return $faq->load(['category', 'translations', 'suggestedBy']);
        });

        return ApiResponse::success($this->enrichFaq($faq), 'FAQ suggestion submitted', [], 201);
    }

    public function feedback(Request $request, int $id): JsonResponse
    {
        $value = (string) $request->input('value', '');
        if (! in_array($value, ['up', 'down'], true)) {
            throw ValidationException::withMessages(['value' => ['Choose helpful or not helpful.']]);
        }

        $faq = Faq::query()->where('id', $id)->where('status', 'published')->first();
        if (! $faq) {
            return ApiResponse::error('Published FAQ not found.', 404);
        }

        $user = $request->user();
        DB::transaction(function () use ($faq, $user, $value) {
            $existing = FaqFeedback::query()->where('faq_id', $faq->id)->where('user_id', $user->id)->first();
            $previous = $existing?->value;

            FaqFeedback::query()->updateOrCreate(
                ['faq_id' => $faq->id, 'user_id' => $user->id],
                ['value' => $value]
            );

            $delta = ($value === 'up' ? 1 : 0) - ($previous === 'up' ? 1 : 0);
            $faq->helpful = max(0, $faq->helpful + $delta);
            $faq->save();
        });

        return ApiResponse::success([
            'feedback' => $value,
            'helpful' => $faq->fresh()->helpful,
        ]);
    }

    private function saveFaq(Request $request, ?int $id): JsonResponse
    {
        $status = (string) $request->input('status', 'draft');
        if (! in_array($status, ['draft', 'suggested', 'approved', 'published'], true)) {
            throw ValidationException::withMessages(['status' => ['Choose a valid FAQ publication status.']]);
        }

        $translationsInput = (array) $request->input('translations', []);
        $requiredLanguages = in_array($status, ['draft', 'suggested'], true) ? ['en'] : ['en', 'hi', 'gu'];

        foreach ($requiredLanguages as $lang) {
            $q = trim((string) ($translationsInput[$lang]['question'] ?? ''));
            $a = trim((string) ($translationsInput[$lang]['answer'] ?? ''));
            if ($q === '' || $a === '') {
                $upper = strtoupper($lang);
                $suffix = count($requiredLanguages) === 3 ? ' before approval or publication' : '';
                throw ValidationException::withMessages([
                    "translations.{$lang}" => ["A question and answer in {$upper} are required{$suffix}."],
                ]);
            }
        }

        $categoryId = (int) $request->input('category_id');
        if (! QueryCategory::query()->where('id', $categoryId)->where('active', true)->exists()) {
            throw ValidationException::withMessages(['category_id' => ['Choose an active FAQ category.']]);
        }

        $actor = $request->user();
        $now = ApiResponse::appNow();

        $faq = DB::transaction(function () use ($id, $categoryId, $status, $translationsInput, $actor, $now) {
            $faq = $id ? Faq::query()->find($id) : null;
            if ($id && ! $faq) {
                return null;
            }

            if (! $faq) {
                $faq = Faq::query()->create([
                    'category_id' => $categoryId,
                    'status' => $status,
                    'suggested_by' => null,
                    'approved_by' => in_array($status, ['approved', 'published'], true) ? $actor->id : null,
                    'views' => 0,
                    'helpful' => 0,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            } else {
                $faq->category_id = $categoryId;
                $faq->status = $status;
                $faq->approved_by = in_array($status, ['approved', 'published'], true) ? $actor->id : null;
                $faq->updated_at = $now;
                $faq->save();
            }

            foreach (['en', 'hi', 'gu'] as $lang) {
                $item = $translationsInput[$lang] ?? [];
                FaqTranslation::query()->updateOrCreate(
                    ['faq_id' => $faq->id, 'language' => $lang],
                    [
                        'question' => trim((string) ($item['question'] ?? '')),
                        'answer' => trim((string) ($item['answer'] ?? '')),
                        'keywords' => trim((string) ($item['keywords'] ?? '')),
                    ]
                );
            }

            if ($faq->suggested_by && in_array($faq->status, ['approved', 'published'], true)) {
                $this->routingService->notifyUsers([$faq->suggested_by], [
                    'type' => 'faq',
                    'title' => 'Your FAQ suggestion was approved',
                    'message' => trim((string) ($translationsInput['en']['question'] ?? '')),
                ]);
            }

            return $faq->load(['category', 'translations', 'suggestedBy']);
        });

        if (! $faq) {
            return ApiResponse::error('FAQ not found.', 404);
        }

        return ApiResponse::success($this->enrichFaq($faq), 'FAQ saved', [], $id ? 200 : 201);
    }

    /**
     * @return array<string, mixed>
     */
    private function enrichFaq(Faq $faq, ?string $userFeedback = null): array
    {
        $translations = [];
        foreach ($faq->translations as $t) {
            $translations[$t->language] = [
                'id' => $t->id,
                'faq_id' => $t->faq_id,
                'language' => $t->language,
                'question' => $t->question,
                'answer' => $t->answer,
                'keywords' => $t->keywords ?? '',
            ];
        }

        return [
            'id' => $faq->id,
            'category_id' => $faq->category_id,
            'status' => $faq->status,
            'suggested_by' => $faq->suggested_by,
            'approved_by' => $faq->approved_by,
            'source_ticket_id' => $faq->source_ticket_id,
            'views' => $faq->views,
            'helpful' => $faq->helpful,
            'created_at' => $faq->created_at?->toISOString(),
            'updated_at' => $faq->updated_at?->toISOString(),
            'category' => $faq->category?->toArray(),
            'translations' => $translations,
            'suggested_by_user' => $faq->suggestedBy?->name,
            'feedback' => $userFeedback,
        ];
    }
}
