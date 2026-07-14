import mongoose from "mongoose";

const livenessChallengeSchema = new mongoose.Schema(
  {
    challenge_id: { type: String, required: true, unique: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    steps: { type: [String], required: true },
    expires_at: { type: Date, required: true },
    used_at: { type: Date, default: null }
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

export default mongoose.models.LivenessChallenge ||
  mongoose.model("LivenessChallenge", livenessChallengeSchema, "liveness_challenges");
