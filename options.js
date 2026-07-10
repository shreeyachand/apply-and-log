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
    status.textContent = 'Settings saved!';
    status.className = 'success';
    setTimeout(() => { status.textContent = ''; status.className = ''; }, 2000);
  });
});
