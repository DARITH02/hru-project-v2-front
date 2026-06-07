export const DEFAULT_CAMPUS_LOCATION = {
  lat: 11.5524257,
  lng: 104.9135598,
  radius: 250,
};

export const getCampusSettings = (branding = {}) => ({
  lat: Number(branding.campusLat) || DEFAULT_CAMPUS_LOCATION.lat,
  lng: Number(branding.campusLng) || DEFAULT_CAMPUS_LOCATION.lng,
  radius: Number(branding.campusRadius) || DEFAULT_CAMPUS_LOCATION.radius,
});

export const getDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

export const buildLocationPayload = (coords, branding) => {
  const campus = getCampusSettings(branding);
  const distance = getDistanceMeters(
    coords.latitude,
    coords.longitude,
    campus.lat,
    campus.lng,
  );

  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy,
    distance,
    campusRadius: campus.radius,
    isInsideCampus: distance <= campus.radius,
  };
};
