import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    token_hash: { type: String, required: true },
    jti: { type: String, required: true },
    device_id: { type: String, default: null },
    expires_at: { type: Date, required: true },
    revoked_at: { type: Date, default: null }
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

refreshTokenSchema.index({ token_hash: 1, jti: 1 });
refreshTokenSchema.index({ user_id: 1 });

export default mongoose.models.RefreshToken || mongoose.model("RefreshToken", refreshTokenSchema, "refresh_tokens");
