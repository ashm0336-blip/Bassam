/**
 * Map Calibration & Area Calculation Utilities
 * 
 * Converts polygon coordinates (percentage-based 0-100) to real-world measurements
 * using a two-point calibration system.
 */

/**
 * Compute the scale factor from calibration data.
 * @param {Object} calibration - { point1: {x,y}, point2: {x,y}, distance_meters: number }
 * @param {number} imgRatio - image width / height ratio
 * @returns {Object} { metersPerUnit, valid }
 */
export function computeScale(calibration, imgRatio) {
  if (!calibration?.point1 || !calibration?.point2 || !calibration?.distance_meters || !imgRatio) {
    return { metersPerUnit: 0, valid: false };
  }
  const { point1, point2, distance_meters } = calibration;
  // Coordinates are 0-100 percentage. Account for image aspect ratio:
  // In real world, X and Y percentages map to different physical distances
  // because the image isn't square.
  const dx = (point2.x - point1.x) * imgRatio;
  const dy = (point2.y - point1.y);
  const pctDistance = Math.sqrt(dx * dx + dy * dy);
  if (pctDistance < 0.001) return { metersPerUnit: 0, valid: false };
  const metersPerUnit = distance_meters / pctDistance;
  return { metersPerUnit, valid: true };
}

/**
 * Calculate real-world area of a polygon from percentage coordinates.
 * Uses the Shoelace (Gauss) formula.
 * @param {Array} points - [{x, y}, ...] in percentage coords (0-100)
 * @param {number} metersPerUnit - from computeScale
 * @param {number} imgRatio - image width / height ratio
 * @returns {number} area in square meters
 */
export function computePolygonArea(points, metersPerUnit, imgRatio) {
  if (!points || points.length < 3 || !metersPerUnit || !imgRatio) return 0;
  // Convert to real-world coordinates (meters)
  const realPoints = points.map(p => ({
    x: p.x * imgRatio * metersPerUnit,
    y: p.y * metersPerUnit,
  }));
  // Shoelace formula
  let area = 0;
  for (let i = 0; i < realPoints.length; i++) {
    const j = (i + 1) % realPoints.length;
    area += realPoints[i].x * realPoints[j].y;
    area -= realPoints[j].x * realPoints[i].y;
  }
  return Math.abs(area) / 2;
}

/**
 * Calculate bounding box dimensions of a polygon in real meters.
 * @param {Array} points - [{x, y}, ...] in percentage coords
 * @param {number} metersPerUnit
 * @param {number} imgRatio
 * @returns {{ lengthM: number, widthM: number }}
 */
export function computePolygonDimensions(points, metersPerUnit, imgRatio) {
  if (!points || points.length < 3 || !metersPerUnit || !imgRatio) return { lengthM: 0, widthM: 0 };
  const xs = points.map(p => p.x * imgRatio * metersPerUnit);
  const ys = points.map(p => p.y * metersPerUnit);
  const lengthM = Math.max(...xs) - Math.min(...xs);
  const widthM = Math.max(...ys) - Math.min(...ys);
  return { lengthM: Math.round(lengthM * 100) / 100, widthM: Math.round(widthM * 100) / 100 };
}

/**
 * Compute all zone metrics from area.
 * @param {number} areaSqm - area in square meters
 * @param {number} carpetLength - single carpet length in meters (default 1.2)
 * @param {number} carpetWidth - single carpet width in meters (default 0.7)
 * @param {number} lengthM - zone length in meters
 * @param {number} widthM - zone width in meters
 * @returns {Object}
 */
export function computeZoneMetrics(areaSqm, { carpetLength = 1.2, carpetWidth = 0.7, lengthM = 0, widthM = 0 } = {}) {
  if (!areaSqm || areaSqm <= 0) return null;
  const safeCapacity = Math.round(areaSqm / 0.75);
  const mediumCapacity = Math.round(areaSqm / 0.60);
  const maxCapacity = Math.round(areaSqm / 0.55);

  // Carpet calculations
  const effLength = lengthM || Math.sqrt(areaSqm);
  const effWidth = widthM || Math.sqrt(areaSqm);
  const totalRows = Math.floor(effLength / carpetLength);
  const carpetsPerRow = Math.floor(effWidth / carpetWidth);
  const totalCarpets = totalRows * carpetsPerRow;

  return {
    areaSqm: Math.round(areaSqm * 100) / 100,
    safeCapacity,
    mediumCapacity,
    maxCapacity,
    totalRows,
    carpetsPerRow,
    totalCarpets,
    perPersonSqm: 0.75,
  };
}

/**
 * Compute the pixel distance between two calibration points for display.
 */
export function computeCalibrationLineLength(point1, point2, imgRatio) {
  if (!point1 || !point2 || !imgRatio) return 0;
  const dx = (point2.x - point1.x) * imgRatio;
  const dy = (point2.y - point1.y);
  return Math.sqrt(dx * dx + dy * dy);
}
