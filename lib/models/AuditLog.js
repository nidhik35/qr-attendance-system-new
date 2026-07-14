import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    action: { type: String, required: true },
    resource: { type: String, default: null },
    status: { type: String, default: "success" },
    ip_address: { type: String, default: null },
    user_agent: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

auditLogSchema.index({ created_at: -1 });
auditLogSchema.index({ status: 1 });

export default mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema, "audit_logs");
