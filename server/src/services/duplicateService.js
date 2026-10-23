const config = require('../config');
const { calculateTextSimilarity, calculateLocationSimilarity } = require('./aiMatchingService');

/**
 * Check for potential duplicate reports of the same type before creating
 */
function checkForDuplicates(db, candidateItem) {
  const { type, category, title, description, brand, color, location } = candidateItem;

  // Query active unresolved items of the same type across a 180-day window (full academic semester),
  // and do not hard-filter by category so items with slightly different or 'Other' categories
  // are evaluated fairly via categorySim weighting (25% weight).
  const query = `
    SELECT * FROM items
    WHERE type = ? 
    AND status NOT IN ('RETURNED', 'CLOSED', 'ARCHIVED', 'REJECTED')
    AND (created_at >= datetime('now', '-180 days') OR status IN ('LOST', 'FOUND'))
    ORDER BY created_at DESC
    LIMIT 250
  `;
  const existingItems = db.prepare(query).all(type);

  const duplicateCandidates = [];
  const threshold = config.AI_CONFIG.DUPLICATE_THRESHOLD || 0.75;

  for (const item of existingItems) {
    // 1. Text similarity
    const textSim = calculateTextSimilarity(candidateItem, item);

    // 2. Category match: exact match = 1.0, generic 'Other' = 0.5,
    // or strong text/location correlation compensation when user miscategorized
    let categorySim = 0.0;
    if (item.category && category && item.category.toLowerCase() === category.toLowerCase()) {
      categorySim = 1.0;
    } else if (item.category === 'Other' || category === 'Other' || !item.category || !category) {
      categorySim = 0.5;
    }

    // 3. Location match
    const locSim = calculateLocationSimilarity(location, item.location);

    // If text and location are nearly identical (e.g. same brand, model, room), compensate for user miscategorization
    if (categorySim === 0.0 && textSim >= 0.90 && locSim >= 0.80) {
      categorySim = 0.40;
    }

    // Overall duplicate confidence
    const duplicateScore = (textSim * 0.55) + (categorySim * 0.25) + (locSim * 0.20);

    if (duplicateScore >= threshold) {
      duplicateCandidates.push({
        item,
        similarityScore: Math.round(duplicateScore * 100) / 100,
        textScore: Math.round(textSim * 100) / 100
      });
    }
  }

  duplicateCandidates.sort((a, b) => b.similarityScore - a.similarityScore);
  return duplicateCandidates;
}

module.exports = {
  checkForDuplicates
};
