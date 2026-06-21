/**
 * Storage layer with two interchangeable drivers:
 *   - MongoDB  (used when MONGODB_URI is set)  -> production / hosted
 *   - JSON file store (fallback)               -> local dev, runs with zero setup
 *
 * Both expose the same async API:
 *   insert(collection, doc)            -> doc (with id + createdAt)
 *   list(collection)                   -> array of all docs
 *   getById(collection, id)            -> doc | null
 *   update(collection, id, patch)      -> doc | null
 *   count(collection)                  -> number
 *
 * Filtering / sorting / pagination is done in the API layer (server.js) so the
 * behaviour is identical regardless of driver. Church-scale volume makes this
 * simple and reliable.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.MONGODB_DB || 'messianic_movement';

const COLLECTIONS = ['registrations', 'orders', 'expenses'];

function newId() {
  return crypto.randomBytes(12).toString('hex');
}

/* ----------------------------- JSON file driver ---------------------------- */
const DATA_DIR = path.join(__dirname, '..', 'data');

function jsonFile(collection) {
  return path.join(DATA_DIR, `${collection}.json`);
}

function jsonReadAll(collection) {
  try {
    return JSON.parse(fs.readFileSync(jsonFile(collection), 'utf8') || '[]');
  } catch (e) {
    return [];
  }
}

function jsonWriteAll(collection, arr) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(jsonFile(collection), JSON.stringify(arr, null, 2), 'utf8');
}

const jsonDriver = {
  kind: 'json',
  async init() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    for (const c of COLLECTIONS) {
      if (!fs.existsSync(jsonFile(c))) jsonWriteAll(c, []);
    }
  },
  async insert(collection, doc) {
    const arr = jsonReadAll(collection);
    const record = { id: doc.id || newId(), createdAt: doc.createdAt || new Date().toISOString(), ...doc };
    arr.push(record);
    jsonWriteAll(collection, arr);
    return record;
  },
  async list(collection) {
    return jsonReadAll(collection);
  },
  async getById(collection, id) {
    return jsonReadAll(collection).find((r) => r.id === id) || null;
  },
  async update(collection, id, patch) {
    const arr = jsonReadAll(collection);
    const i = arr.findIndex((r) => r.id === id);
    if (i === -1) return null;
    arr[i] = { ...arr[i], ...patch };
    jsonWriteAll(collection, arr);
    return arr[i];
  },
  async count(collection) {
    return jsonReadAll(collection).length;
  },
};

/* ------------------------------ MongoDB driver ----------------------------- */
let mongoClient = null;
let mongoDb = null;

function makeMongoDriver() {
  return {
    kind: 'mongo',
    async init() {
      const { MongoClient } = require('mongodb');
      mongoClient = new MongoClient(MONGODB_URI);
      await mongoClient.connect();
      mongoDb = mongoClient.db(DB_NAME);
    },
    async insert(collection, doc) {
      const record = { id: doc.id || newId(), createdAt: doc.createdAt || new Date().toISOString(), ...doc };
      await mongoDb.collection(collection).insertOne({ ...record });
      return record;
    },
    async list(collection) {
      return mongoDb.collection(collection).find({}, { projection: { _id: 0 } }).toArray();
    },
    async getById(collection, id) {
      return mongoDb.collection(collection).findOne({ id }, { projection: { _id: 0 } });
    },
    async update(collection, id, patch) {
      await mongoDb.collection(collection).updateOne({ id }, { $set: patch });
      return this.getById(collection, id);
    },
    async count(collection) {
      return mongoDb.collection(collection).countDocuments();
    },
  };
}

/* --------------------------------- selector -------------------------------- */
let driver = null;

async function getDb() {
  if (driver) return driver;
  if (MONGODB_URI) {
    try {
      driver = makeMongoDriver();
      await driver.init();
      console.log('[db] Connected to MongoDB');
    } catch (e) {
      console.error('[db] MongoDB connection failed, falling back to JSON files:', e.message);
      driver = jsonDriver;
      await driver.init();
    }
  } else {
    driver = jsonDriver;
    await driver.init();
    console.log('[db] Using local JSON file store (set MONGODB_URI to use a hosted database)');
  }
  return driver;
}

module.exports = { getDb, newId, COLLECTIONS };
