const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const config = require('../config');

// Registration
exports.register = async (req, res) => {
  try {
    const { email, password, full_name, student_id, phone, department, role, confirm_password, confirmPassword } = req.body;

    // Defense-in-depth: if client passed confirmation field, ensure it matches
    const confirmation = confirmPassword || confirm_password;
    if (confirmation !== undefined && confirmation !== password) {
      return res.status(400).json({ error: 'Passwords do not match. Please ensure both passwords match exactly.' });
    }

    // Immediately purge confirmation fields from memory
    delete req.body.confirmPassword;
    delete req.body.confirm_password;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Please provide full name, email, and password.' });
    }

    const emailNorm = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailNorm)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    // Check existing email
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(emailNorm);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    // Public self-registration always assigns the 'student' role. Admin accounts must be provisioned by administrators.
    const assignedRole = 'student';

    const insert = db.prepare(`
      INSERT INTO users (email, password_hash, full_name, student_id, phone, department, role)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      emailNorm,
      passwordHash,
      full_name.trim(),
      student_id || null,
      phone || null,
      department || null,
      assignedRole
    );

    const user = {
      id: result.lastInsertRowid,
      email: emailNorm,
      full_name: full_name.trim(),
      role: assignedRole,
      student_id: student_id || null,
      phone: phone || null,
      department: department || null
    };

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'Account successfully registered.',
      token,
      user
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error while registering user.' });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password.' });
    }

    const emailNorm = email.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(emailNorm);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.is_suspended) {
      return res.status(403).json({ error: 'This account has been suspended by an administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );

    const safeUser = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      student_id: user.student_id,
      phone: user.phone,
      department: user.department,
      avatar_url: user.avatar_url
    };

    res.json({
      message: 'Authentication successful.',
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error while logging in.' });
  }
};

// Current user profile
exports.getMe = (req, res) => {
  res.json({ user: req.user });
};

// Update profile
exports.updateProfile = (req, res) => {
  try {
    const { full_name, phone, department, student_id } = req.body;

    db.prepare(`
      UPDATE users
      SET full_name = COALESCE(?, full_name),
          phone = COALESCE(?, phone),
          department = COALESCE(?, department),
          student_id = COALESCE(?, student_id),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(full_name, phone, department, student_id, req.user.id);

    const updated = db.prepare('SELECT id, email, full_name, role, student_id, phone, department FROM users WHERE id = ?').get(req.user.id);

    res.json({
      message: 'Profile updated successfully.',
      user: updated
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
};

// Logout (token invalidation)
exports.logout = (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = req.token || (authHeader && authHeader.split(' ')[1]);
    if (token) {
      db.prepare('INSERT OR IGNORE INTO revoked_tokens (token) VALUES (?)').run(token);
    }
    res.json({ message: 'Session logged out and invalidated successfully.' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Failed to process logout.' });
  }
};
