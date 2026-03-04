const BRAND_URLS = {
  apple: 'https://www.apple.com/',
  stripe: 'https://stripe.com/',
  linear: 'https://linear.app/',
  notion: 'https://www.notion.so/',
  framer: 'https://www.framer.com/',
  vercel: 'https://vercel.com/'
};

function isDesignResearchRequest(text) {
  const query = (text || '').toLowerCase();
  return /(like|similar to|inspired by|makeover|redesign|rework|modernize|advanced ui|premium ui|apple)/.test(query);
}

function inferReferenceTarget(text) {
  const input = (text || '').toLowerCase();
  const match = input.match(/(?:like|similar to|inspired by)\s+([a-z0-9.-]+)/i);
  if (match && match[1]) {
    return match[1].replace(/[^a-z0-9.-]/g, '');
  }

  for (const brand of Object.keys(BRAND_URLS)) {
    if (input.includes(brand)) {
      return brand;
    }
  }

  return null;
}

function resolveReferenceUrl(target) {
  if (!target) return null;
  if (/^https?:\/\//i.test(target)) return target;
  if (BRAND_URLS[target]) return BRAND_URLS[target];
  if (target.includes('.')) return `https://${target}`;
  return null;
}

async function searchWeb(query, maxResults = 5) {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'site-agent/1.0 (+web research)'
    }
  });

  if (!response.ok) {
    throw new Error(`Search request failed (${response.status})`);
  }

  const html = await response.text();
  const regex = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const results = [];
  let match;

  while ((match = regex.exec(html)) !== null && results.length < maxResults) {
    let href = match[1];
    const title = match[2].replace(/<[^>]+>/g, '').trim();

    const uddgMatch = href.match(/[?&]uddg=([^&]+)/);
    if (uddgMatch && uddgMatch[1]) {
      href = decodeURIComponent(uddgMatch[1]);
    }

    if (/^https?:\/\//i.test(href)) {
      results.push({ title, url: href });
    }
  }

  return results;
}

async function fetchPageText(url, maxChars = 1800) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'site-agent/1.0 (+design analysis)'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} (${response.status})`);
  }

  const html = await response.text();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text.slice(0, maxChars);
}

async function buildDesignResearchContext(requestText) {
  if (!isDesignResearchRequest(requestText)) {
    return {
      enabled: false,
      contextText: '',
      referenceUrl: null,
      references: []
    };
  }

  const target = inferReferenceTarget(requestText);
  const referenceUrl = resolveReferenceUrl(target);
  const queries = [
    `${requestText} web design style`,
    `${target || 'modern website'} typography layout principles`
  ];

  const searchResults = [];
  for (const query of queries) {
    try {
      const results = await searchWeb(query, 4);
      searchResults.push(...results);
    } catch {
      // ignore search failures and continue best-effort
    }
  }

  const deduped = [];
  const seen = new Set();
  for (const item of searchResults) {
    if (!seen.has(item.url)) {
      deduped.push(item);
      seen.add(item.url);
    }
    if (deduped.length >= 6) break;
  }

  const snippets = [];
  for (const result of deduped.slice(0, 3)) {
    try {
      const text = await fetchPageText(result.url, 1200);
      snippets.push({
        title: result.title,
        url: result.url,
        snippet: text
      });
    } catch {
      // ignore individual fetch errors
    }
  }

  const contextLines = [];
  contextLines.push('External design research context (use this for styling decisions):');
  if (referenceUrl) {
    contextLines.push(`Primary visual reference URL: ${referenceUrl}`);
  }
  for (const item of snippets) {
    contextLines.push(`- Source: ${item.title} (${item.url})`);
    contextLines.push(`  Notes: ${item.snippet}`);
  }

  return {
    enabled: true,
    contextText: contextLines.join('\n'),
    referenceUrl,
    references: deduped
  };
}

module.exports = {
  isDesignResearchRequest,
  inferReferenceTarget,
  resolveReferenceUrl,
  searchWeb,
  buildDesignResearchContext
};
