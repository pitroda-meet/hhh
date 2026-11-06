# Five-minute demo script

## Before recording

1. Run `npm run dev` and open the URL printed by Vite.
2. Use a desktop viewport around **1440 × 900 or larger**, at 100% browser zoom.
3. Keep `VITE_GEMINI_API_KEY` empty for the repeatable mock-agent flow.
4. Press **Ctrl+Shift+D → Reset & start demo**. If already signed in, sign out to start at the branded login screen. Open Ctrl+Shift+D again and choose **Hide demo mode** if you prefer a clean recording.
5. Keep the interface in English; messages themselves demonstrate Gujarati and Hindi detection.
6. Use the top-bar **⇄** menu for every role change. Stay in the same browser tab/origin.

## 0:00–0:30 · The problem and student overview

**Screen:** Login → Student demo button → dashboard.

**Narration:**

> “ITI students often don’t know which department to approach. Questions repeat, progress is hard to track, and overdue requests get lost. Sahay gives every question one clear place to start.”

Point to the four statistics, recent queries, and the multilingual assistant card.

## 0:30–1:05 · A Gujarati question, an approved answer

**Action:** Open **AI Assistant** and select the Gujarati suggestion, or paste:

```text
શિષ્યવૃત્તિ માટે કેવી રીતે અરજી કરવી?
```

**Expected:** A Gujarati Digital Gujarat scholarship answer, the Gujarati language badge, a green approved-FAQ source label, and thumbs-up/down controls.

Open **AI actions** below the answer to show `search_faq`.

**Narration:**

> “The assistant detects Gujarati and retrieves an answer from the institute’s approved knowledge base. The student can see the source, and the administrator can audit the tool call.”

## 1:05–1:50 · A Hindi issue becomes a routed ticket

In the same chat, paste:

```text
मेरे परीक्षा पंजीकरण में त्रुटि आ रही है
```

**Expected:** The assistant cannot confirm a fix, asks for relevant details, and displays a ticket-confirmation card. A generic exam-registration FAQ is not used as a solution to this specific error.

Optional follow-up to demonstrate remembered context:

```text
मेरा प्रशिक्षु नंबर GTI-2026-0142 है और Duplicate record दिखाई देता है।
```

Choose **हाँ, टिकट बनाएँ** on the latest card.

**Expected:** **ITI-2026-00125**, category **Examination**, department **Examination**, assigned to **Mehul Joshi**, status **Assigned**. Open AI actions to show `create_ticket`.

**Narration:**

> “When there is no approved answer, Sahay asks for missing details and gets permission before creating a ticket. Category mapping finds the department, and workload-based routing chooses the responsible staff member.”

## 1:50–2:35 · Staff resolves the issue

Switch **⇄ → Staff / Instructor**. Open the new ticket from **recent queries** or the **Ticket Inbox**. New tickets sort first in the inbox.

Send this reply:

```text
आपके पंजीकरण का डुप्लिकेट रिकॉर्ड ठीक कर दिया गया है। कृपया पोर्टल में लॉगिन करके नया आवेदन पुष्टिकरण डाउनलोड करें।
```

Click **Resolved → Confirm**.

Point to the student information, SLA badge and status timeline.

Optionally click **Suggest as FAQ**. For the quickest recording, use the already translated staff suggestion in the administrator step below. To demonstrate a new suggestion, use a reusable English question and answer without a student’s personal details; the administrator must complete its other two translations before publication.

**Narration:**

> “The staff member sees the complete issue and the student’s additional details, replies from the same workspace, and records the resolution. The history and notifications are automatic.”

## 2:35–3:05 · The student closes the feedback loop

Switch **⇄ → Student**. Open the notification bell and select **ITI-2026-00125 · Resolved**.

Scroll through the timeline, select **five stars**, optionally enter “Clear and helpful support”, and submit feedback.

**Narration:**

> “The student is notified and can see who handled the query and when. Feedback makes service quality measurable.”

## 3:05–3:55 · Shared knowledge and accountable AI

Switch **⇄ → Administrator**. Open **Review suggestions**.

Find the seeded staff suggestion:

```text
What should I do if my exam registration shows a duplicate record?
```

Click **Review**, show the **English / हिन्दी / ગુજરાતી** tabs, then **Approve & publish**. All three translations are already present in this seeded suggestion.

Open **AI Monitoring**. The latest rows show your student’s `search_faq`, `get_departments`, and `create_ticket` actions.

**Narration:**

> “A resolved question can become approved knowledge for the next student. Publishing is controlled by an administrator, while every AI action has a readable audit trail.”

## 3:55–4:45 · Oversight and overdue escalation

Switch **⇄ → Principal / Supervisor**.

Show:

- Queries by category and department.
- The last-30-days resolution trend.
- Department response times and staff performance.

Click **Simulate time passing → 24 hours → Advance clock**. Close the success dialog, then scroll to the critical/escalated list.

**Expected:** Overdue active tickets become Escalated, their histories are updated, and students/staff/reviewers receive notifications. Resolved tickets stay resolved.

**Narration:**

> “Leadership can see where support is working and where attention is needed. Configurable escalation ensures unanswered questions reach a supervisor or principal.”

## 4:45–5:00 · Close

> “Sahay connects multilingual self-service, human support, institutional knowledge and accountable oversight. One website. One intelligent support agent. One centralized student support system.”

## Extra demo actions

- **Track in chat:** `status of ITI-2026-00125`
- **Human support:** click **Talk to a human**; the previous issue is kept, and confirmation is still required.
- **Manual query:** use **New Query** and show the category-to-department preview.
- **Forwarding:** use a staff ticket’s **Forward ticket** dialog; add a handover note.
- **Reassign:** available from administrator all-tickets and principal critical-list rows.
- **Reset:** Ctrl+Shift+D restores the original unapproved duplicate-record FAQ. This matters if you repeat the Hindi issue demo after publishing that answer: once an answer is published, the assistant may correctly retrieve it instead of creating another ticket.
