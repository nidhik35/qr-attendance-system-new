// Classroom geofence helpers (Haversine distance in meters).
export function toRadians(value) {
  return (value * Math.PI) / 180;
}

export function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const earthRadius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

export function getClassroomConfig(course = null) {
  const lat = Number(course?.classroom_lat ?? process.env.CLASSROOM_LAT ?? 12.9141);
  const lng = Number(course?.classroom_lng ?? process.env.CLASSROOM_LNG ?? 74.856);
  const radius = Number(course?.radius_meters ?? process.env.CLASSROOM_RADIUS_METERS ?? 50);
  return { lat, lng, radius };
}

export function isInsideClassroom(latitude, longitude, course = null) {
  const { lat, lng, radius } = getClassroomConfig(course);
  const distance = getDistanceMeters(latitude, longitude, lat, lng);
  return { allowed: distance <= radius, distance, radius };
}
