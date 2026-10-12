const db = require('../db/database');
const config = require('../config');
const { runMatchingPipeline } = require('../services/aiMatchingService');
const { semanticSearchItems } = require('../services/aiSearchService');
const { checkForDuplicates } = require('../services/duplicateService');
const { generateItemQRCode } = require('../services/qrService');
const notificationService = require('../services/notificationService');

// Check for duplicates before creation
exports.checkDuplicate = (req, res) => {
  try {
    const { type, category, title, description, brand, color, location } = req.body;

    if (!type || !title) {
      return res.json({ hasDuplicates: false, candidates: [] });
    }

    const candidates = checkForDuplicates(db, {
      type,
      category,
      title,
      description,
      brand,
      color,
      location
    });

    res.json({
      hasDuplicates: candidates.length > 0,
      candidates: candidates.slice(0, 3) // Top 3 potential duplicates
    });
  } catch (err) {
    console.error('Duplicate check error:', err);
    res.status(500).json({ error: 'Failed to evaluate potential duplicates.' });
  }
};

// Create a new Lost or Found item
exports.createItem = async (req, res) => {
  try {
    const {
      type,
      title,
      category,
      description,
      brand,
      color,
      identifying_marks,
      location,
      campus_zone,
      date_lost_or_found,
      time_lost_or_found,
      current_storage_location,
      bypass_duplicate_warning
    } = req.body;

    if (!type || !['lost', 'found'].includes(type)) {
      return res.status(400).json({ error: 'Item type must be either "lost" or "found".' });
    }

    if (!title || !category || !description || !location || !date_lost_or_found) {
      return res.status(400).json({ error: 'Title, category, description, location, and date are required.' });
    }

    // Duplicate check if not bypassed
    if (!bypass_duplicate_warning) {
      const duplicates = checkForDuplicates(db, {
        type, category, title, description, brand, color, location
      });
      if (duplicates.length > 0) {
        return res.status(409).json({
          warning: 'A similar report already exists.',
          potentialDuplicates: duplicates.slice(0, 3)
        });
      }
    }

    let primary_image = null;
    let image_features = null;
    if (req.file) {
      primary_image = `/uploads/${req.file.filename}`;
      // Simulate/extract basic color/visual hash vector for AI image matching
      const simVector = [
        Math.random(), Math.random(), Math.random(), Math.random(),
        (color && color.toLowerCase() === 'black') ? 0.9 : 0.2
      ];
      image_features = JSON.stringify(simVector);
    }

    const initialStatus = type === 'lost' ? 'LOST' : 'FOUND';

    const insertStmt = db.prepare(`
      INSERT INTO items (
        user_id, type, title, category, description, brand, color,
        identifying_marks, location, campus_zone, date_lost_or_found,
        time_lost_or_found, current_storage_location, status,
        primary_image, image_features
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      req.user.id,
      type,
      title.trim(),
      category,
      description.trim(),
      brand ? brand.trim() : null,
      color ? color.trim() : null,
      identifying_marks ? identifying_marks.trim() : null,
      location,
      campus_zone || location,
      date_lost_or_found,
      time_lost_or_found || null,
      current_storage_location || null,
      initialStatus,
      primary_image,
      image_features
    );

    const newItemId = result.lastInsertRowid;

    // If found item, generate QR code tracking token
    if (type === 'found') {
      const qrData = await generateItemQRCode(newItemId);
      if (qrData) {
        db.prepare('UPDATE items SET qr_code_token = ? WHERE id = ?').run(qrData.token, newItemId);
      }
    }

    // Run AI Matching Pipeline against existing opposing items
    const matchesFound = runMatchingPipeline(db, newItemId, notificationService);

    // Fetch created item
    const createdItem = db.prepare('SELECT * FROM items WHERE id = ?').get(newItemId);

    res.status(201).json({
      message: `Successfully reported ${type} item.`,
      item: createdItem,
      matchesDetectedCount: matchesFound.length,
      matches: matchesFound.slice(0, 5)
    });
  } catch (err) {
    console.error('Create item error:', err);
    res.status(500).json({ error: 'Internal server error while reporting item.' });
  }
};

// Get items with search, filters, and natural language semantic parsing
exports.getItems = (req, res) => {
  try {
    const {
      q,
      type,
      category,
      location,
      status,
      brand,
      sort,
      page = 1,
      limit = 20
    } = req.query;

    let itemsResult = [];
    let nlpInsights = null;

    if (q && q.trim().length > 0) {
      // Use Semantic Natural Language AI Search
      const searchResult = semanticSearchItems(db, q.trim(), {
        type,
        category,
        location,
        status
      });
      itemsResult = searchResult.results;
      nlpInsights = searchResult.nlpInsights;
    } else {
      // Standard parameterized query
      let query = `
        SELECT i.*, u.full_name as reporter_name, u.role as reporter_role
        FROM items i
        JOIN users u ON i.user_id = u.id
        WHERE i.status NOT IN ('ARCHIVED', 'CLOSED')
      `;
      const params = [];

      if (type) {
        query += ' AND i.type = ?';
        params.push(type);
      }
      if (category) {
        query += ' AND i.category = ?';
        params.push(category);
      }
      if (location) {
        query += ' AND i.location = ?';
        params.push(location);
      }
      if (status) {
        query += ' AND i.status = ?';
        params.push(status);
      }
      if (brand) {
        query += ' AND LOWER(i.brand) LIKE ?';
        params.push(`%${brand.toLowerCase()}%`);
      }

      // Sort
      if (sort === 'oldest') {
        query += ' ORDER BY i.created_at ASC';
      } else if (sort === 'date_event') {
        query += ' ORDER BY i.date_lost_or_found DESC';
      } else {
        query += ' ORDER BY i.created_at DESC';
      }

      itemsResult = db.prepare(query).all(...params);
    }

    // Privacy protection for public search lists: do not leak raw student IDs or phones
    const sanitizedItems = itemsResult.map(item => ({
      ...item,
      reporter_name: item.reporter_name || 'Campus Member',
      // Hide identifying marks for found items so claim verification remains fair & un-spoofed!
      identifying_marks: (item.type === 'found' && (!req.user || (req.user.id !== item.user_id && req.user.role !== 'admin')))
        ? '[Protected for ownership verification]'
        : item.identifying_marks
    }));

    // Pagination
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const totalCount = sanitizedItems.length;
    const paginated = sanitizedItems.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({
      total: totalCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      items: paginated,
      nlpInsights
    });
  } catch (err) {
    console.error('Get items error:', err);
    res.status(500).json({ error: 'Failed to retrieve items.' });
  }
};

// Get single item by ID
exports.getItemById = (req, res) => {
  try {
    const { id } = req.params;
    const item = db.prepare(`
      SELECT i.*, u.full_name as reporter_name, u.role as reporter_role, u.department as reporter_dept
      FROM items i
      JOIN users u ON i.user_id = u.id
      WHERE i.id = ?
    `).get(id);

    if (!item) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    // Increment views
    db.prepare('UPDATE items SET views_count = views_count + 1 WHERE id = ?').run(id);

    // Is viewer the reporter or admin?
    const isOwnerOrAdmin = req.user && (req.user.id === item.user_id || req.user.role === 'admin');

    // Protect sensitive verification marks on found items
    const displayItem = {
      ...item,
      views_count: item.views_count + 1,
      identifying_marks: (item.type === 'found' && !isOwnerOrAdmin)
        ? '[Hidden for ownership verification. Claimants will be prompted for this during verification.]'
        : item.identifying_marks
    };

    // Fetch AI Matches for this item
    const matchesQuery = item.type === 'lost'
      ? `
        SELECT m.*, i.id as matched_item_id, i.title, i.category, i.location, 
               i.date_lost_or_found, i.primary_image, i.brand, i.color, i.status as matched_status
        FROM matches m
        JOIN items i ON m.found_item_id = i.id
        WHERE m.lost_item_id = ?
        ORDER BY m.overall_score DESC
      `
      : `
        SELECT m.*, i.id as matched_item_id, i.title, i.category, i.location, 
               i.date_lost_or_found, i.primary_image, i.brand, i.color, i.status as matched_status
        FROM matches m
        JOIN items i ON m.lost_item_id = i.id
        WHERE m.found_item_id = ?
        ORDER BY m.overall_score DESC
      `;
    
    const matches = db.prepare(matchesQuery).all(id);

    // Fetch Claims: Admin sees all fields; claimant sees their own; finder only sees public statement
    let claims = [];
    const isAdmin = req.user && req.user.role === 'admin';
    const isReporter = req.user && req.user.id === item.user_id;

    if (isAdmin) {
      claims = db.prepare(`
        SELECT c.*, u.full_name as claimant_name, u.email as claimant_email, u.student_id as claimant_student_id
        FROM claims c
        JOIN users u ON c.claimant_id = u.id
        WHERE c.item_id = ?
        ORDER BY c.created_at DESC
      `).all(id);
    } else if (isReporter) {
      // Item reporter/finder sees claims without private verification answers or student IDs
      const rawClaims = db.prepare(`
        SELECT c.id, c.item_id, c.proof_description, c.status, c.created_at, u.full_name as claimant_name
        FROM claims c
        JOIN users u ON c.claimant_id = u.id
        WHERE c.item_id = ?
        ORDER BY c.created_at DESC
      `).all(id);
      claims = rawClaims.map(c => ({
        ...c,
        hidden_marks_answers: '[Protected - Verified by Campus Administration]',
        secret_contents: '[Protected - Verified by Campus Administration]',
        receipt_image: null
      }));
    } else if (req.user) {
      // Claimant viewing their own claim
      claims = db.prepare(`
        SELECT c.*, u.full_name as claimant_name
        FROM claims c
        JOIN users u ON c.claimant_id = u.id
        WHERE c.item_id = ? AND c.claimant_id = ?
      `).all(id, req.user.id);
    }

    res.json({
      item: displayItem,
      matches,
      claims,
      isOwner: req.user ? req.user.id === item.user_id : false,
      isAdmin
    });
  } catch (err) {
    console.error('Get item by ID error:', err);
    res.status(500).json({ error: 'Failed to retrieve item details.' });
  }
};

// Update item (Owner or Admin)
exports.updateItem = (req, res) => {
  try {
    const { id } = req.params;
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id);

    if (!item) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    if (item.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You are not authorized to modify this item report.' });
    }

    const {
      title,
      category,
      description,
      brand,
      color,
      identifying_marks,
      location,
      date_lost_or_found,
      status,
      current_storage_location
    } = req.body;

    let primary_image = item.primary_image;
    if (req.file) {
      primary_image = `/uploads/${req.file.filename}`;
    }

    db.prepare(`
      UPDATE items
      SET title = COALESCE(?, title),
          category = COALESCE(?, category),
          description = COALESCE(?, description),
          brand = COALESCE(?, brand),
          color = COALESCE(?, color),
          identifying_marks = COALESCE(?, identifying_marks),
          location = COALESCE(?, location),
          date_lost_or_found = COALESCE(?, date_lost_or_found),
          status = COALESCE(?, status),
          current_storage_location = COALESCE(?, current_storage_location),
          primary_image = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title,
      category,
      description,
      brand,
      color,
      identifying_marks,
      location,
      date_lost_or_found,
      status,
      current_storage_location,
      primary_image,
      id
    );

    // Re-run matching pipeline if descriptive fields or status updated
    runMatchingPipeline(db, id, notificationService);

    const updated = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
    res.json({
      message: 'Item updated successfully.',
      item: updated
    });
  } catch (err) {
    console.error('Update item error:', err);
    res.status(500).json({ error: 'Failed to update item.' });
  }
};

// Delete item (Owner or Admin)
exports.deleteItem = (req, res) => {
  try {
    const { id } = req.params;
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(id);

    if (!item) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    if (item.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You are not authorized to delete this item report.' });
    }

    db.prepare('DELETE FROM items WHERE id = ?').run(id);

    res.json({ message: 'Item report deleted successfully.' });
  } catch (err) {
    console.error('Delete item error:', err);
    res.status(500).json({ error: 'Failed to delete item.' });
  }
};

// Get QR Code for Found Item
exports.getItemQRCode = async (req, res) => {
  try {
    const { id } = req.params;
    const item = db.prepare('SELECT id, title, type, qr_code_token FROM items WHERE id = ?').get(id);

    if (!item) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    let reqOrigin = req.get('origin');
    if (!reqOrigin && req.get('referer')) {
      try {
        reqOrigin = new URL(req.get('referer')).origin;
      } catch (e) {}
    }
    const baseUrl = process.env.CLIENT_URL || reqOrigin || config.CLIENT_URL || 'http://localhost:4173';
    const qrResult = await generateItemQRCode(item.id, baseUrl);
    res.json(qrResult);
  } catch (err) {
    console.error('QR code error:', err);
    res.status(500).json({ error: 'Failed to generate QR code.' });
  }
};
