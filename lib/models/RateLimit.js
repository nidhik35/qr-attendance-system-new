import mongoose from "mongoose";

const rateLimitSchema = new mongoose.Schema(
  {
    rate_key: { type: String, required: true, index: true },
    created_at: { type: Date, default: Date.now, index: true }
  },
  { timestamps: false }
);

export default mongoose.models.RateLimit || mongoose.model("RateLimit", rateLimitSchema, "rate_limits");
