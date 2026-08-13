export const formatKm = (meters, digits = 2) => {
  if (meters === null || meters === undefined || Number.isNaN(meters)) {
    return 'n/a';
  }
  const km = meters / 1000;
  if (km < 0.01) {
    return `${Math.round(meters)} m`;
  }
  return `${km.toFixed(digits)} km`;
};
