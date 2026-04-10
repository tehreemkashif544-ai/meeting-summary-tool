const summarizeBtn = document.getElementById('summarize-btn');
const copyBtn = document.getElementById('copy-btn');
const notesInput = document.getElementById('meeting-notes');
const outputSection = document.getElementById('output-section');
const summaryOutput = document.getElementById('summary-output');
const actionItemsList = document.getElementById('action-items');

const API_URL = '/api/summarize';

summarizeBtn.addEventListener('click', async () => {
  const notes = notesInput.value.trim();
  if (!notes) {
    alert('Please paste some meeting notes first.');
    return;
  }

  // Loading state
  summarizeBtn.disabled = true;
  summarizeBtn.textContent = 'Generating...';
  outputSection.classList.add('hidden');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meeting_notes: notes }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    const actionItems = Array.isArray(data.action_items) ? data.action_items : [];
    const decisions = Array.isArray(data.decisions) ? data.decisions : [];

    // Render decisions in summary output
    summaryOutput.textContent = decisions.length > 0
      ? decisions.join(' • ')
      : 'No decisions recorded.';

    // Render action items list
    actionItemsList.innerHTML = '';
    if (actionItems.length > 0) {
      actionItems.forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        actionItemsList.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.textContent = 'No action items found.';
      actionItemsList.appendChild(li);
    }

    outputSection.classList.remove('hidden');
    outputSection.scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    alert(`Failed to generate summary: ${err.message}`);
  } finally {
    summarizeBtn.disabled = false;
    summarizeBtn.textContent = 'Generate Summary';
  }
});

copyBtn.addEventListener('click', () => {
  const summaryText = summaryOutput.textContent;
  const items = Array.from(actionItemsList.querySelectorAll('li'))
    .map((li) => `• ${li.textContent}`)
    .join('\n');

  const fullText = `Decisions:\n${summaryText}\n\nAction Items:\n${items}`;

  navigator.clipboard.writeText(fullText).then(() => {
    copyBtn.textContent = 'Copied!';
    setTimeout(() => (copyBtn.textContent = 'Copy to Clipboard'), 2000);
  });
});
