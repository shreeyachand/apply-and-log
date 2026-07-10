chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'logToNotion') {
    logToNotion(request.properties, request.databaseId).then(sendResponse);
    return true;
  }
});

async function logToNotion(properties, databaseId) {
  const { apiKey } = await chrome.storage.sync.get(['apiKey']);
  if (!apiKey || !databaseId) {
    return { success: false, error: 'Notion API key or Database ID not configured' };
  }

  try {
    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties,
      }),
    });

    const result = await res.json();
    if (res.ok) return { success: true };
    return { success: false, error: result.message || JSON.stringify(result) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
