import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";

const url = process.env.MONGODB_URI || "mongodb://localhost:27017/torneio_sumo";
let client = null;
let db = null;

// Mock DB implementation for local development fallback
class MockCollection {
  constructor(name) {
    this.name = name;
    this.data = [];
  }

  async createIndex(keys, options) {
    console.log(`Mock DB: created index on ${this.name}`);
    return "mock-index";
  }

  find(query = {}) {
    let results = this.data;
    // Simple query filtering (matching top-level fields)
    for (const key in query) {
      results = results.filter(item => {
        if (key === "_id") {
          return String(item._id) === String(query._id);
        }
        return item[key] === query[key];
      });
    }
    return {
      toArray: async () => results
    };
  }

  async findOne(query = {}) {
    const arr = await (await this.find(query)).toArray();
    return arr[0] || null;
  }

  async insertOne(doc) {
    const newDoc = { _id: doc._id || new ObjectId(), ...doc };
    this.data.push(newDoc);
    return { insertedId: newDoc._id };
  }

  async insertMany(docs) {
    const insertedIds = {};
    const newDocs = docs.map((doc, idx) => {
      const _id = doc._id || new ObjectId();
      insertedIds[idx] = _id;
      return { _id, ...doc };
    });
    this.data.push(...newDocs);
    return { insertedIds };
  }

  async updateOne(query, updateSpec) {
    const doc = await this.findOne(query);
    if (!doc) return { matchedCount: 0, modifiedCount: 0 };

    if (updateSpec.$set) {
      Object.assign(doc, updateSpec.$set);
    }
    if (updateSpec.$unset) {
      for (const key in updateSpec.$unset) {
        delete doc[key];
      }
    }
    if (updateSpec.$push) {
      for (const key in updateSpec.$push) {
        if (!doc[key]) doc[key] = [];
        doc[key].push(updateSpec.$push[key]);
      }
    }
    if (updateSpec.$pull) {
      for (const key in updateSpec.$pull) {
        if (doc[key]) {
          const pullCriteria = updateSpec.$pull[key];
          if (typeof pullCriteria === "object") {
            doc[key] = doc[key].filter(item => {
              for (const k in pullCriteria) {
                if (item[k] !== pullCriteria[k]) return true;
              }
              return false;
            });
          } else {
            doc[key] = doc[key].filter(item => item !== pullCriteria);
          }
        }
      }
    }
    return { matchedCount: 1, modifiedCount: 1 };
  }

  async deleteOne(query) {
    const doc = await this.findOne(query);
    if (!doc) return { deletedCount: 0 };
    this.data = this.data.filter(item => String(item._id) !== String(doc._id));
    return { deletedCount: 1 };
  }

  async deleteMany(query = {}) {
    const initialCount = this.data.length;
    let toDelete = await (await this.find(query)).toArray();
    const idsToDelete = new Set(toDelete.map(item => String(item._id)));
    this.data = this.data.filter(item => !idsToDelete.has(String(item._id)));
    return { deletedCount: initialCount - this.data.length };
  }
}

class MockDb {
  constructor() {
    this.collections = {};
    this.client = {
      db: () => this,
      close: async () => {}
    };
  }

  collection(name) {
    if (!this.collections[name]) {
      this.collections[name] = new MockCollection(name);
    }
    return this.collections[name];
  }
}

export async function connectDb() {
  if (db) return db;
  try {
    console.log("Connecting to MongoDB...");
    client = new MongoClient(url, { 
      connectTimeoutMS: 15000, 
      serverSelectionTimeoutMS: 15000
    });
    await client.connect();
    const dbName = url.split("/").pop().split("?")[0] || "torneio_sumo";
    db = client.db(dbName);
    db.client = client;
    console.log("Connected successfully to MongoDB Database. ✅");
  } catch (error) {
    console.error("MongoDB Connection Error Detail:", error.message || error);
    if (String(error).includes("alert number 80") || String(error).includes("ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR")) {
      console.error("⚠️ ALERTA: O MongoDB Atlas rejeitou o IP da conexão (SSL alert 80).");
      console.error("⚠️ Solução: Acesse o MongoDB Atlas > Network Access > Adicione '0.0.0.0/0' (Allow Access from Anywhere).");
    }
    console.warn("Could not connect to MongoDB. Falling back to IN-MEMORY DATABASE for local preview. ⚠️");
    db = new MockDb();
  }
  return db;
}

export async function getDb() {
  return connectDb();
}
