chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'logToNotion') {
    logToNotion(request.data).then(sendResponse);
    return true;
  }
});

async function logToNotion(data) {
  const { apiKey, databaseId } = await chrome.storage.sync.get(['apiKey', 'databaseId']);

  if (!apiKey || !databaseId) {
    return { success: false, error: 'Notion API key or Database ID not configured' };
  }

  const properties = {};

  const titleText = data.name || 'Untitled';
  properties['Name'] = {
    title: data.url
      ? [{ text: { content: titleText, link: { url: data.url } } }]
      : [{ text: { content: titleText } }],
  };

  if (data.company) {
    properties['Company'] = {
      rich_text: [{ text: { content: data.company } }],
    };
  }

  properties['Status'] = {
    status: { name: 'Submitted' },
  };

  if (data.location) {
    const locations = data.location.split(/[,;\/]/).map(l => l.trim()).filter(Boolean);
    properties['Location'] = {
      multi_select: locations.map(l => ({ name: l })),
    };
  }

  if (data.sources && data.sources.length > 0) {
    properties['Multi-select'] = {
      multi_select: data.sources.map(s => ({ name: s })),
    };
  }

  if (data.notes) {
    properties['Notes'] = {
      rich_text: [{ text: { content: data.notes } }],
    };
  }

  if (data.deadline) {
    properties['Application Deadline'] = {
      date: { start: data.deadline },
    };
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

    if (res.ok) {
      return { success: true };
    }
    return { success: false, error: result.message || JSON.stringify(result) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
