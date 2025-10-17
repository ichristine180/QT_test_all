import db from '../config/database.js';
import bcrypt from 'bcrypt';

class User {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Object} Created user (without password)
   */
  static create({ email, password, role = 'user', status = 'active', emailHash = null, emailSignature = null }) {
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      const stmt = db.prepare(`
        INSERT INTO users (email, password, role, status, emailHash, emailSignature)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const result = stmt.run(email, hashedPassword, role, status, emailHash, emailSignature);

      return this.findById(result.lastInsertRowid);
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Email already exists');
      }
      throw error;
    }
  }

  /**
   * Find user by ID
   * @param {number} id - User ID
   * @returns {Object|null} User object without password
   */
  static findById(id) {
    const stmt = db.prepare(`
      SELECT id, email, role, status, createdAt, emailHash, emailSignature
      FROM users
      WHERE id = ?
    `);

    return stmt.get(id) || null;
  }

  /**
   * Find user by email (includes password for authentication)
   * @param {string} email - User email
   * @returns {Object|null} User object with password
   */
  static findByEmailWithPassword(email) {
    const stmt = db.prepare(`
      SELECT id, email, password, role, status, createdAt
      FROM users
      WHERE email = ?
    `);

    return stmt.get(email) || null;
  }

  /**
   * Find user by email (without password)
   * @param {string} email - User email
   * @returns {Object|null} User object without password
   */
  static findByEmail(email) {
    const stmt = db.prepare(`
      SELECT id, email, role, status, createdAt, emailHash, emailSignature
      FROM users
      WHERE email = ?
    `);

    return stmt.get(email) || null;
  }

  /**
   * Get all users with optional filtering
   * @param {Object} filters - Optional filters (status, role)
   * @returns {Array} Array of users
   */
  static findAll(filters = {}) {
    let query = `SELECT id, email, role, status, createdAt, emailHash, emailSignature FROM users WHERE 1=1`;
    const params = [];

    if (filters.status) {
      query += ` AND status = ?`;
      params.push(filters.status);
    }

    if (filters.role) {
      query += ` AND role = ?`;
      params.push(filters.role);
    }

    query += ` ORDER BY createdAt DESC`;

    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  /**
   * Update user
   * @param {number} id - User ID
   * @param {Object} updates - Fields to update
   * @returns {Object|null} Updated user
   */
  static update(id, updates) {
    const allowedFields = ['email', 'role', 'status', 'password', 'emailHash', 'emailSignature'];
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        if (key === 'password') {
          fields.push(`${key} = ?`);
          values.push(bcrypt.hashSync(value, 10));
        } else {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      }
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    try {
      const stmt = db.prepare(`
        UPDATE users
        SET ${fields.join(', ')}
        WHERE id = ?
      `);

      stmt.run(...values);
      return this.findById(id);
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('Email already exists');
      }
      throw error;
    }
  }

  /**
   * Delete user
   * @param {number} id - User ID
   * @returns {boolean} True if deleted
   */
  static delete(id) {
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Verify password
   * @param {string} plainPassword - Plain text password
   * @param {string} hashedPassword - Hashed password
   * @returns {boolean} True if password matches
   */
  static verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compareSync(plainPassword, hashedPassword);
  }

  /**
   * Count users
   * @returns {number} Total number of users
   */
  static count() {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM users');
    return stmt.get().count;
  }


  static getCreationStats(days = 7) {
    // Get users created in the last N days
    const stmt = db.prepare(`
      SELECT DATE(createdAt) as date, COUNT(*) as count
      FROM users
      WHERE createdAt >= datetime('now', '-${days} days')
      GROUP BY DATE(createdAt)
      ORDER BY date ASC
    `);

    const results = stmt.all();

    // Create a map of existing data
    const dataMap = new Map();
    results.forEach(row => {
      dataMap.set(row.date, row.count);
    });
    const stats = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      stats.push({
        date: dateStr,
        count: dataMap.get(dateStr) || 0
      });
    }

    return stats;
  }
}

export default User;
