function initCustomSelect(containerId) {
  const container = document.getElementById(containerId);
  const trigger = container.querySelector('.select-trigger');
  const dropdown = container.querySelector('.select-dropdown');
  const hiddenInput = container.querySelector('input[type="hidden"]');

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdown.classList.contains('open');
    closeAllDropdowns();
    if (!isOpen) {
      dropdown.classList.add('open');
      trigger.classList.add('open');
    }
  });

  dropdown.querySelectorAll('.option').forEach((opt) => {
    opt.addEventListener('click', () => {
      const val = opt.dataset.value;
      hiddenInput.value = val;
      trigger.dataset.value = val;
      trigger.querySelector('.value-text').textContent = val;
      const dot = opt.querySelector('.dot');
      const triggerDot = trigger.querySelector('.dot');
      if (dot && triggerDot) {
        triggerDot.className = 'dot ' + Array.from(dot.classList).filter(c => c !== 'dot').join(' ');
      }
      dropdown.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      closeAllDropdowns();
    });
  });
}

function closeAllDropdowns() {
  document.querySelectorAll('.select-dropdown').forEach(d => d.classList.remove('open'));
  document.querySelectorAll('.select-trigger').forEach(t => t.classList.remove('open'));
}

function initSearchableSelect(containerId) {
  const container = document.getElementById(containerId);
  const input = container.querySelector('.search-input');
  const dropdown = container.querySelector('.select-dropdown');
  const options = dropdown.querySelectorAll('.option');

  let noResultsItem = dropdown.querySelector('.no-results');
  if (!noResultsItem) {
    noResultsItem = document.createElement('div');
    noResultsItem.className = 'option no-results hidden';
    noResultsItem.textContent = 'Type a custom value...';
    dropdown.appendChild(noResultsItem);
  }

  input.addEventListener('focus', () => {
    closeAllDropdowns();
    dropdown.classList.add('open');
    filterOptions();
  });

  input.addEventListener('input', filterOptions);

  function filterOptions() {
    const q = input.value.toLowerCase().trim();
    let hasVisible = false;
    options.forEach((opt) => {
      if (!q || opt.dataset.value.toLowerCase().includes(q)) {
        opt.classList.remove('hidden');
        hasVisible = true;
      } else {
        opt.classList.add('hidden');
      }
    });
    noResultsItem.classList.toggle('hidden', hasVisible || !q);
  }

  options.forEach((opt) => {
    opt.addEventListener('click', () => {
      input.value = opt.dataset.value;
      dropdown.classList.remove('open');
    });
  });

  input.addEventListener('blur', () => {
    setTimeout(() => dropdown.classList.remove('open'), 150);
  });
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.custom-select') && !e.target.closest('.searchable-select')) {
    closeAllDropdowns();
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  initCustomSelect('status-select');
  initSearchableSelect('location-select');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'scrape' });
    if (response) {
      document.getElementById('name').value = response.title || '';
      document.getElementById('company').value = response.company || '';
      document.getElementById('url').value = response.url || '';

      if (response.location) {
        const locInput = document.querySelector('#location-select .search-input');
        locInput.value = response.location;
      }

      if (response.source === 'handshake') {
        document.getElementById('source-handshake').checked = true;
      }
    }
  } catch {
    document.getElementById('status-msg').textContent = 'Could not auto-scrape. Fill in manually.';
  }

  document.getElementById('log-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = document.getElementById('submit-btn');
    const statusMsg = document.getElementById('status-msg');
    btn.disabled = true;
    statusMsg.textContent = 'Sending...';
    statusMsg.className = '';

    const sources = [];
    if (document.getElementById('source-event').checked) sources.push('event/program');
    if (document.getElementById('source-handshake').checked) sources.push('handshake');

    const data = {
      name: document.getElementById('name').value,
      company: document.getElementById('company').value,
      status: document.getElementById('status').value,
      location: document.querySelector('#location-select .search-input').value,
      sources,
      deadline: document.getElementById('deadline').value,
      notes: document.getElementById('notes').value,
      url: document.getElementById('url').value,
    };

    try {
      const result = await chrome.runtime.sendMessage({ action: 'logToNotion', data });
      if (result.success) {
        statusMsg.textContent = 'Logged to Notion!';
        statusMsg.className = 'success';
        setTimeout(() => window.close(), 1800);
      } else {
        statusMsg.textContent = 'Error: ' + (result.error || 'Unknown error');
        statusMsg.className = 'error';
        btn.disabled = false;
      }
    } catch (err) {
      statusMsg.textContent = 'Error: ' + err.message;
      statusMsg.className = 'error';
      btn.disabled = false;
    }
  });

  document.getElementById('open-options').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
});
