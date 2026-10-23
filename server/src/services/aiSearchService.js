const config = require('../config');
const { tokenize, calculateTextSimilarity } = require('./aiMatchingService');

const KNOWN_COLORS = [
  'black', 'white', 'silver', 'grey', 'gray', 'red', 'blue', 'navy', 'green',
  'yellow', 'gold', 'purple', 'pink', 'orange', 'brown', 'beige', 'tan'
];

const KNOWN_BRANDS = [
  'apple', 'nike', 'adidas', 'samsung', 'sony', 'casio', 'hydro flask', 'yeti',
  'dell', 'lenovo', 'hp', 'patagonia', 'north face', 'herschel', 'stanley',
  'bose', 'anker', 'jbl', 'ray-ban', 'gucci', 'coach', 'louis vuitton', 'timberland'
];

const CATEGORY_KEYWORDS = {
  'Electronics': ['iphone', 'phone', 'macbook', 'laptop', 'charger', 'airpods', 'headphones', 'earbuds', 'ipad', 'tablet', 'kindle', 'calculator', 'camera'],
  'Bags & Backpacks': ['backpack', 'bag', 'tote', 'duffel', 'purse', 'rucksack', 'briefcase', 'pouch'],
  'Books & Notebooks': ['book', 'textbook', 'notebook', 'binder', 'folder', 'novel', 'journal'],
  'Clothing & Apparel': ['jacket', 'hoodie', 'coat', 'sweater', 'shirt', 'hat', 'cap', 'scarf', 'gloves', 'umbrella'],
  'Accessories & Jewelry': ['watch', 'ring', 'necklace', 'bracelet', 'earrings', 'belt', 'sunglasses'],
  'Documents & Cards': ['passport', 'driver license', 'card', 'certificate', 'notes', 'transcript'],
  'Keys & Keychains': ['key', 'keys', 'keychain', 'fob', 'car key'],
  'Wallets & Purses': ['wallet', 'clutch', 'billfold', 'coin purse'],
  'Student ID Cards': ['id', 'student id', 'campus card', 'badge'],
  'Sports & Fitness Equipment': ['water bottle', 'flask', 'yoga mat', 'gym bag', 'shaker', 'tennis racket', 'basketball'],
  'Eyewear': ['glasses', 'spectacles', 'sunglasses', 'frames']
};

/**
 * Natural language parser that extracts intent, entities, and attributes
 */
function parseNaturalLanguageQuery(queryText) {
  if (!queryText) {
    return { raw: '', extracted: {}, parsedTokens: [] };
  }

  const text = queryText.toLowerCase();
  const extracted = {
    type: null,
    category: null,
    object: null,
    color: null,
    brand: null,
    location: null,
    timeRelative: null,
    keywords: []
  };

  // Determine intent (lost vs found)
  if (text.includes('lost') || text.includes('misplaced') || text.includes('left behind') || text.includes('missing')) {
    extracted.type = 'lost';
  } else if (text.includes('found') || text.includes('picked up') || text.includes('discovered') || text.includes('turned in')) {
    extracted.type = 'found';
  }

  // Extract color
  for (const c of KNOWN_COLORS) {
    const regex = new RegExp(`\\b${c}\\b`, 'i');
    if (regex.test(text)) {
      extracted.color = c;
      break;
    }
  }

  // Extract brand with word boundaries to avoid false positives (e.g. 'hp' in 'headphones')
  for (const b of KNOWN_BRANDS) {
    const regex = new RegExp(`\\b${b.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    if (regex.test(text)) {
      extracted.brand = b;
      break;
    }
  }

  // Extract category and specific object
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      if (regex.test(text)) {
        extracted.category = cat;
        extracted.object = kw;
        break;
      }
    }
    if (extracted.category) break;
  }

  // Extract campus location
  for (const loc of config.CAMPUS_LOCATIONS) {
    const locLower = loc.toLowerCase();
    const parts = locLower.split(/[\/\s]+/);
    for (const part of parts) {
      if (part.length > 3 && new RegExp(`\\b${part}\\b`, 'i').test(text)) {
        extracted.location = loc;
        break;
      }
    }
    if (extracted.location) break;
  }

  // Extract relative time
  if (text.includes('yesterday')) {
    extracted.timeRelative = 'yesterday';
  } else if (text.includes('today')) {
    extracted.timeRelative = 'today';
  } else if (text.includes('last week') || text.includes('this week')) {
    extracted.timeRelative = 'recent';
  }

  const parsedTokens = tokenize(text);
  return {
    raw: queryText,
    extracted,
    parsedTokens
  };
}

/**
 * Searches and ranks items using the parsed semantic query
 */
function semanticSearchItems(db, queryText, filters = {}) {
  const parsed = parseNaturalLanguageQuery(queryText);
  const { extracted } = parsed;

  let query = `
    SELECT i.*, u.full_name as reporter_name, u.role as reporter_role
    FROM items i
    JOIN users u ON i.user_id = u.id
    WHERE i.status NOT IN ('ARCHIVED', 'CLOSED')
  `;
  const params = [];

  // Apply explicit UI filters if provided
  if (filters.type) {
    query += ' AND i.type = ?';
    params.push(filters.type);
  }

  if (filters.category) {
    query += ' AND i.category = ?';
    params.push(filters.category);
  }

  if (filters.location) {
    query += ' AND i.location = ?';
    params.push(filters.location);
  }

  if (filters.status) {
    query += ' AND i.status = ?';
    params.push(filters.status);
  }

  if (filters.brand) {
    query += ' AND LOWER(i.brand) LIKE ?';
    params.push(`%${filters.brand.toLowerCase()}%`);
  }

  const items = db.prepare(query).all(...params);

  // If no query string, return sorted by created_at DESC
  if (!queryText || queryText.trim().length === 0) {
    return {
      results: items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
      nlpInsights: null
    };
  }

  // Rank items against the semantic query
  const scoredItems = items.map(item => {
    let score = 0;

    // 1. Keyword & descriptive match
    const pseudoItem = {
      title: queryText,
      description: queryText,
      brand: extracted.brand || '',
      color: extracted.color || '',
      identifying_marks: ''
    };
    const textScore = calculateTextSimilarity(pseudoItem, item);
    score += textScore * 0.40;

    // 2. Extracted Category match
    if (extracted.category && item.category) {
      if (item.category.toLowerCase() === extracted.category.toLowerCase()) {
        score += 0.25;
      }
    }

    // 3. Extracted Brand match
    if (extracted.brand && item.brand) {
      if (item.brand.toLowerCase().includes(extracted.brand)) {
        score += 0.20;
      }
    }

    // 4. Extracted Color match
    if (extracted.color && item.color) {
      if (item.color.toLowerCase().includes(extracted.color)) {
        score += 0.15;
      }
    }

    // 5. Extracted Location match
    if (extracted.location && item.location) {
      if (item.location.toLowerCase().includes(extracted.location.toLowerCase())) {
        score += 0.15;
      }
    }

    // 6. Direct word substring hits
    const lowerTitle = (item.title || '').toLowerCase();
    const lowerDesc = (item.description || '').toLowerCase();
    for (const token of parsed.parsedTokens) {
      if (lowerTitle.includes(token)) score += 0.10;
      if (lowerDesc.includes(token)) score += 0.05;
    }

    return {
      ...item,
      relevanceScore: Math.round(score * 100) / 100
    };
  });

  // Filter out zero relevance if query is specific, or keep top results
  const filteredResults = scoredItems
    .filter(i => i.relevanceScore > 0.05)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  return {
    results: filteredResults.length > 0 ? filteredResults : items,
    nlpInsights: extracted
  };
}

module.exports = {
  parseNaturalLanguageQuery,
  semanticSearchItems
};
