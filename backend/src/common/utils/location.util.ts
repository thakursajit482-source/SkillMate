/**
 * Location and Privacy Utilities for SkillMate
 * PRD Section 20: Location Architecture & Privacy
 * "Approximate, never exact. Location privacy is a hard constraint, not a setting."
 */

export interface LocalityCentroid {
  area: string;
  latitude: number;
  longitude: number;
}

// Predefined centroids for Mumbai Metropolitan Region (MMR) localities
export const MMR_LOCALITIES: Record<string, { lat: number; lng: number }> = {
  kandivali: { lat: 19.206, lng: 72.852 },
  borivali: { lat: 19.23, lng: 72.856 },
  malad: { lat: 19.186, lng: 72.848 },
  goregaon: { lat: 19.166, lng: 72.849 },
  andheri: { lat: 19.113, lng: 72.869 },
  bandra: { lat: 19.059, lng: 72.84 },
  powai: { lat: 19.117, lng: 72.905 },
  virar: { lat: 19.456, lng: 72.811 },
  'mira road': { lat: 19.281, lng: 72.856 },
  bhayandar: { lat: 19.301, lng: 72.851 },
  dadar: { lat: 19.017, lng: 72.843 },
  churchgate: { lat: 18.932, lng: 72.826 },
  thane: { lat: 19.218, lng: 72.978 },
  vashi: { lat: 19.077, lng: 72.998 },
  nerul: { lat: 19.033, lng: 73.016 },
  ghatkopar: { lat: 19.086, lng: 72.908 },
  kurla: { lat: 19.065, lng: 72.879 },
  chembur: { lat: 19.062, lng: 72.899 },
  'vile parle': { lat: 19.099, lng: 72.844 },
  santacruz: { lat: 19.083, lng: 72.839 },
};

/**
 * Returns coarse centroid buckets for an area within MMR.
 * Coarse coordinates are rounded to 3 decimal places (~100m fuzzing).
 */
export function getAreaCentroid(areaName: string): { latitudeBucket: number; longitudeBucket: number } | null {
  if (!areaName) return null;
  const normalized = areaName.trim().toLowerCase();
  const entry = MMR_LOCALITIES[normalized];
  if (!entry) return null;

  return {
    latitudeBucket: Math.round(entry.lat * 1000) / 1000,
    longitudeBucket: Math.round(entry.lng * 1000) / 1000,
  };
}

/**
 * Great-circle distance calculation using Haversine formula in kilometers.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Maps exact distances to PRD banded distance strings.
 * Never surfaces raw distance decimals or exact coordinates.
 */
export function getDistanceBand(distanceKm: number): string {
  if (distanceKm < 2) return '~2 km away';
  if (distanceKm <= 5) return '2–5 km away';
  if (distanceKm <= 10) return '5–10 km away';
  if (distanceKm <= 20) return '10–20 km away';
  return '20+ km away';
}

/**
 * Computes approximate distance and band between two MMR locality names.
 */
export function getDistanceBetweenAreas(
  area1?: string | null,
  area2?: string | null,
): { distanceKm: number; distanceBand: string } | null {
  if (!area1 || !area2) return null;

  const norm1 = area1.trim().toLowerCase();
  const norm2 = area2.trim().toLowerCase();

  if (norm1 === norm2) {
    return { distanceKm: 0, distanceBand: 'Same area' };
  }

  const c1 = getAreaCentroid(norm1);
  const c2 = getAreaCentroid(norm2);

  if (!c1 || !c2) return null;

  const distanceKm = calculateHaversineDistance(
    c1.latitudeBucket,
    c1.longitudeBucket,
    c2.latitudeBucket,
    c2.longitudeBucket,
  );

  return {
    distanceKm: Math.round(distanceKm * 10) / 10,
    distanceBand: getDistanceBand(distanceKm),
  };
}

/**
 * Strips sensitive personal and exact location coordinates from public profile views.
 */
export function sanitizePublicProfile(
  profile: any,
  user: any,
  verification: any,
  extraOptions?: {
    distanceBand?: string | null;
    matchScore?: number;
    matchReasons?: string[];
  },
) {
  return {
    id: profile.id,
    userId: user.id,
    name: user.name,
    photoUrl: profile.photoUrl || null,
    bio: profile.bio || null,
    approximateArea: profile.approximateArea || null,
    distanceBand: extraOptions?.distanceBand !== undefined ? extraOptions.distanceBand : null,
    hourlyRate: profile.hourlyRate ? Number(profile.hourlyRate) : null,
    college: verification?.college
      ? {
          id: verification.college.id,
          name: verification.college.name,
          city: verification.college.city,
          area: verification.college.area,
        }
      : null,
    department: verification?.department || null,
    yearOfStudy: verification?.yearOfStudy || null,
    verificationStatus: verification?.status || 'UNVERIFIED',
    isVerified: verification?.status === 'VERIFIED',
    skills: (profile.skills || []).map((ps: any) => ({
      id: ps.id,
      skillId: ps.skillId,
      name: ps.skill?.name || '',
      category: ps.skill?.category || '',
      level: ps.level,
      isVerifiedSkill: ps.isVerifiedSkill,
    })),
    availabilities: (profile.availabilities || []).map((av: any) => ({
      id: av.id,
      dayOfWeek: av.dayOfWeek,
      specificDate: av.specificDate,
      startTime: av.startTime,
      endTime: av.endTime,
      isRecurring: av.isRecurring,
    })),
    ...(extraOptions?.matchScore !== undefined ? { matchScore: extraOptions.matchScore } : {}),
    ...(extraOptions?.matchReasons !== undefined ? { matchReasons: extraOptions.matchReasons } : {}),
    createdAt: profile.createdAt,
  };
}
