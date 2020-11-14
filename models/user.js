/** User class for message.ly */
const { SECRET_KEY, BCRYPT_WORK_FACTOR } = require('../config');
const bcrypt = require('bcrypt');
const db = require('../db');


/** User of the site. */

class User {

  /** register new user -- returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({ username, password, first_name, last_name, phone }) { 
    const hashedPw = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);
    await db.query(`
      INSERT INTO users (username, password, first_name, last_name, phone, join_at, last_login_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW());
      `, [username, hashedPw, first_name, last_name, phone])
    return { username, password, first_name, last_name, phone };
  }

  /** Authenticate: is this username/password valid? Returns boolean. */

  static async authenticate(username, password) { 
    const { rows: [user] } = await db.query(`
      SELECT password
      FROM users
      WHERE username = $1;
    `, [username]);
    if (user && await bcrypt.compare(password, user.password))
      return true;
    return false;
  }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) { 
    await db.query(`
      UPDATE users
      SET last_login_at = NOW()
      WHERE username = $1
    `, [username]);
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name, phone}, ...] */

  static async all() { 
    const { rows: users } = await db.query(`
      SELECT username, first_name, last_name, phone
      FROM users;
    `);
    return users;
  }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) { 
    const { rows: [user] } = await db.query(`
      SELECT username, first_name, last_name, phone, join_at, last_login_at
      FROM users
      WHERE username = $1;
    `, [username]);
    return user || null;
  }

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) { 
    const { rows: messages } = await db.query(`
      SELECT m.id, m.body, m.sent_at, m.read_at, 
        json_build_object(
          'username', u.username, 
          'first_name', u.first_name, 
          'last_name', u.last_name, 
          'phone', u.phone
        ) AS to_user
      FROM messages m
      JOIN users u
      ON m.to_username = u.username
      WHERE m.from_username = $1;
    `, [username]);
    return messages;
  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {id, first_name, last_name, phone}
   */

  static async messagesTo(username) { 
    const { rows: messages } = await db.query(`
      SELECT m.id, m.body, m.sent_at, m.read_at, 
        json_build_object(
          'username', u.username, 
          'first_name', u.first_name, 
          'last_name', u.last_name, 
          'phone', u.phone
        ) AS from_user
      FROM messages m
      JOIN users u
      ON m.from_username = u.username
      WHERE m.to_username = $1;
    `, [username]);
    return messages;
  }
}


module.exports = User;