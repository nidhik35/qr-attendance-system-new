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

export const instructorCreateSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6),
  department: z.string().min(1).max(100),
  subjects: z.array(z.string().min(1)).min(1)
});

export const instructorUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  department: z.string().min(1).max(100).optional(),
  subjects: z.array(z.string().min(1)).min(1).optional()
});

export const courseCreateSchema = z.object({
  course_name: z.string().min(1).max(100),
  course_code: z.string().min(1).max(20).toUpperCase(),
  semester: z.string().min(1).max(20),
  section: z.string().max(50).optional().default("")
});

export const generateQRSchema = z.object({
  course_id: z.string().min(1).max(50)
});

export const qrChallengeSchema = z.object({
  session_id: z.string().uuid(),
  instructor_id: z.string().optional(),
  instructor_name: z.string().optional(),
  subject: z.string().optional(),
  timestamp: z.union([z.number(), z.string()]),
  expires_at: z.union([z.number(), z.string()]).optional(),
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
