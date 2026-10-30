import { describe, it, expect } from "vitest";
import { haversineDistance } from "@/server/services/attendance.service";

describe("haversineDistance", () => {
  it("should return 0 meters for identical coordinates", () => {
    const lat = 28.6139; // New Delhi
    const lng = 77.209;
    const distance = haversineDistance(lat, lng, lat, lng);
    expect(distance).toBe(0);
  });

  it("should calculate approximately accurate distance between two nearby coordinates", () => {
    // Connaught Place to India Gate (~2.3 km)
    const cpLat = 28.6315;
    const cpLng = 77.2167;
    const igLat = 28.6129;
    const igLng = 77.2295;

    const distance = haversineDistance(cpLat, cpLng, igLat, igLng);
    // Expected distance ~2400 meters ± 200m
    expect(distance).toBeGreaterThan(2000);
    expect(distance).toBeLessThan(2600);
  });

  it("should detect check-in within standard geo-fence radius (200m)", () => {
    const kioskLat = 19.076; // Mumbai
    const kioskLng = 72.8777;

    // Small shift of ~50 meters
    const operatorLat = 19.0763;
    const operatorLng = 72.878;

    const distance = haversineDistance(kioskLat, kioskLng, operatorLat, operatorLng);
    const radius = 200; // 200 meters

    expect(distance).toBeLessThan(radius);
  });

  it("should detect check-in outside geo-fence radius", () => {
    const kioskLat = 12.9716; // Bengaluru
    const kioskLng = 77.5946;

    // Shift of ~1 km
    const operatorLat = 12.9806;
    const operatorLng = 77.5946;

    const distance = haversineDistance(kioskLat, kioskLng, operatorLat, operatorLng);
    const radius = 200;

    expect(distance).toBeGreaterThan(radius);
  });
});
