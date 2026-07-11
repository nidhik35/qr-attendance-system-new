import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(["student", "instructor", "admin"]).optional(),
  device_id: z.string().optional(),
  loginType: z.enum(["admin", "instructor"]).optional()
});

export const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["student", "instructor"]).default("student")
});

export const generateQRSchema = z.object({
  course_id: z.string().min(1).max(50).optional()
});

export const qrChallengeSchema = z.object({
  session_id: z.string().uuid(),
  timestamp: z.union([z.number(), z.string()]),
  nonce: z.string().min(8),
  signature: z.string().min(16),
  device_id: z.string().optional()
});

export const verifyQRSchema = z.object({
  attendance_challenge_token: z.string().min(16),
  liveness_token: z.string().min(16),
  device_id: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  face_descriptor: z.array(z.number()).min(64)
});

export const faceRegisterSchema = z.object({
  face_descriptor: z.array(z.number()).min(64)
});

export const faceChallengeCompleteSchema = z.object({
  challenge_id: z.string().uuid(),
  proof: z
    .array(
      z.object({
        step: z.enum(["blink", "turn_left", "turn_right"]),
        completed_at: z.number(),
        metrics: z.record(z.number()).optional()
      })
    )
    .min(1)
});

export const refreshSchema = z.object({}).optional();
