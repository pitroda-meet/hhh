# Data model · Laravel / MySQL mapping

The browser mock uses normalized record arrays and numeric IDs. API responses enrich them with related users, categories and departments; enriched copies are not written back as relational records.

Use MySQL `BIGINT UNSIGNED` identifiers, `VARCHAR` for short strings, `TEXT` for answers/descriptions, `JSON` for structured payloads, `BOOLEAN`/`TINYINT(1)` for flags, and nullable UTC `DATETIME` timestamps. API timestamps are ISO-8601 strings. Index foreign keys and commonly filtered fields.

## Identity and organization

### `roles`

`id`, `name`

Names: `student`, `staff`, `admin`, `principal`. The last role represents Principal / Supervisor access.

### `users`

`id`, `role_id`, `name`, `email`, `password`, `phone`, `institute`, `trade`, `year`, `enrollment_number`, `language`, `active`, `created_at`, `updated_at`

- Unique `email`; indexed `role_id` and `active`.
- `role` is an enriched convenience field in mock/API records.
- `department_ids` is an array in the mock. In MySQL normalize it to the pivot below.
- Seed passwords are demo strings; Laravel stores password hashes and never serializes passwords. Mock API responses also omit the password field.

### `departments`

`id`, `name`, `code`, `description`, `sla_hours`, `active`, `created_at`, `updated_at`

Unique `code`. Initial departments: Academic, Examination, Scholarship, Administration, Technical / IT, Workshop & Trade.

### `user_departments`

`user_id`, `department_id`

Composite unique key `(user_id, department_id)`. This is the MySQL form of `users.department_ids`. The staff-assignment management page edits this relationship.

### `query_categories`

`id`, `name`, `description`, `department_id`, `active`, `created_at`, `updated_at`

The mock collection and management resource are named `categories`. Each category has one routing department. Student Welfare and General initially route to Administration. Forwarding an individual ticket changes that ticket’s department without changing the category mapping.

## Support tickets

### `tickets`

`id`, `ticket_number`, `student_id`, `category_id`, `department_id`, `assigned_to`, `subject`, `description`, `priority`, `status`, `source`, `attachments`, `rating`, `feedback`, `idempotency_key`, `escalation_level`, `created_at`, `updated_at`, `due_at`, `first_response_at`, `resolved_at`, `closed_at`, `reopened_at`

- Unique `ticket_number`, e.g. `ITI-2026-00125`.
- `student_id → users.id`; `category_id → query_categories.id`; `department_id → departments.id`; nullable `assigned_to → users.id`.
- `status`: Open, Assigned, In Progress, Waiting for Student, Escalated, Resolved, Closed.
- `priority`: Low, Medium, High, Critical.
- `source`: `manual` or `ai`.
- `rating`: nullable integer 1–5. Feedback is accepted only from the owning student after resolution/closure.
- `attachments`: JSON array of `{ name, size, type, mock }`. Laravel can replace metadata with storage-backed attachment records while keeping the response shape.
- A unique nullable `(student_id, idempotency_key)` prevents repeated chat confirmation from creating duplicate tickets.
- The mock stores the highest applied threshold in `escalation_level` (hours). It is a policy marker, not the public status text.
- Index `(student_id, created_at)`, `(department_id, status)`, `(assigned_to, status)`, `(status, priority)`, `due_at` and `ticket_number`.

### `ticket_replies`

`id`, `ticket_id`, `user_id`, `message`, `attachments`, `created_at`

Index `(ticket_id, created_at)`. The first non-student reply sets `tickets.first_response_at`. Replies to a resolved ticket reopen it. Closed tickets require a new query.

### `ticket_status_history`

`id`, `ticket_id`, `actor_id`, `previous_status`, `status`, `note`, `created_at`

`actor_id` is nullable for automatic routing. Routing, forwarding, reopening, resolution and escalation append entries instead of replacing old history. Index `(ticket_id, created_at)`.

## Approved knowledge

### `faqs`

`id`, `category_id`, `status`, `suggested_by`, `approved_by`, `source_ticket_id`, `views`, `helpful`, `created_at`, `updated_at`

- `status`: `draft`, `suggested`, `approved`, `published`.
- Optional user foreign keys for suggestion and approval; optional ticket source.
- Only `published` records are available to student FAQ search and the AI engine.
- Three complete translations are required before approval/publication.
- Index `(status, category_id)`.

### `faq_translations`

`id`, `faq_id`, `language`, `question`, `answer`, `keywords`

Unique `(faq_id, language)`; language is `en`, `hi`, or `gu`. Production retrieval may add full-text/search indexes or a vector store. The mock performs normalized Unicode token and edit-distance matching across all translations.

## Agent sessions and audit

### `chat_sessions`

`id`, `student_id`, `title`, `language`, `context`, `created_at`, `updated_at`

`context` is JSON containing the current intent, previous issue, pending ticket details and latest ticket number. Pending details include category, priority, language, the complete issue description and the current confirmation-message ID. Index `(student_id, updated_at)`.

### `chat_messages`

`id`, `session_id`, `role`, `content`, `language`, `type`, `actions`, `feedback`, `faq_id`, `ticket_id`, `pending_ticket`, `decision`, `source_question`, `confidence`, `provider`, `intent`, `created_at`

- `role`: `user` or `assistant`.
- `type`: `welcome`, `text`, `faq`, `confirmation`, `ticket`.
- `actions`: JSON tool-call summaries with tool, result, status and duration.
- `feedback`: null, `up`, or `down`.
- `decision`: null, `updated`, `cancelled`, or `created`. Older confirmation cards cannot create a new ticket after their context is superseded.
- Optional fields can be nullable columns or a `metadata` JSON column in Laravel, serialized with the same API keys.
- Index `(session_id, created_at)`.

### `ai_action_logs`

`id`, `session_id`, `student_id`, `tool`, `input`, `result`, `status`, `language`, `duration_ms`, `created_at`

- `input` is JSON; `result` is a readable summary.
- `status`: `success`, `no_match`, `error`.
- Tools: `search_faq`, `get_departments`, `create_ticket`, `get_ticket_status`, `request_human_support`, `generate_response`.
- Seed logs may have a null `session_id`; they represent prior illustrative activity.
- Index `(created_at)`, `(tool, status)`, `(student_id, created_at)`.

## Notifications and escalation

### `notifications`

`id`, `user_id`, `ticket_id`, `type`, `title`, `message`, `read_at`, `created_at`

Nullable `ticket_id` supports knowledge-base notifications. Types include assigned, reply, status, resolved, escalated, feedback and faq. Index `(user_id, read_at, created_at)`.

### `escalation_rules`

`id`, `name`, `threshold_hours`, `target_role`, `priority`, `enabled`, `created_at`, `updated_at`

- `target_role`: `supervisor` or `principal_admin`.
- `priority`: `All` or one of the four ticket priorities.
- Enabled matching rules are evaluated by threshold; the highest reached threshold is applied.
- Default thresholds are 24h and 48h. Supervisor recipients are users in the Principal / Supervisor role; principal/admin recipients include both role groups.

### Demo-only metadata

The mock has `meta.version`, `meta.seeded_at`, `meta.time_offset_hours`, `meta.next_ticket_number`, and persisted per-collection `meta.sequences`. IDs are not reused after deletion, including conversation and confirmation-message IDs. These are not required MySQL tables. Production uses migrations, a server clock, a Laravel scheduled job for escalation, and atomic auto-increment/sequence allocation.

## Domain rules carried into the backend

1. Student ownership and staff department permissions are checked for reads as well as writes.
2. Category mapping must target an active department; staff selection must target an active member of that department.
3. Least-workload assignment counts all statuses except Resolved and Closed.
4. Ticket creation, routing history and notifications belong in a single Laravel transaction.
5. AI confirmation is explicit and idempotent. An AI-generated request follows the same validation as a manual request.
6. Reference-protected records cannot be deleted while needed for existing activity. Active staff workloads must be reassigned before removing their department or deactivating the account.
7. FAQ approval does not expose unpublished knowledge. Three-language completeness is enforced in the service/backend, not only in the editor.
8. Resolution requires a staff reply; student ratings require ownership and a resolved/closed ticket.
9. Time escalation preserves replies, previous history and staff ownership. Forwarding preserves escalated status until someone resolves or deliberately changes it.
10. Analytics are computed from ticket/reply/rating records rather than hardcoded chart values.
