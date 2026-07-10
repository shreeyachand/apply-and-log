document.addEventListener('DOMContentLoaded', async () => {
  const { apiKey, databaseId } = await chrome.storage.sync.get(['apiKey', 'databaseId']);
  if (apiKey) document.getElementById('apiKey').value = apiKey;
  if (databaseId) document.getElementById('databaseId').value = databaseId;

  document.getElementById('save-btn').addEventListener('click', async () => {
    const apiKey = document.getElementById('apiKey').value.trim();
    const databaseId = document.getElementById('databaseId').value.trim();
    const status = document.getElementById('status');

    if (!apiKey || !databaseId) {
      status.textContent = 'Both fields are required.';
      status.className = 'error';
      return;
    }

    await chrome.storage.sync.set({ apiKey, databaseId });
    status.textContent = 'Fetching schema from Notion...';
    status.className = '';

    try {
      const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28',
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch database');

      await chrome.storage.sync.set({ schema: data.properties });
      status.textContent = `Saved! Synced ${Object.keys(data.properties).length} fields.`;
      status.className = 'success';
    } catch (err) {
      status.textContent = 'Saved, but schema sync failed: ' + err.message;
      status.className = 'error';
    }
    setTimeout(() => { status.textContent = ''; status.className = ''; }, 4000);
  });
});
