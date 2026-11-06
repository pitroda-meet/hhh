# Sahay · Student support, simplified.

## AI-Powered Student Support & Query Management System

A complete, browser-only hackathon prototype for ITI students in Gujarat.

**Seva First Innovation Challenge 2026 · Government of Gujarat**  
**Problem statement PS000198 · Collector Office, Junagadh**

> One Website. One Intelligent Support Agent. One Centralized Student Support System.

Sahay brings approved multilingual answers, student queries, department ownership, ticket tracking, and escalation into one connected workspace. Every role uses the same persistent mock database, so a ticket created by a student immediately appears for the responsible staff member.

## Run locally

Use Node.js **20.19+**; Node 22 or 24 LTS is recommended.

```bash
cd "/var/www/html/learn/hhh/AI-Powered Student Support & Query Management System"
npm install
npm run dev
```

Open the **Local URL printed by Vite**, usually `http://localhost:5173`. Vite chooses another port if that port is already occupied. If an older development server was running while dependencies were changed, restart it.

**No backend, database server, API key, or environment file is needed.** Fonts are installed and served locally. The default agent works without external network requests.

### Production build

```bash
npm run build
npm run preview
```

The build is written to `dist/`. For deployment, use an SPA-capable host that serves `index.html` for client-side routes. The default application base is `/`.

## Demo accounts

The login screen has four one-click demo buttons. The top-bar **⇄ Switch demo role** menu also switches accounts directly, preserving all ticket and conversation data.

| Role | Quick-login user | Email | Password |
|---|---|---|---|
| Student | Aarav Patel | `student@iti.demo` | `Demo@2026` |
| Staff / Instructor | Mehul Joshi | `staff@iti.demo` | `Demo@2026` |
| Administrator | Drashti Desai | `admin@iti.demo` | `Demo@2026` |
| Principal / Supervisor | Dr. Rupal Shah | `principal@iti.demo` | `Demo@2026` |

There are **four users per role**, sixteen total. All seeded accounts use `Demo@2026`:

| Role | Additional accounts |
|---|---|
| Students | Nidhi Shah (`nidhi.shah@iti.demo`), Dhruv Solanki (`dhruv.solanki@iti.demo`), Kavya Vyas (`kavya.vyas@iti.demo`) |
| Staff | Kavita Trivedi (`kavita.trivedi@iti.demo`), Hitesh Makwana (`hitesh.makwana@iti.demo`), Jignesh Parmar (`jignesh.parmar@iti.demo`) |
| Administrators | Chirag Shah (`chirag.shah@iti.demo`), Bhavika Mehta (`bhavika.mehta@iti.demo`), Parth Vora (`parth.vora@iti.demo`) |
| Principals / Supervisors | Dr. Sanjay Vyas (`dr.sanjay.vyas@iti.demo`), Minal Bhatt (`minal.bhatt@iti.demo`), Prakash Dholakia (`prakash.dholakia@iti.demo`) |

### Reset for a recording

Press **Ctrl+Shift+D** to open the hidden recording studio, then choose **Reset & start demo**. The confirmation resets locally created data, restores the original seed, resets simulated time, and keeps the current role using its default demo account. The next ticket will again be **ITI-2026-00125**. The same shortcut opens the option to hide the demo-mode badge.

See the timed, copy-ready [five-minute recording script](docs/DEMO_SCRIPT.md).

## Implemented workflows

### Student

- Login, student registration, logout, editable profile and preferred language.
- Dashboard statistics, activity, campus notice, and support shortcuts.
- AI chat with persisted conversation history, typing state, timestamps, language badge, suggested prompts, feedback, and expandable tool-call details.
- Gujarati, Hindi, and English FAQ retrieval; unknown personal issues move to a consent-based ticket handoff.
- Manual query submission with category, priority, description, and attachment metadata.
- Searchable, filtered, paginated query list; ticket details, replies, status history, mock attachment download, and resolved-ticket feedback.
- Published FAQ search, category navigation, and EN / HI / GU answer tabs.
- Notification badge, dropdown, individual read state, and mark-all-read.

### Staff / Instructor

- Department-scoped dashboard, recent requests, urgent queue, and inbox.
- “My assignments only” filter, student context, first-response measurement, and live minute-level SLA badges.
- Reply, update status, forward to another department/staff member, escalate, and resolve.
- Suggest reusable answers as FAQs for administrator review.
- A resolution reply is required before resolving a newly created ticket.

### Administrator

- Institute overview with people, department, ticket, and knowledge-base statistics.
- User, department, category mapping, staff-assignment, and escalation-rule management dialogs.
- FAQ creation/editing, English/Hindi/Gujarati translation editing, draft/approved/published states, and staff-suggestion review.
- Published answers require all three translations. Approval and publication are distinct states; only **published** FAQs are searchable by the agent.
- All tickets with reassignment, AI action logs with tool/status/search filters, and error/fallback counters.
- Editable escalation thresholds and a time-simulation action.

### Principal / Supervisor

- Category donut, department workload bar chart, 30-day created/resolved line chart, and average first-response chart.
- Staff workload, resolution rate, response time, and student-feedback table.
- Critical/escalated list with reassignment.
- CSV report export and escalation simulation.

## Technology

- React **18** + Vite + JavaScript.
- Material UI **5**, Emotion, and `@mui/icons-material`.
- React Router **6**, with role guards at both route and service levels.
- Context API for authentication, UI language, notifications, clock, and snackbars.
- Axios restricted to `src/services/`.
- Recharts for all analytics charts.
- Local Fontsource packages: Inter, Plus Jakarta Sans, Noto Sans Gujarati, and Noto Sans Devanagari.
- Plain JSON interface dictionaries in `src/i18n/`.

## Source map

```text
AI-Powered Student Support & Query Management System/
├── package.json
├── package-lock.json
├── vite.config.js
├── playwright.config.js
├── index.html
├── .env.example
├── .gitignore
├── .oxlintrc.json
├── README.md
├── public/
│   └── favicon.svg
├── docs/
│   ├── DATA_MODEL.md
│   └── DEMO_SCRIPT.md
├── tests/
│   ├── services.test.js
│   └── e2e/demo.spec.js
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── components/
    │   ├── AnalyticsCharts.jsx
    │   ├── AttachmentInput.jsx
    │   ├── Brand.jsx
    │   ├── ChatMessage.jsx
    │   ├── DemoMode.jsx
    │   ├── ErrorBoundary.jsx
    │   ├── LanguageSwitcher.jsx
    │   ├── NotificationMenu.jsx
    │   ├── ProtectedRoute.jsx
    │   ├── ReassignDialog.jsx
    │   ├── SimulateTimeButton.jsx
    │   ├── SupportIllustration.jsx
    │   ├── TicketDetail.jsx
    │   ├── TicketListPage.jsx
    │   ├── TicketTable.jsx
    │   └── ui.jsx
    ├── layouts/
    │   ├── AppLayout.jsx
    │   ├── AuthLayout.jsx
    │   ├── StudentLayout.jsx
    │   ├── StaffLayout.jsx
    │   ├── AdminLayout.jsx
    │   ├── PrincipalLayout.jsx
    │   └── navigation.js
    ├── pages/
    │   ├── NotFoundPage.jsx
    │   ├── auth/
    │   │   ├── LoginPage.jsx
    │   │   └── RegisterPage.jsx
    │   ├── student/
    │   │   ├── DashboardPage.jsx
    │   │   ├── ChatPage.jsx
    │   │   ├── MyQueriesPage.jsx
    │   │   ├── NewQueryPage.jsx
    │   │   ├── TicketDetailPage.jsx
    │   │   ├── FaqPage.jsx
    │   │   └── ProfilePage.jsx
    │   ├── staff/
    │   │   ├── DashboardPage.jsx
    │   │   ├── InboxPage.jsx
    │   │   └── TicketDetailPage.jsx
    │   ├── admin/
    │   │   ├── DashboardPage.jsx
    │   │   ├── ManagementPage.jsx
    │   │   ├── FaqManagementPage.jsx
    │   │   ├── AiMonitoringPage.jsx
    │   │   ├── AllTicketsPage.jsx
    │   │   └── TicketDetailPage.jsx
    │   └── principal/
    │       ├── DashboardPage.jsx
    │       ├── TicketsPage.jsx
    │       └── TicketDetailPage.jsx
    ├── services/
    │   ├── api.js
    │   ├── authService.js
    │   ├── ticketService.js
    │   ├── faqService.js
    │   ├── chatService.js
    │   ├── adminService.js
    │   ├── notificationService.js
    │   └── geminiAdapter.js
    ├── mock/
    │   ├── database.js
    │   ├── seed.js
    │   ├── faqSeed.js
    │   ├── agentEngine.js
    │   └── routingEngine.js
    ├── context/
    │   ├── AppContext.jsx
    │   └── appContext.js
    ├── hooks/
    │   └── useAsync.js
    ├── i18n/
    │   ├── index.js
    │   ├── en.json
    │   ├── hi.json
    │   └── gu.json
    ├── theme/
    │   └── index.js
    └── utils/
        ├── constants.js
        ├── format.js
        └── exportReport.js
```

Role-specific ticket pages deliberately share `components/TicketDetail.jsx`. User/department/category/assignment/rule pages use the same schema-aware `ManagementPage.jsx`. Profile and FAQ pages are also reused where appropriate.

## Route map

| Role | Routes |
|---|---|
| Public | `/`, `/login`, `/register` |
| Student | `/student`, `/student/chat`, `/student/queries`, `/student/queries/new`, `/student/queries/:id`, `/student/faqs`, `/student/profile` |
| Staff | `/staff`, `/staff/inbox`, `/staff/queries/:id`, `/staff/faqs`, `/staff/profile` |
| Administrator | `/admin`, `/admin/users`, `/admin/departments`, `/admin/categories`, `/admin/assignments`, `/admin/escalation`, `/admin/faqs`, `/admin/ai-monitoring`, `/admin/tickets`, `/admin/queries/:id`, `/admin/profile` |
| Principal | `/principal`, `/principal/tickets`, `/principal/queries/:id`, `/principal/profile` |

`/` opens the signed-in role’s dashboard or redirects to login. Attempts to open another role’s protected pages redirect to the correct workspace. Service-level policies also prevent accessing or modifying another student’s tickets or tickets outside a staff member’s departments.

## Architecture and persistence

```text
React pages / reusable components
            ↓
Async services (REST-shaped contracts)
            ↓
Mock database + domain/routing/agent engines
            ↓
In-memory state + localStorage snapshot
```

- All application data reads and writes enter through `src/services/`.
- Each mock REST request has a **300–500 ms** artificial delay. A compound flow such as chat confirmation performs the underlying ticket request as a second operation.
- Responses use `{ data, message, meta }`. Pagination lives in `data` as `{ items, total, page, page_size, last_page }`.
- Errors are Axios-shaped: `error.response.status` and `error.response.data.message`.
- `src/mock/database.js` normalizes related records, commits mutations, and persists them under `sahay.database.v1`.
- `sahay.auth.v1` stores the current demo session. Language, collapsed-sidebar state, and the demo-mode preference use separate `sahay.*` keys.
- Mutation events refresh notifications and visible queries. Reloading restores the saved database. Data is scoped to the browser origin; use one browser tab and the role switcher for the recording.
- Passwords and authentication are mock-only. The planned Laravel implementation replaces these with server-side password hashing and authenticated sessions/tokens.
- Uploaded files are represented by **name, size, and MIME-type metadata**. Clicking one downloads an explicitly labelled demo text representation; binary files are not stored in localStorage.
- Date offsets are relative to the seed/reset time, so the dashboard stays useful whenever it is demonstrated.

The complete [data model and MySQL mapping](docs/DATA_MODEL.md) documents every entity and relationship.

## Planned Laravel API mapping

| Service function | REST endpoint |
|---|---|
| `authService.login` | `POST /api/auth/login` |
| `authService.register` | `POST /api/auth/register` |
| `authService.getCurrentUser` | `GET /api/auth/me` |
| `authService.updateProfile` | `PATCH /api/auth/profile` |
| `authService.logout` | `POST /api/auth/logout` |
| `ticketService.getDashboard` | `GET /api/{role}/dashboard` |
| `ticketService.listStudentQueries` | `GET /api/student/queries` |
| `ticketService.createTicket` | `POST /api/student/queries` |
| `ticketService.listStaffQueries` | `GET /api/staff/queries` |
| `ticketService.listAllTickets` | `GET /api/admin/queries` |
| `ticketService.getTicket` | `GET /api/{role}/queries/{id}` |
| `ticketService.replyToTicket` | `POST /api/{role}/queries/{id}/reply` |
| `ticketService.updateTicketStatus` | `PATCH /api/{role}/queries/{id}/status` |
| `ticketService.forwardTicket` | `POST /api/{role}/queries/{id}/forward` |
| `ticketService.rateTicket` | `POST /api/student/queries/{id}/feedback` |
| `faqService.getFaqs` | `GET /api/faqs` |
| `faqService.saveFaq` | `POST /api/admin/faqs`, `PUT /api/admin/faqs/{id}` |
| `faqService.deleteFaq` | `DELETE /api/admin/faqs/{id}` |
| `faqService.suggestFaq` | `POST /api/staff/queries/{id}/suggest-faq` |
| `adminService.getReferenceData` | `GET /api/departments` |
| `adminService.getManagementData` | `GET /api/admin/{resource}` |
| `adminService.saveRecord` | `POST /api/admin/{resource}`, `PUT /api/admin/{resource}/{id}` |
| `adminService.deleteRecord` | `DELETE /api/admin/{resource}/{id}` |
| `adminService.getReports` | `GET /api/admin/reports` |
| `adminService.getAiLogs` | `GET /api/admin/ai-action-logs` |
| `adminService.simulateTime` | `POST /api/admin/escalations/simulate` (demo utility) |
| `notificationService.getNotifications` | `GET /api/notifications` |
| `notificationService.markAsRead` | `PATCH /api/notifications/{id}/read`; use `all` for all unread items |

Management resources are `users`, `departments`, `categories`, `assignments`, and `escalation_rules`. Principal access to reporting/all-ticket endpoints is authorized alongside administrator access.

`api.js` already provides an Axios instance with an authorization interceptor. For example, a real implementation of the existing service contract is:

```js
export async function listStudentQueries(params = {}) {
  const response = await apiClient.get('/student/queries', { params });
  return response.data;
}
```

Here `response.data` is the server’s `{ data, message, meta }` envelope. The React pages keep their current calls and response handling.

## FastAPI agent mapping

| Function | Endpoint |
|---|---|
| `chatService.sendMessage` | `POST /api/v1/agent/chat` |
| `chatService.getSessions` / `createSession` | `GET` / `POST /api/v1/agent/sessions` |
| `chatService.getSession` / `deleteSession` | `GET` / `DELETE /api/v1/agent/sessions/{id}` |
| `chatService.confirmTicket` | `POST /api/v1/agent/sessions/{id}/confirm-ticket` |
| `chatService.setMessageFeedback` | `POST /api/v1/agent/messages/{id}/feedback` |

The intended production boundary is **Laravel for identity, permissions, tickets, approved knowledge and storage; FastAPI for agent orchestration and generation**. FastAPI tools call the authorized Laravel endpoints. The front end continues to use the same chat service contract.

### Mock agent behavior

1. Detect Gujarati (`U+0A80–U+0AFF`), Devanagari (`U+0900–U+097F`), otherwise English.
2. Classify Academic, Examination, Scholarship, Administrative, Technical, Workshop/Trade, Student Welfare, General, Ticket Tracking, or Human Assistance intent.
3. Search **published** FAQ questions and keywords in all three languages using Unicode tokenization, exact terms and edit-distance fuzzy matching.
4. Return the answer in the detected language with its approved-FAQ source and feedback controls.
5. If an issue-specific error is not covered, ask for useful missing details. General instructions are not passed off as a fix for a personal registration error.
6. Keep the initial issue and follow-up details in the session’s pending-ticket context.
7. On explicit confirmation, call `createTicket`; return the ticket number, department and assigned staff. Declining creates no ticket. Idempotency keys and an in-flight lock prevent duplicate confirmations.
8. Tracking requests return only the student’s own ticket. Human-support requests retain the prior issue and still require confirmation.

Visible tool calls are `search_faq`, `get_departments`, `create_ticket`, `get_ticket_status`, `request_human_support`, and optional `generate_response`. Audit entries include student, language, input, result, status and a simulated execution duration. Open the small **AI actions** panel below an assistant message to demonstrate them.

### Optional Gemini adapter

The deterministic mock engine is the default. To enable local-demo response generation, create `.env.local` using `.env.example` and set `VITE_GEMINI_API_KEY` to your own key. `VITE_GEMINI_MODEL` defaults to `gemini-2.0-flash` and can be set to an available model. Restart Vite after changing the environment.

- The isolated adapter is `src/services/geminiAdapter.js`.
- Gemini only rephrases an already retrieved approved answer; ticket creation and permission checks remain deterministic.
- Provider errors fall back to the original approved answer and produce an error audit entry.
- **Production: the Gemini key belongs on the FastAPI server, never in a Vite/browser bundle.** Vite-prefixed variables are public client-side values. No key is hardcoded or included in this project.

## Routing and escalation rules

Category → active department → active staff member with the **fewest active tickets**. Ties use stable user-ID order. Mehul Joshi initially covers Examination and Administration; Kavita Trivedi covers Academic and Scholarship; Hitesh Makwana covers Technical / IT; Jignesh Parmar covers Workshop & Trade.

If a newly configured department has no staff, the ticket remains **Open** and administrators are notified. Reassignment can choose an explicit eligible staff member or apply least-workload selection again.

The default global escalation rules are:

- **24 hours:** supervisor review, delivered to Principal / Supervisor accounts.
- **48 hours:** principal and administrator review.

The simulation advances a persisted clock offset and applies enabled rules to unresolved tickets. Resolved/closed tickets are excluded. Each escalation adds history and notifies the student, assigned staff, and target reviewers. A previously applied threshold is not repeatedly announced. Reopened tickets start a new escalation window.

Department SLA badges use each department’s configurable response target; escalation rules are an independent institute-wide policy.

## Checks

```bash
npm run lint
npm test
npm run build
```

For browser-level verification:

```bash
npx playwright install chromium
npm run test:e2e
```

Playwright starts its own Vite server on **127.0.0.1:5189** and uses isolated browser storage. Keep that port available. It covers the full multilingual recording flow, responsive navigation and Gujarati FAQs, protected routes, manual attachments/search/CRUD, registration/profile/login/logout, and the hidden demo reset. Browser screenshots are saved under `test-results/`; failed runs include Playwright traces.

Service tests exercise consent, duplicate prevention, account/department access, FAQ publication gating, routing, forwarding, ticket resolution and ratings, notifications, persistence, CRUD reference protection, escalation and reset behavior.

## Demo data context

Seed content is an illustrative Gujarat ITI dataset, with Junagadh and Rajkot context, 25 varied tickets, 30 fully translated published FAQs, and two translated staff suggestions awaiting review. The FAQ content deliberately points students to current institute circulars for dates, fees, eligibility and examination-specific requirements.
