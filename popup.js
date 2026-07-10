document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'scrape' });
    if (response) {
      document.getElementById('name').value = response.title || '';
      document.getElementById('company').value = response.company || '';
      document.getElementById('location').value = response.location || '';
      document.getElementById('url').value = response.url || '';

      if (response.source === 'handshake') {
        document.getElementById('source-handshake').checked = true;
      }


    }
  } catch {
    document.getElementById('status').textContent = 'Could not auto-scrape. Fill in manually.';
  }

  document.getElementById('log-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = document.getElementById('submit-btn');
    const status = document.getElementById('status');
    btn.disabled = true;
    status.textContent = 'Sending...';
    status.className = '';

    const sources = [];
    if (document.getElementById('source-event').checked) sources.push('event/program');
    if (document.getElementById('source-handshake').checked) sources.push('handshake');

    const data = {
      name: document.getElementById('name').value,
      company: document.getElementById('company').value,
      location: document.getElementById('location').value,
      sources,
      deadline: document.getElementById('deadline').value,
      notes: document.getElementById('notes').value,
      url: document.getElementById('url').value,
    };

    try {
      const result = await chrome.runtime.sendMessage({ action: 'logToNotion', data });
      if (result.success) {
        status.textContent = 'Logged to Notion!';
        status.className = 'success';
        setTimeout(() => window.close(), 1800);
      } else {
        status.textContent = 'Error: ' + (result.error || 'Unknown error');
        status.className = 'error';
        btn.disabled = false;
      }
    } catch (err) {
      status.textContent = 'Error: ' + err.message;
      status.className = 'error';
      btn.disabled = false;
    }
  });

  document.getElementById('open-options').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
});
