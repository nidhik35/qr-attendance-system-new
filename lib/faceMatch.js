// Server-side face descriptor comparison (128-d vector from face-api).
const FACE_MATCH_THRESHOLD = 0.6;

export function euclideanDistance(vectorA, vectorB) {
  if (!Array.isArray(vectorA) || !Array.isArray(vectorB)) {
    return Number.MAX_VALUE;
  }
  if (vectorA.length !== vectorB.length || vectorA.length === 0) {
    return Number.MAX_VALUE;
  }

  let sum = 0;
  for (let i = 0; i < vectorA.length; i += 1) {
    const diff = Number(vectorA[i]) - Number(vectorB[i]);
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export function isFaceMatch(storedDescriptor, incomingDescriptor) {
  const distance = euclideanDistance(storedDescriptor, incomingDescriptor);
  return {
    matched: distance <= FACE_MATCH_THRESHOLD,
    distance,
    threshold: FACE_MATCH_THRESHOLD
  };
}
