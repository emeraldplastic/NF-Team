/* NF-Team — studio-tabs (split from app.js) */
import { state } from './state.js';

// ─── Studio Tabs ───
export function initStudioTabs() {
  const tabs = document.querySelectorAll('.studio-tab');
  const panels = document.querySelectorAll('.studio-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const studio = tab.dataset.studio;
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      panels.forEach(p => {
        p.classList.toggle('active', p.id === `studio-${studio}`);
      });
      state.currentStudio = studio;
      if (typeof Store !== 'undefined') {
        Store.set('currentStudio', studio);
      }
      if (typeof EventBus !== 'undefined' && typeof Events !== 'undefined') {
        EventBus.emit(Events.STUDIO_TAB_CHANGED, { studio });
      }
    });
  });
}
