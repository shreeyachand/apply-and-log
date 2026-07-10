function scrapeJobPosting() {
  const data = {
    title: '',
    company: '',
    location: '',
    description: '',
    url: window.location.href,
    source: '',
    deadline: '',
  };

  const host = window.location.hostname;
  if (host.includes('handshake')) data.source = 'handshake';
  else if (host.includes('linkedin')) data.source = 'linkedin';
  else if (host.includes('greenhouse')) data.source = 'greenhouse';
  else if (host.includes('lever')) data.source = 'lever';
  else if (host.includes('indeed')) data.source = 'indeed';
  else if (host.includes('glassdoor')) data.source = 'glassdoor';
  else if (host.includes('janestreet')) data.source = 'janestreet';

  const titleSelectors = [
    '.page-heading',
    'h1[class*="job-title"]', 'h1[class*="JobTitle"]',
    'h1[class*="posting-title"]', 'h1[class*="PostingTitle"]',
    'h1', '[data-testid*="job-title"]', '[data-testid*="JobTitle"]',
    '.job-title', '.posting-title', '[class*="job-title"]',
    'meta[property="og:title"]', 'meta[name="title"]',
  ];
  for (const sel of titleSelectors) {
    const el = document.querySelector(sel);
    if (el) {
      data.title = el.tagName === 'META' ? (el.getAttribute('content') || '') : (el.textContent || '').trim();
      if (data.title) break;
    }
  }

  const companySelectors = [
    '[class*="company-name"]', '[class*="CompanyName"]',
    '[class*="company"]', '[class*="Company"]',
    '[data-testid*="company"]', '[data-testid*="Company"]',
    '.job-company', '.posting-company',
    '.job-details-jobs-unified-top-card__company-name',
    '.jobs-unified-top-card__company-name',
    '.jobs-company__name',
    'meta[property="og:site_name"]',
  ];
  for (const sel of companySelectors) {
    const el = document.querySelector(sel);
    if (el) {
      data.company = el.tagName === 'META' ? (el.getAttribute('content') || '') : (el.textContent || '').trim();
      if (data.company) break;
    }
  }

  if (!data.company) {
    const titleTag = document.querySelector('title');
    if (titleTag) {
      const text = titleTag.textContent || '';
      const separators = [' :: ', ' | ', ' — ', ' – ', ' - ', ' at '];
      for (const sep of separators) {
        const parts = text.split(sep);
        if (parts.length > 1) {
          data.company = parts[parts.length - 1].trim();
          if (data.company) break;
        }
      }
    }
  }

  const locationSelectors = [
    '.cityName', '.city',
    '[class*="location"]', '[class*="Location"]',
    '[data-testid*="location"]', '[data-testid*="Location"]',
    '.job-location', '.posting-location',
    '.job-details-jobs-unified-top-card__bullet',
    '.jobs-unified-top-card__bullet',
    'meta[name="application-location"]',
  ];
  for (const sel of locationSelectors) {
    const el = document.querySelector(sel);
    if (el) {
      data.location = (el.textContent || '').trim();
      if (data.location) break;
    }
  }

  if (!data.location) {
    const headingLabel = document.querySelector('.heading-label');
    if (headingLabel) {
      data.location = headingLabel.textContent.trim();
    }
  }

  if (data.location) {
    const parts = data.location.split(/[·•\|\n]/);
    if (parts.length > 1) {
      for (const part of parts) {
        const t = part.trim();
        if (t && !t.includes(data.company)) {
          data.location = t;
          break;
        }
      }
    }
  }

  const descSelectors = [
    '.job-content',
    '[class*="description"]', '[class*="Description"]',
    '#job-description', '.job-description', '.posting-description',
    '[data-testid*="description"]',
    '.show-more-less-html', '.jobs-description',
    'meta[property="og:description"]',
  ];
  for (const sel of descSelectors) {
    const el = document.querySelector(sel);
    if (el) {
      data.description = el.tagName === 'META' ? (el.getAttribute('content') || '') : (el.textContent || '').trim();
      if (data.description) break;
    }
  }
  if (data.description.length > 2000) {
    data.description = data.description.substring(0, 2000) + '...';
  }

  return data;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrape') {
    sendResponse(scrapeJobPosting());
  }
});
