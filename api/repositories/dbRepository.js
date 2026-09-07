import { getDb } from "../db.js";
import { ObjectId } from "mongodb";

function toObjectId(id) {
  if (!id) return null;
  if (id instanceof ObjectId) return id;
  try {
    return new ObjectId(id);
  } catch (e) {
    return id;
  }
}

function processQuery(query) {
  if (!query || typeof query !== "object") return query;
  if (query instanceof ObjectId || query instanceof Date || query instanceof RegExp) {
    return query;
  }
  if (Array.isArray(query)) {
    return query.map(processQuery);
  }
  const processed = {};
  for (const [key, val] of Object.entries(query)) {
    if (key === "_id" && typeof val === "string") {
      const objId = toObjectId(val);
      processed[key] = objId || val;
    } else if (
      typeof val === "object" &&
      val !== null &&
      !(val instanceof ObjectId) &&
      !(val instanceof Date) &&
      !(val instanceof RegExp)
    ) {
      processed[key] = processQuery(val);
    } else {
      processed[key] = val;
    }
  }
  return processed;
}

export class BaseRepository {
  constructor(collectionName) {
    this.collectionName = collectionName;
  }

  async getCollection() {
    const db = await getDb();
    return db.collection(this.collectionName);
  }

  async find(query = {}, options = {}) {
    const col = await this.getCollection();
    return col.find(processQuery(query), options).toArray();
  }

  async findOne(query = {}, options = {}) {
    const col = await this.getCollection();
    return col.findOne(processQuery(query), options);
  }

  async insertOne(doc) {
    const col = await this.getCollection();
    const result = await col.insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }

  async updateOne(query, updateSpec) {
    const col = await this.getCollection();
    return col.updateOne(processQuery(query), updateSpec);
  }

  async deleteOne(query) {
    const col = await this.getCollection();
    return col.deleteOne(processQuery(query));
  }

  async updateMany(query, updateSpec) {
    const col = await this.getCollection();
    return col.updateMany(processQuery(query), updateSpec);
  }

  async deleteMany(query) {
    const col = await this.getCollection();
    return col.deleteMany(processQuery(query));
  }
}

export const UserRepository = new BaseRepository("users");
export const TeamRepository = new BaseRepository("teams");
export const TournamentRepository = new BaseRepository("tournaments");
export const EnrollmentRepository = new BaseRepository("enrollments");
export const MatchRepository = new BaseRepository("matches");
export const RoundRepository = new BaseRepository("rounds");
export const ArenaRepository = new BaseRepository("arenas");
export const CertificateRepository = new BaseRepository("certificates");
export { toObjectId };

