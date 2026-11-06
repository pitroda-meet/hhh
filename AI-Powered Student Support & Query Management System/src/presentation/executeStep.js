import { createInteractions, isVisible } from './interactions.js';
import { PITCH_ROUTES } from './routes.js';
import { PITCH_CONTENT as demo } from './demoContent.js';

export function createStepExecutor(getContext, memory, onHighlight) {
  return async (step, { clock, signal }) => {
    const ui = createInteractions(clock, signal, onHighlight);
    const current = () => getContext();
    const routePath = (key) => {
      const route = PITCH_ROUTES.find((item) => item.key === key);
      if (key === 'studentChat' && memory.chatUrl) return memory.chatUrl;
      if (key === 'adminFaqs') return '/admin/faqs?status=suggested';
      return route.path.replace(':id', '125');
    };
    const visit = async (key, explicitPath) => {
      const route = PITCH_ROUTES.find((item) => item.key === key);
      await ui.waitForActive();
      if (route.role !== 'public' && current().app.user?.role !== route.role) {
        current().app.setLanguage('en');
        await current().app.demoLogin(route.role);
      }
      if (signal.aborted) return;
      const path = explicitPath || routePath(key);
      current().navigate(path);
      const expected = path.split('?')[0];
      await ui.waitFor(() => {
        const marker = [...document.querySelectorAll('#sahay-app [data-pitch-page][data-pitch-ready="true"]')].find((node) => node.dataset.pitchPage === expected && isVisible(node));
        return marker && !document.querySelector('#sahay-app [data-pitch-loading="true"], #sahay-app .MuiLinearProgress-root:not([aria-valuenow])') ? marker : null;
      });
      clock.observeRoute();
    };
    const chatSend = async () => {
      const input = await ui.waitFor('[data-testid="chat-input"]', { enabled: true });
      await ui.click(() => input.closest('form').querySelector('button[type="submit"]'));
    };
    const clickText = (selector, text) => ui.click(ui.byText(selector, text));
    const attach = async () => {
      const input = document.querySelector('#sahay-app main input[type="file"]');
      if (!input) throw new Error('Manual attachment input is missing.');
      const transfer = new DataTransfer();
      transfer.items.add(new File(['Sahay demonstration attachment: workshop tool inspection.'], 'demo-workshop-note.txt', { type: 'text/plain' }));
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const forward = async (department) => {
      const dialog = await ui.waitFor('[role="dialog"]');
      await ui.select(() => dialog.querySelector('[role="combobox"]'), department);
      const textarea = await ui.waitFor('[role="dialog"] textarea:not([aria-hidden="true"])');
      await ui.fill(() => textarea, department === 5 ? 'Please review the portal record and coordinate the technical correction.' : 'Supervisor review: coordinate the examination-record correction and keep the student informed.');
      await clickText('[role="dialog"] button', 'Reassign');
    };

    switch (step.command) {
      case 'visit': await visit(step.route); break;
      case 'language': current().app.setLanguage(step.language); break;
      case 'overlay': clock.setOverlay(step.overlay); break;
      case 'highlight': await ui.highlight(step.selector); break;
      case 'scroll': await ui.smoothScrollTo(step.selector, step.duration); break;
      case 'click': await ui.click(step.selector); break;
      case 'type': await ui.simulateTyping(step.selector, step.text, step.speed, step.at); break;
      case 'faq-search': await ui.simulateTyping('#sahay-app main input[placeholder]', 'શિષ્યવૃત્તિ', 35, step.at); break;
      case 'chat-send': await chatSend(); break;
      case 'faq-answer':
        await ui.waitFor('[data-pitch-message-type="faq"]');
        memory.chatUrl = current().pathname + current().search;
        await ui.smoothScrollTo('[data-pitch="faq-source"]', 450);
        break;
      case 'remember-chat': memory.chatUrl = current().pathname + current().search; break;
      case 'chat-actions': {
        const message = await ui.waitFor(ui.last('[data-pitch-message-type]'));
        const button = [...message.querySelectorAll('button')].find((element) => /AI actions|એ.આઈ.|AI ક્રિયાઓ|AI कार्रवाइयाँ/.test(element.textContent));
        if (!button) throw new Error('The AI actions expander is missing.');
        await ui.click(() => button);
        await ui.smoothScrollTo(() => button.parentElement, 400);
        break;
      }
      case 'highlight-human': {
        const input = await ui.waitFor('[data-testid="chat-input"]');
        const footer = input.closest('form').parentElement;
        await ui.highlight(() => [...footer.querySelectorAll('button')].at(-1));
        break;
      }
      case 'confirmation-ready': await ui.smoothScrollTo('[data-testid="confirm-create-ticket"]', 450); break;
      case 'confirm-ticket': await ui.click('[data-testid="confirm-create-ticket"]'); break;
      case 'ticket-card':
        await ui.waitFor(() => [...document.querySelectorAll('[data-pitch-message-type="ticket"]')].find((element) => element.textContent.includes(demo.ticketNumber)));
        await ui.smoothScrollTo(ui.last('[data-pitch-message-type="ticket"]'), 500);
        break;
      case 'manual-form':
        await ui.fill('[data-pitch="query-subject"]', demo.manual.subject);
        await ui.select('[data-pitch="query-category_id"]', demo.manual.category_id);
        await ui.select('[data-pitch="query-priority"]', demo.manual.priority);
        await ui.fill('[data-pitch="query-description"]', demo.manual.description);
        await attach();
        await ui.smoothScrollTo('[data-pitch="query-description"]', 400);
        break;
      case 'manual-submit': await ui.click('#sahay-app main form button[type="submit"]'); break;
      case 'staff-inbox':
        await ui.select('[data-pitch="ticket-sort"]', 'priority');
        // Query search keeps the primary story ticket visible in the priority-sorted inbox.
        await ui.fill('[data-pitch="ticket-search"]', demo.ticketNumber);
        await ui.click('[data-pitch-claim="125"]');
        break;
      case 'suggestion-form':
        await ui.fill('[data-pitch="suggest-question"]', demo.faq.en.question);
        await ui.fill('[data-pitch="suggest-answer"]', demo.faq.en.answer);
        break;
      case 'visit-active-staff-ticket': await visit('staffTicket', '/staff/queries/112'); break;
      case 'forward-active': await forward(5); break;
      case 'student-notification':
        current().app.setLanguage('en');
        await current().app.demoLogin('student');
        current().navigate('/student');
        await ui.click('[data-testid="notification-bell"]');
        break;
      case 'open-resolution-notification': {
        const entry = await ui.waitFor(() => [...document.querySelectorAll('[role="menuitem"]')].find((element) => element.textContent.includes(`${demo.ticketNumber} · Resolved`)));
        await ui.click(() => entry);
        break;
      }
      case 'rating-form': {
        const input = await ui.waitFor('[role="dialog"] [data-pitch="ticket-rating"] input[value="5"]');
        await ui.click(() => document.querySelector(`label[for="${CSS.escape(input.id)}"]`));
        await ui.fill('[data-pitch="ticket-feedback"]', demo.feedback);
        break;
      }
      case 'review-suggestion': {
        const row = await ui.waitFor(() => [...document.querySelectorAll('#sahay-app tr')].find((element) => element.textContent.includes(demo.faq.en.question)));
        const button = [...row.querySelectorAll('button')].find((element) => element.textContent.trim() === 'Review') || row.querySelector('button');
        await ui.click(() => button);
        break;
      }
      case 'curate-hi':
      case 'curate-gu': {
        const language = step.command === 'curate-hi' ? 'hi' : 'gu';
        await clickText('[role="dialog"] [role="tab"]', language === 'hi' ? 'हिन्दी' : 'ગુજરાતી');
        await ui.fill('[data-pitch="faq-editor-question"]', demo.faq[language].question);
        await ui.fill('[data-pitch="faq-editor-answer"]', demo.faq[language].answer);
        await ui.fill('[data-pitch="faq-editor-keywords"]', demo.faq[language].keywords);
        break;
      }
      case 'publish-faq': await clickText('[role="dialog"] button', 'Approve & publish'); break;
      case 'admin-priority': await ui.select('[data-pitch="ticket-priority"]', 'High'); break;
      case 'scroll-executive': await ui.smoothScrollTo(() => document.querySelector('[aria-label="Average response time by department in hours"]'), 550); break;
      case 'close-simulation': await clickText('[role="dialog"] button', 'Close'); break;
      case 'visit-critical-ticket': await visit('principalTicket', '/principal/queries/112'); break;
      case 'principal-reassign': await forward(2); break;
      default: throw new Error(`Unknown presentation action: ${step.command}`);
    }
  };
}
