/* NF-Team — story-editor (split from app.js) */

// ─── Story Editor ───
export function initStoryEditor() {
  const content = document.getElementById('story-content');
  const wordCount = document.getElementById('story-word-count');
  const charCount = document.getElementById('story-char-count');

  content.addEventListener('input', () => {
    const text = content.innerText || '';
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    wordCount.textContent = `${words.length} words`;
    charCount.textContent = `${text.length} characters`;
  });
}
