import mongoose from "mongoose";

export function toObjectId(id) {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  if (mongoose.Types.ObjectId.isValid(String(id))) {
    return new mongoose.Types.ObjectId(String(id));
  }
  return null;
}

export function docId(doc) {
  if (!doc) return null;
  return String(doc._id ?? doc.id);
}

export function isDuplicateKeyError(error) {
  return error?.code === 11000;
}
