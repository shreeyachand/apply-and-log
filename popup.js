const NOTION_COLORS = {
  yellow: '#f5d700', pink: '#ff8ebd', blue: '#3b82f6',
  purple: '#a855f7', red: '#ef4444', green: '#22c55e',
  orange: '#f59e0b', brown: '#d98a5b', gray: '#8e8e93', default: '#8e8e93',
};

let scrapedUrl = '';
let currentSchema = null;

function findProp(properties, ...patterns) {
  for (const [key, prop] of Object.entries(properties)) {
    const lower = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const p of patterns) {
      const pl = p.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (lower === pl || lower.includes(pl) || pl.includes(lower)) return { key, prop };
    }
  }
  return null;
}

function skipType(type) {
  return ['formula', 'rollup', 'created_by', 'created_time', 'last_edited_by', 'last_edited_time', 'people', 'files', 'relation'].includes(type);
}

function notionColor(name) {
  return NOTION_COLORS[name] || '#8e8e93';
}

function makeEl(tag, attrs, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'className') el.className = v;
    else if (k.startsWith('data')) el.dataset[k.slice(4).toLowerCase()] = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v);
  }
  for (const c of children) {
    if (typeof c === 'string') el.appendChild(document.createTextNode(c));
    else if (c) el.appendChild(c);
  }
  return el;
}

// --- Field builders ---

function buildTitleField(key, prop, scrapedTitle) {
  const wrapper = document.createElement('div');
  wrapper.className = 'field';
  const label = makeEl('label', {}, key);
  const input = makeEl('input', { type: 'text', id: 'f-' + key, required: '', placeholder: 'e.g. Software Engineering Intern', value: scrapedTitle || '', dataPropKey: key });
  wrapper.append(label, input);
  return wrapper;
}

function buildTextField(key, prop, value) {
  const wrapper = document.createElement('div');
  wrapper.className = 'field';
  const label = makeEl('label', {}, key);
  const isLong = /note|desc/i.test(key);
  const input = isLong
    ? makeEl('textarea', { rows: '3', placeholder: key, dataPropKey: key, id: 'f-' + key }, value || '')
    : makeEl('input', { type: 'text', id: 'f-' + key, placeholder: key, value: value || '', dataPropKey: key });
  wrapper.append(label, input);
  return wrapper;
}

function buildStatusField(key, options) {
  const wrapper = document.createElement('div');
  wrapper.className = 'field';
  wrapper.appendChild(makeEl('label', {}, key));

  const container = document.createElement('div');
  container.className = 'custom-select';
  container.id = 'cs-' + key;

  const hiddenInput = makeEl('input', { type: 'hidden', id: 'f-' + key, dataPropKey: key, value: '' });

  const defaultVal = options.find(o => o.name === 'Submitted') || options[0] || { name: '' };
  const dotColor = notionColor(defaultVal.color);
  hiddenInput.value = defaultVal.name;

  const trigger = makeEl('button', { type: 'button', className: 'select-trigger', dataValue: defaultVal.name, id: 'tr-' + key },
    makeEl('span', { className: 'dot', style: { background: dotColor } }),
    makeEl('span', { className: 'value-text' }, defaultVal.name),
    makeEl('svg', { className: 'chevron', width: '10', height: '6', viewBox: '0 0 10 6' },
      makeEl('path', { d: 'M1 1l4 4 4-4', stroke: 'currentColor', 'stroke-width': '1.5', fill: 'none', 'stroke-linecap': 'round' })
    )
  );

  const dropdown = document.createElement('div');
  dropdown.className = 'select-dropdown';
  dropdown.id = 'dd-' + key;

  for (const opt of options) {
    const c = notionColor(opt.color);
    const dot = makeEl('span', { className: 'dot', style: { background: c } });
    const item = makeEl('div', { className: 'option' + (opt.name === defaultVal.name ? ' selected' : ''), dataValue: opt.name }, dot, opt.name);
    dropdown.appendChild(item);
  }

  container.append(hiddenInput, trigger, dropdown);
  wrapper.appendChild(container);
  return wrapper;
}

function buildMultiSelectField(key, options, initialValues) {
  const wrapper = document.createElement('div');
  wrapper.className = 'field';
  wrapper.appendChild(makeEl('label', {}, key));

  if (options.length <= 5) {
    const group = document.createElement('div');
    group.className = 'checkbox-group';
    const checked = initialValues || [];
    for (const opt of options) {
      const cb = makeEl('input', { type: 'checkbox', className: 'ms-cb', dataPropKey: key, dataOption: opt.name, id: 'cb-' + key + '-' + opt.name });
      if (checked.includes(opt.name)) cb.checked = true;
      const lbl = makeEl('label', {}, cb, ' ' + opt.name);
      group.appendChild(lbl);
    }
    wrapper.appendChild(group);
  } else {
    const searchable = document.createElement('div');
    searchable.className = 'searchable-select';
    searchable.id = 'ss-' + key;

    const input = makeEl('input', { type: 'text', className: 'search-input', id: 'f-' + key, placeholder: 'Type to search or add...', autocomplete: 'off', dataPropKey: key, value: (initialValues && initialValues[0]) || '' });

    const dropdown = document.createElement('div');
    dropdown.className = 'select-dropdown';
    dropdown.id = 'dd-ms-' + key;

    for (const opt of options) {
      const c = notionColor(opt.color);
      const dot = makeEl('span', { className: 'dot', style: { background: c } });
      dropdown.appendChild(makeEl('div', { className: 'option', dataValue: opt.name }, dot, opt.name));
    }

    const noRes = makeEl('div', { className: 'option no-results hidden' }, 'Type a custom value...');
    dropdown.appendChild(noRes);
    searchable.append(input, dropdown);
    wrapper.appendChild(searchable);
  }
  return wrapper;
}

function buildDateField(key) {
  const wrapper = document.createElement('div');
  wrapper.className = 'field';
  wrapper.appendChild(makeEl('label', {}, key));
  wrapper.appendChild(makeEl('input', { type: 'date', id: 'f-' + key, dataPropKey: key }));
  return wrapper;
}

function buildUrlField(key, value) {
  const wrapper = document.createElement('div');
  wrapper.className = 'field';
  wrapper.appendChild(makeEl('label', {}, key));
  wrapper.appendChild(makeEl('input', { type: 'text', id: 'f-' + key, readonly: '', value: value || '', dataPropKey: key }));
  return wrapper;
}

function buildCheckboxField(key) {
  const wrapper = document.createElement('div');
  wrapper.className = 'field';
  const label = makeEl('label', { style: 'display:flex;align-items:center;gap:8px;text-transform:none;letter-spacing:normal;font-weight:400;font-size:14px;cursor:pointer' });
  const cb = makeEl('input', { type: 'checkbox', id: 'f-' + key, dataPropKey: key });
  label.append(cb, ' ' + key);
  wrapper.appendChild(label);
  return wrapper;
}

function buildNumberField(key) {
  const wrapper = document.createElement('div');
  wrapper.className = 'field';
  wrapper.appendChild(makeEl('label', {}, key));
  wrapper.appendChild(makeEl('input', { type: 'number', id: 'f-' + key, placeholder: key, dataPropKey: key }));
  return wrapper;
}

function buildSelectField(key, options) {
  const wrapper = document.createElement('div');
  wrapper.className = 'field';
  wrapper.appendChild(makeEl('label', {}, key));

  const container = document.createElement('div');
  container.className = 'custom-select';
  container.id = 'cs-' + key;

  const defaultVal = options[0] || { name: '' };
  const trigger = makeEl('button', { type: 'button', className: 'select-trigger', dataValue: defaultVal.name, id: 'tr-' + key },
    makeEl('span', { className: 'value-text' }, defaultVal.name),
    makeEl('svg', { className: 'chevron', width: '10', height: '6', viewBox: '0 0 10 6' },
      makeEl('path', { d: 'M1 1l4 4 4-4', stroke: 'currentColor', 'stroke-width': '1.5', fill: 'none', 'stroke-linecap': 'round' })
    )
  );

  const dropdown = document.createElement('div');
  dropdown.className = 'select-dropdown';
  for (const opt of options) {
    const item = makeEl('div', { className: 'option' + (opt.name === defaultVal.name ? ' selected' : ''), dataValue: opt.name }, opt.name);
    dropdown.appendChild(item);
  }
  container.append(trigger, dropdown);
  wrapper.appendChild(container);
  return wrapper;
}

// --- Form building ---

function buildForm(properties, scraped) {
  const container = document.getElementById('form-fields');
  container.innerHTML = '';

  const titleProp = findProp(properties, 'Name', 'Title', 'Position', 'Job Title', 'Role');
  const companyProp = findProp(properties, 'Company', 'Employer', 'Organization', 'Firm');
  const statusProp = findProp(properties, 'Status', 'Stage', 'Pipeline Stage');
  const locationProp = findProp(properties, 'Location', 'Office', 'City', 'Place');
  const sourceProp = findProp(properties, 'Multi-select', 'Multi select', 'Source', 'Tag');
  const notesProp = findProp(properties, 'Notes', 'Description', 'Comment', 'Note');
  const deadlineProp = findProp(properties, 'Deadline', 'Application Deadline', 'Date', 'Due Date');
  const urlProp = findProp(properties, 'URL', 'Link', 'Posting URL', 'Application URL');

  const handled = new Set();

  // 1. Title
  if (titleProp) {
    handled.add(titleProp.key);
    container.appendChild(buildTitleField(titleProp.key, titleProp.prop, scraped.title));
  }

  // 2. Company
  if (companyProp && !handled.has(companyProp.key)) {
    handled.add(companyProp.key);
    container.appendChild(buildTextField(companyProp.key, companyProp.prop, scraped.company));
  }

  // 3. Status
  if (statusProp && statusProp.prop.type === 'status') {
    handled.add(statusProp.key);
    container.appendChild(buildStatusField(statusProp.key, statusProp.prop.status.options));
  }

  // 4. Location
  if (locationProp && locationProp.prop.type === 'multi_select') {
    handled.add(locationProp.key);
    const initVal = scraped.location ? [scraped.location] : [];
    container.appendChild(buildMultiSelectField(locationProp.key, locationProp.prop.multi_select.options, initVal));
  }

  // 5. Source / Multi-select
  if (sourceProp && sourceProp.prop.type === 'multi_select' && !handled.has(sourceProp.key)) {
    handled.add(sourceProp.key);
    const initVal = scraped.source ? [scraped.source] : [];
    container.appendChild(buildMultiSelectField(sourceProp.key, sourceProp.prop.multi_select.options, initVal));
  }

  // 6. Deadline
  if (deadlineProp && !handled.has(deadlineProp.key)) {
    handled.add(deadlineProp.key);
    if (deadlineProp.prop.type === 'date') {
      container.appendChild(buildDateField(deadlineProp.key));
    } else {
      container.appendChild(buildTextField(deadlineProp.key, deadlineProp.prop, ''));
    }
  }

  // 7. Notes
  if (notesProp && !handled.has(notesProp.key) && notesProp.prop.type === 'rich_text') {
    handled.add(notesProp.key);
    container.appendChild(buildTextField(notesProp.key, notesProp.prop, ''));
  }

  // 8. URL (read-only, mapped from scraped URL)
  if (urlProp && !handled.has(urlProp.key)) {
    handled.add(urlProp.key);
    container.appendChild(buildUrlField(urlProp.key, scraped.url));
  }

  // 9. Remaining editable fields
  for (const [key, prop] of Object.entries(properties)) {
    if (handled.has(key)) continue;
    if (skipType(prop.type)) continue;
    handled.add(key);

    switch (prop.type) {
      case 'rich_text':
        container.appendChild(buildTextField(key, prop, ''));
        break;
      case 'select':
        container.appendChild(buildSelectField(key, prop.select.options));
        break;
      case 'multi_select':
        container.appendChild(buildMultiSelectField(key, prop.multi_select.options, []));
        break;
      case 'date':
        container.appendChild(buildDateField(key));
        break;
      case 'url':
        container.appendChild(buildUrlField(key, ''));
        break;
      case 'email':
        container.appendChild(buildTextField(key, prop, ''));
        break;
      case 'phone_number':
        container.appendChild(buildTextField(key, prop, ''));
        break;
      case 'number':
        container.appendChild(buildNumberField(key));
        break;
      case 'checkbox':
        container.appendChild(buildCheckboxField(key));
        break;
    }
  }

  // Init custom selects
  document.querySelectorAll('.custom-select').forEach(el => initCustomSelect(el.id));
  document.querySelectorAll('.searchable-select').forEach(el => initSearchableSelect(el.id));
}

// --- Payload building ---

function buildPayload(properties) {
  const payload = {};

  for (const [key, prop] of Object.entries(properties)) {
    if (skipType(prop.type)) continue;

    const input = document.getElementById('f-' + key);
    if (!input) {
      // Check for checkbox group
      const cbs = document.querySelectorAll('.ms-cb[data-prop-key="' + CSS.escape(key) + '"]');
      if (cbs.length > 0) {
        const selected = Array.from(cbs).filter(cb => cb.checked).map(cb => cb.dataset.option);
        if (selected.length > 0) {
          payload[key] = { multi_select: selected.map(n => ({ name: n })) };
        }
      }
      // Check for searchable select
      const ss = document.querySelector('#ss-' + CSS.escape(key) + ' .search-input');
      if (ss && ss.value) {
        payload[key] = { multi_select: [{ name: ss.value }] };
      }
      continue;
    }

    let value;
    if (prop.type === 'checkbox') {
      value = input.checked;
    } else if (prop.type === 'number') {
      value = input.value ? parseFloat(input.value) : null;
    } else {
      value = input.value;
    }

    if (value === '' || value === null || value === undefined) continue;

    switch (prop.type) {
      case 'title':
        payload[key] = {
          title: scrapedUrl
            ? [{ text: { content: value, link: { url: scrapedUrl } } }]
            : [{ text: { content: value } }],
        };
        break;
      case 'rich_text':
        payload[key] = { rich_text: [{ text: { content: value } }] };
        break;
      case 'status':
        payload[key] = { status: { name: value } };
        break;
      case 'select':
        payload[key] = { select: { name: value } };
        break;
      case 'date':
        payload[key] = { date: { start: value } };
        break;
      case 'url':
        payload[key] = { url: value };
        break;
      case 'email':
        payload[key] = { email: value };
        break;
      case 'phone_number':
        payload[key] = { phone_number: value };
        break;
      case 'number':
        payload[key] = { number: value };
        break;
      case 'checkbox':
        payload[key] = { checkbox: value };
        break;
      case 'multi_select':
        if (typeof value === 'string') {
          payload[key] = { multi_select: [{ name: value }] };
        }
        break;
    }
  }

  return payload;
}

// --- Custom select init ---

function initCustomSelect(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const trigger = container.querySelector('.select-trigger');
  const dropdown = container.querySelector('.select-dropdown');
  if (!trigger || !dropdown) return;

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdown.classList.contains('open');
    closeAllDropdowns();
    if (!isOpen) {
      dropdown.classList.add('open');
      trigger.classList.add('open');
    }
  });

  const hiddenInput = container.querySelector('input[type="hidden"]');

  dropdown.querySelectorAll('.option').forEach((opt) => {
    opt.addEventListener('click', () => {
      const val = opt.dataset.value;
      trigger.dataset.value = val;
      trigger.querySelector('.value-text').textContent = val;
      if (hiddenInput) hiddenInput.value = val;
      const dot = opt.querySelector('.dot');
      const triggerDot = trigger.querySelector('.dot');
      if (dot && triggerDot) {
        triggerDot.style.background = dot.style.background;
      }
      dropdown.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      closeAllDropdowns();
    });
  });
}

function initSearchableSelect(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const input = container.querySelector('.search-input');
  const dropdown = container.querySelector('.select-dropdown');
  if (!input || !dropdown) return;

  const options = dropdown.querySelectorAll('.option:not(.no-results)');
  let noResultsItem = dropdown.querySelector('.no-results');
  if (!noResultsItem) {
    noResultsItem = makeEl('div', { className: 'option no-results hidden' }, 'Type a custom value...');
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

function closeAllDropdowns() {
  document.querySelectorAll('.select-dropdown').forEach(d => d.classList.remove('open'));
  document.querySelectorAll('.select-trigger').forEach(t => t.classList.remove('open'));
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.custom-select') && !e.target.closest('.searchable-select')) {
    closeAllDropdowns();
  }
});

// --- Draft persistence ---

const MAX_DRAFTS = 20;

function getFormData(schema) {
  const data = {};
  for (const [key, prop] of Object.entries(schema)) {
    if (skipType(prop.type)) continue;
    const input = document.getElementById('f-' + key);
    if (!input) {
      const cbs = document.querySelectorAll('.ms-cb[data-prop-key="' + CSS.escape(key) + '"]');
      if (cbs.length > 0) {
        const selected = Array.from(cbs).filter(cb => cb.checked).map(cb => cb.dataset.option);
        if (selected.length > 0) data[key] = selected;
      }
      const ss = document.querySelector('#ss-' + CSS.escape(key) + ' .search-input');
      if (ss && ss.value) {
        data[key] = ss.value;
      }
      continue;
    }
    let value;
    if (prop.type === 'checkbox') {
      value = input.checked;
    } else if (prop.type === 'number') {
      value = input.value !== '' ? parseFloat(input.value) : '';
    } else {
      value = input.value;
    }
    if (value !== '' && value !== null && value !== undefined) {
      data[key] = value;
    }
  }
  return data;
}

function saveDraft(url, schema) {
  if (!url || !schema) return;
  const data = getFormData(schema);
  if (Object.keys(data).length === 0) return;
  const key = 'draft_' + url;
  chrome.storage.local.set({ [key]: data });
  chrome.storage.local.get(null).then((items) => {
    const keys = Object.keys(items).filter(k => k.startsWith('draft_'));
    if (keys.length > MAX_DRAFTS) {
      chrome.storage.local.remove(keys.slice(MAX_DRAFTS));
    }
  });
}

function clearDraft(url) {
  if (!url) return;
  chrome.storage.local.remove('draft_' + url);
}

async function loadDraft(url) {
  if (!url) return null;
  const key = 'draft_' + url;
  const { [key]: entry } = await chrome.storage.local.get(key);
  return entry || null;
}

function applyDraft(data, schema) {
  for (const [key, value] of Object.entries(data)) {
    const prop = schema[key];
    if (!prop || skipType(prop.type)) continue;
    const input = document.getElementById('f-' + key);
    if (!input) {
      const cbs = document.querySelectorAll('.ms-cb[data-prop-key="' + CSS.escape(key) + '"]');
      if (cbs.length > 0 && Array.isArray(value)) {
        cbs.forEach(cb => { if (value.includes(cb.dataset.option)) cb.checked = true; });
      }
      const ss = document.querySelector('#ss-' + CSS.escape(key) + ' .search-input');
      if (ss && typeof value === 'string') {
        ss.value = value;
      }
      continue;
    }
    if (prop.type === 'checkbox') {
      input.checked = Boolean(value);
    } else if (prop.type === 'status' || prop.type === 'select') {
      input.value = value;
      const trigger = document.querySelector('#tr-' + CSS.escape(key));
      if (trigger) {
        trigger.dataset.value = value;
        const vt = trigger.querySelector('.value-text');
        if (vt) vt.textContent = value;
        const dot = trigger.querySelector('.dot');
        const dd = document.querySelector('#dd-' + CSS.escape(key));
        if (dd) {
          if (dot) {
            const match = dd.querySelector('.option[data-value="' + CSS.escape(value) + '"]');
            if (match) {
              const matchDot = match.querySelector('.dot');
              if (matchDot) dot.style.background = matchDot.style.background;
            }
          }
          dd.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
          const match = dd.querySelector('.option[data-value="' + CSS.escape(value) + '"]');
          if (match) match.classList.add('selected');
        }
      }
    } else {
      input.value = value;
    }
  }
}

// --- Main ---

document.addEventListener('DOMContentLoaded', async () => {
  const btn = document.getElementById('submit-btn');
  const statusMsg = document.getElementById('status-msg');

  // Load schema
  const { schema, databaseId } = await chrome.storage.sync.get(['schema', 'databaseId']);
  if (!schema || !databaseId) {
    statusMsg.textContent = 'Not configured. Open Settings to add your Notion DB.';
    statusMsg.className = 'error';
    return;
  }

  // Scrape current page
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let scraped = { title: '', company: '', location: '', description: '', url: '', source: '' };
  try {
    const resp = await chrome.tabs.sendMessage(tab.id, { action: 'scrape' });
    if (resp) scraped = resp;
  } catch {
    // no scrape possible
  }

  scrapedUrl = scraped.url;
  currentSchema = schema;

  // Build form
  buildForm(schema, scraped);
  btn.disabled = false;
  btn.textContent = 'Log to Notion';

  // Load saved draft for this URL
  const draft = await loadDraft(scrapedUrl);
  if (draft) {
    applyDraft(draft, schema);
  }

  // Auto-save on changes
  const form = document.getElementById('log-form');
  form.addEventListener('input', () => saveDraft(scrapedUrl, currentSchema));
  form.addEventListener('change', () => saveDraft(scrapedUrl, currentSchema));
  form.addEventListener('click', (e) => {
    if (e.target.closest('.custom-select .option') || e.target.closest('.searchable-select .option:not(.no-results)')) {
      saveDraft(scrapedUrl, currentSchema);
    }
  });

  // Submit
  document.getElementById('log-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    btn.disabled = true;
    statusMsg.textContent = 'Sending...';
    statusMsg.className = '';

    const data = { properties: buildPayload(schema), databaseId };

    try {
      const result = await chrome.runtime.sendMessage({ action: 'logToNotion', ...data });
      if (result.success) {
        statusMsg.textContent = 'Logged to Notion!';
        statusMsg.className = 'success';
        clearDraft(scrapedUrl);
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
