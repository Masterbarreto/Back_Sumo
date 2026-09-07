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
    // Pre-process queries that check for _id
    const processedQuery = { ...query };
    if (processedQuery._id && typeof processedQuery._id === "string") {
      processedQuery._id = toObjectId(processedQuery._id);
    }
    return col.find(processedQuery, options).toArray();
  }

  async findOne(query = {}, options = {}) {
    const col = await this.getCollection();
    const processedQuery = { ...query };
    if (processedQuery._id && typeof processedQuery._id === "string") {
      processedQuery._id = toObjectId(processedQuery._id);
    }
    return col.findOne(processedQuery, options);
  }

  async insertOne(doc) {
    const col = await this.getCollection();
    const result = await col.insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }

  async updateOne(query, updateSpec) {
    const col = await this.getCollection();
    const processedQuery = { ...query };
    if (processedQuery._id && typeof processedQuery._id === "string") {
      processedQuery._id = toObjectId(processedQuery._id);
    }
    return col.updateOne(processedQuery, updateSpec);
  }

  async deleteOne(query) {
    const col = await this.getCollection();
    const processedQuery = { ...query };
    if (processedQuery._id && typeof processedQuery._id === "string") {
      processedQuery._id = toObjectId(processedQuery._id);
    }
    return col.deleteOne(processedQuery);
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

