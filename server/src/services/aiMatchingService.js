const config = require('../config');

// Stop words for campus lost & found context
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from',
  'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself',
  'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most',
  'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours',
  'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that',
  'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those',
  'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where',
  'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 'yourself'
]);

// Campus proximity graph (zones close to each other get higher partial proximity)
const CAMPUS_ZONE_ADJACENCY = {
  'Main Library': ['Central Lecture Hall', 'Campus Bookstore', 'Student Union / Cafeteria'],
  'Student Union / Cafeteria': ['Main Library', 'Campus Bookstore', 'North Quad Dormitories'],
  'Science & Engineering Complex': ['Central Lecture Hall', 'East Parking Structure'],
  'Business & Law Hall': ['Central Lecture Hall', 'Main Library'],
  'Athletics Center / Gym': ['North Quad Dormitories', 'East Parking Structure'],
  'North Quad Dormitories': ['Student Union / Cafeteria', 'Athletics Center / Gym'],
  'South Quad Dormitories': ['Health & Wellness Center', 'Main Library'],
  'Central Lecture Hall': ['Main Library', 'Science & Engineering Complex', 'Business & Law Hall'],
  'Campus Bookstore': ['Main Library', 'Student Union / Cafeteria'],
  'East Parking Structure': ['Science & Engineering Complex', 'Athletics Center / Gym'],
  'Health & Wellness Center': ['South Quad Dormitories']
};

// Related categories mapping
const RELATED_CATEGORIES = {
  'Student ID Cards': ['Documents & Cards', 'Wallets & Purses'],
  'Documents & Cards': ['Student ID Cards', 'Wallets & Purses'],
  'Wallets & Purses': ['Bags & Backpacks', 'Accessories & Jewelry', 'Student ID Cards'],
  'Bags & Backpacks': ['Wallets & Purses', 'Clothing & Apparel'],
  'Electronics': ['Accessories & Jewelry'],
  'Accessories & Jewelry': ['Electronics', 'Clothing & Apparel', 'Eyewear'],
  'Clothing & Apparel': ['Accessories & Jewelry'],
  'Books & Notebooks': ['Documents & Cards']
};

/**
 * Tokenize text into normalized tokens and n-grams
 */
function tokenize(text) {
  if (!text) return [];
  const clean = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const words = clean.split(/\s+/).filter(w => w.length > 1 && !STOP_WORDS.has(w));
  
  // Also create bigrams for compound phrases (e.g., 'water bottle', 'airpods pro', 'nike backpack')
  const bigrams = [];
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.push(`${words[i]}_${words[i + 1]}`);
  }
  return [...words, ...bigrams];
}

/**
 * Builds term frequency vector from tokens
 */
function getTermVector(tokens) {
  const vec = {};
  for (const t of tokens) {
    vec[t] = (vec[t] || 0) + 1;
  }
  return vec;
}

/**
 * Computes Cosine Similarity between two term vectors
 */
function cosineSimilarity(vecA, vecB) {
  const keysA = Object.keys(vecA);
  const keysB = Object.keys(vecB);
  if (keysA.length === 0 || keysB.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const k of keysA) {
    const val = vecA[k];
    normA += val * val;
    if (vecB[k]) {
      dotProduct += val * vecB[k];
    }
  }

  for (const k of keysB) {
    const val = vecB[k];
    normB += val * val;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Calculate Text Similarity across all descriptive fields
 */
function calculateTextSimilarity(itemA, itemB) {
  // Aggregate text sources
  const textA = [
    itemA.title,
    itemA.description,
    itemA.brand,
    itemA.color,
    itemA.identifying_marks
  ].filter(Boolean).join(' ');

  const textB = [
    itemB.title,
    itemB.description,
    itemB.brand,
    itemB.color,
    itemB.identifying_marks
  ].filter(Boolean).join(' ');

  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);

  const vecA = getTermVector(tokensA);
  const vecB = getTermVector(tokensB);

  let score = cosineSimilarity(vecA, vecB);

  // Bonus for explicit matching Brand (case-insensitive)
  if (itemA.brand && itemB.brand) {
    const brandA = itemA.brand.trim().toLowerCase();
    const brandB = itemB.brand.trim().toLowerCase();
    if (brandA === brandB) {
      score = Math.min(1, score + 0.15);
    } else if (brandA.includes(brandB) || brandB.includes(brandA)) {
      score = Math.min(1, score + 0.08);
    }
  }

  // Bonus for explicit matching Color
  if (itemA.color && itemB.color) {
    const colorA = itemA.color.trim().toLowerCase();
    const colorB = itemB.color.trim().toLowerCase();
    if (colorA === colorB) {
      score = Math.min(1, score + 0.12);
    } else if (colorA.includes(colorB) || colorB.includes(colorA)) {
      score = Math.min(1, score + 0.06);
    }
  }

  return Math.min(1, Math.max(0, score));
}

/**
 * Calculate Location Proximity Score
 */
function calculateLocationSimilarity(locA, locB) {
  if (!locA || !locB) return 0.5; // neutral if missing
  const a = locA.trim().toLowerCase();
  const b = locB.trim().toLowerCase();

  if (a === b) return 1.0;

  // Check if string containment occurs (e.g. "Library 3rd floor" vs "Main Library")
  if (a.includes(b) || b.includes(a)) return 0.9;

  // Check graph adjacency
  const adjA = CAMPUS_ZONE_ADJACENCY[locA] || [];
  if (adjA.includes(locB)) return 0.75;

  const adjB = CAMPUS_ZONE_ADJACENCY[locB] || [];
  if (adjB.includes(locA)) return 0.75;

  // Default campus distance
  return 0.25;
}

/**
 * Calculate Date Proximity Score (Exponential decay)
 * Lost date and found date should logically align (found after or around lost date)
 */
function calculateDateSimilarity(dateStrA, dateStrB) {
  if (!dateStrA || !dateStrB) return 0.5;

  const dateA = new Date(dateStrA);
  const dateB = new Date(dateStrB);

  if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0.5;

  const diffMs = Math.abs(dateA.getTime() - dateB.getTime());
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays <= 1) return 1.0;
  if (diffDays <= 3) return 0.90;
  if (diffDays <= 7) return 0.75;
  if (diffDays <= 14) return 0.55;
  if (diffDays <= 30) return 0.35;
  return 0.15;
}

/**
 * Calculate Category Similarity
 */
function calculateCategorySimilarity(catA, catB) {
  if (!catA || !catB) return 0.3;
  if (catA.toLowerCase() === catB.toLowerCase()) return 1.0;

  const related = RELATED_CATEGORIES[catA] || [];
  if (related.includes(catB)) return 0.6;

  return 0.0;
}

/**
 * Calculate image similarity using stored feature vectors (byte-distribution histogram + color heuristic)
 * or fallback visual attribute correlation.
 * NOTE: This is a deterministic heuristic comparing byte-level distributions and declared color traits;
 * it is not a deep neural network or semantic computer-vision model.
 */
function calculateImageSimilarity(itemA, itemB) {
  // If image feature vectors are stored (JSON array of byte histograms + color flags)
  if (itemA.image_features && itemB.image_features) {
    try {
      const featA = typeof itemA.image_features === 'string' ? JSON.parse(itemA.image_features) : itemA.image_features;
      const featB = typeof itemB.image_features === 'string' ? JSON.parse(itemB.image_features) : itemB.image_features;

      if (Array.isArray(featA) && Array.isArray(featB) && featA.length === featB.length) {
        let dot = 0, normA = 0, normB = 0;
        for (let i = 0; i < featA.length; i++) {
          dot += featA[i] * featB[i];
          normA += featA[i] * featA[i];
          normB += featB[i] * featB[i];
        }
        if (normA > 0 && normB > 0) {
          const sim = dot / (Math.sqrt(normA) * Math.sqrt(normB));
          return Math.min(1, Math.max(0, sim));
        }
      }
    } catch (e) {
      // Fallback
    }
  }

  // If both have images but no raw embeddings, correlate visual attributes (color, type)
  if (itemA.primary_image && itemB.primary_image) {
    let visualScore = 0.6;
    if (itemA.color && itemB.color && itemA.color.toLowerCase() === itemB.color.toLowerCase()) {
      visualScore += 0.25;
    }
    return Math.min(0.95, visualScore);
  }

  // If one or neither has an image, return neutral score
  return 0.5;
}

/**
 * Compute composite match score with full breakdown
 */
function calculateItemMatch(lostItem, foundItem) {
  const textScore = calculateTextSimilarity(lostItem, foundItem);
  const locationScore = calculateLocationSimilarity(lostItem.location, foundItem.location);
  const dateScore = calculateDateSimilarity(lostItem.date_lost_or_found, foundItem.date_lost_or_found);
  const categoryScore = calculateCategorySimilarity(lostItem.category, foundItem.category);
  const imageScore = calculateImageSimilarity(lostItem, foundItem);

  const {
    TEXT_WEIGHT,
    IMAGE_WEIGHT,
    LOCATION_WEIGHT,
    DATE_WEIGHT,
    CATEGORY_WEIGHT
  } = config.AI_CONFIG;

  // If neither item has an image, dynamically reweight without penalizing
  let overallScore = 0;
  if (!lostItem.primary_image && !foundItem.primary_image) {
    const nonImageWeight = TEXT_WEIGHT + LOCATION_WEIGHT + DATE_WEIGHT + CATEGORY_WEIGHT;
    overallScore = (
      textScore * (TEXT_WEIGHT / nonImageWeight) +
      locationScore * (LOCATION_WEIGHT / nonImageWeight) +
      dateScore * (DATE_WEIGHT / nonImageWeight) +
      categoryScore * (CATEGORY_WEIGHT / nonImageWeight)
    );
  } else {
    overallScore = (
      textScore * TEXT_WEIGHT +
      imageScore * IMAGE_WEIGHT +
      locationScore * LOCATION_WEIGHT +
      dateScore * DATE_WEIGHT +
      categoryScore * CATEGORY_WEIGHT
    );
  }

  // Category mismatch heavily dampens overall score unless text is exceptionally strong
  if (categoryScore === 0) {
    overallScore *= 0.55;
  }

  overallScore = Math.min(1, Math.max(0, overallScore));

  return {
    overallScore: Math.round(overallScore * 100) / 100,
    textScore: Math.round(textScore * 100) / 100,
    imageScore: Math.round(imageScore * 100) / 100,
    locationScore: Math.round(locationScore * 100) / 100,
    dateScore: Math.round(dateScore * 100) / 100,
    categoryScore: Math.round(categoryScore * 100) / 100
  };
}

/**
 * Run matching pipeline for an item against opposing items in database
 */
function runMatchingPipeline(db, itemId, notificationService) {
  const currentItem = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId);
  if (!currentItem) return [];

  const opposingType = currentItem.type === 'lost' ? 'found' : 'lost';
  const candidates = db.prepare(`
    SELECT * FROM items 
    WHERE type = ? 
    AND status NOT IN ('RETURNED', 'CLOSED', 'ARCHIVED', 'REJECTED')
  `).all(opposingType);

  const results = [];
  const minThreshold = config.AI_CONFIG.MIN_MATCH_THRESHOLD;

  const insertOrUpdateMatch = db.prepare(`
    INSERT INTO matches (
      lost_item_id, found_item_id, overall_score, 
      text_score, image_score, location_score, date_score, category_score, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SUGGESTED')
    ON CONFLICT(lost_item_id, found_item_id) DO UPDATE SET
      overall_score = excluded.overall_score,
      text_score = excluded.text_score,
      image_score = excluded.image_score,
      location_score = excluded.location_score,
      date_score = excluded.date_score,
      category_score = excluded.category_score,
      updated_at = CURRENT_TIMESTAMP
  `);

  const updateItemStatus = db.prepare("UPDATE items SET status = 'POTENTIAL_MATCH' WHERE id = ?");

  const matchesToSave = [];

  for (const candidate of candidates) {
    const lostItem = currentItem.type === 'lost' ? currentItem : candidate;
    const foundItem = currentItem.type === 'found' ? currentItem : candidate;

    const breakdown = calculateItemMatch(lostItem, foundItem);

    if (breakdown.overallScore >= minThreshold) {
      matchesToSave.push({
        lostItem,
        foundItem,
        breakdown,
        candidate
      });
    }
  }

  if (matchesToSave.length > 0) {
    const saveMatchesTx = db.transaction((items) => {
      for (const m of items) {
        insertOrUpdateMatch.run(
          m.lostItem.id,
          m.foundItem.id,
          m.breakdown.overallScore,
          m.breakdown.textScore,
          m.breakdown.imageScore,
          m.breakdown.locationScore,
          m.breakdown.dateScore,
          m.breakdown.categoryScore
        );

        if (m.lostItem.status === 'LOST') {
          updateItemStatus.run(m.lostItem.id);
          m.lostItem.status = 'POTENTIAL_MATCH';
        }
        if (m.foundItem.status === 'FOUND') {
          updateItemStatus.run(m.foundItem.id);
          m.foundItem.status = 'POTENTIAL_MATCH';
        }
      }
    });

    saveMatchesTx(matchesToSave);

    for (const m of matchesToSave) {
      if (notificationService) {
        notificationService.createMatchNotification(db, m.lostItem, m.foundItem, m.breakdown.overallScore);
      }
      results.push({
        candidate: m.candidate,
        breakdown: m.breakdown
      });
    }
  }

  // Sort descending by overall match confidence
  results.sort((a, b) => b.breakdown.overallScore - a.breakdown.overallScore);
  return results;
}

module.exports = {
  tokenize,
  calculateTextSimilarity,
  calculateLocationSimilarity,
  calculateDateSimilarity,
  calculateCategorySimilarity,
  calculateImageSimilarity,
  calculateItemMatch,
  runMatchingPipeline
};
