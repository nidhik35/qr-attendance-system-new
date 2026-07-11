// Shared Zod request-body validation for API routes.
export function validateBody(body, schema) {
  const result = schema.safeParse(body ?? {});
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    return { error: { status: 400, message: "Validation failed", details: issues } };
  }
  return { data: result.data };
}

export function methodNotAllowed(res, allowed = []) {
  return res.status(405).json({ message: "Method not allowed", allowed });
}
