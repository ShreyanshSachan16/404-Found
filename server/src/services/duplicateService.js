const config = require('../config');
const { calculateTextSimilarity, calculateLocationSimilarity } = require('./aiMatchingService');

/**
 * Check for potential duplicate reports of the same type before creating
 */
function checkForDuplicates(db, candidateItem) {
  const { type, category, title, description, brand, color, location } = candidateItem;

  // Search items of the same type and category created in the last 60 days
  const existingItems = db.prepare(`
    SELECT * FROM items
    WHERE type = ? 
    AND status NOT IN ('RETURNED', 'CLOSED', 'ARCHIVED', 'REJECTED')
  `).all(type);

  const duplicateCandidates = [];
  const threshold = config.AI_CONFIG.DUPLICATE_THRESHOLD || 0.75;

  for (const item of existingItems) {
    // 1. Text similarity
    const textSim = calculateTextSimilarity(candidateItem, item);

    // 2. Category match
    const categorySim = (item.category === category) ? 1.0 : 0.0;

    // 3. Location match
    const locSim = calculateLocationSimilarity(location, item.location);

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
