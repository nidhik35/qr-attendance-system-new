// Pure liveness proof validation (no DB dependency — testable in isolation).
export const MIN_STEP_MS = 0;
export const MAX_STEP_MS = 30 * 1000;

export function validateLivenessProof(steps, proof) {
  if (!Array.isArray(proof) || proof.length !== steps.length) {
    return { valid: false, reason: "proof_length_mismatch" };
  }

  for (let i = 0; i < steps.length; i += 1) {
    if (proof[i].step !== steps[i]) {
      return { valid: false, reason: "step_order_mismatch", expected: steps[i] };
    }
    if (i > 0) {
      const delta = proof[i].completed_at - proof[i - 1].completed_at;const delta = proof[i].completed_at - proof[i - 1].completed_at;

console.log(
  "Step:",
  i,
  "Expected:",
  steps[i],
  "Received:",
  proof[i].step,
  "Delta:",
  delta
); if (delta < MIN_STEP_MS) {
        return { valid: false, reason: "steps_too_fast" };
      }
      if (delta > MAX_STEP_MS) {
        return { valid: false, reason: "steps_too_slow" };
      }
    }
  }

  return { valid: true };
}
