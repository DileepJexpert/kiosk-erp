import { db } from "@/lib/db";

/**
 * Weather Intelligence Service (F14)
 * Uses OpenWeatherMap API (free tier: 1000 calls/day)
 */

const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY;

interface WeatherData {
  tempHigh: number;
  tempLow: number;
  condition: string;
  humidity: number;
  rainfall: number;
}

export async function fetchWeather(lat: number, lng: number): Promise<WeatherData | null> {
  if (!OPENWEATHERMAP_API_KEY) return null;

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${OPENWEATHERMAP_API_KEY}&units=metric`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    return {
      tempHigh: data.main.temp_max,
      tempLow: data.main.temp_min,
      condition: data.weather?.[0]?.main?.toLowerCase() || "unknown",
      humidity: data.main.humidity,
      rainfall: data.rain?.["1h"] || 0,
    };
  } catch {
    return null;
  }
}

export async function logWeatherForKiosks(date: Date): Promise<number> {
  const kiosks = await db.kiosk.findMany({
    where: { isActive: true, latitude: { not: null }, longitude: { not: null } },
  });

  let logged = 0;
  for (const kiosk of kiosks) {
    if (!kiosk.latitude || !kiosk.longitude) continue;

    const weather = await fetchWeather(kiosk.latitude, kiosk.longitude);
    if (!weather) continue;

    await db.weatherLog.upsert({
      where: { kioskId_date: { kioskId: kiosk.id, date } },
      create: {
        date,
        kioskId: kiosk.id,
        location: kiosk.location,
        tempHigh: weather.tempHigh,
        tempLow: weather.tempLow,
        condition: weather.condition,
        humidity: weather.humidity,
        rainfall: weather.rainfall,
      },
      update: {
        tempHigh: weather.tempHigh,
        tempLow: weather.tempLow,
        condition: weather.condition,
        humidity: weather.humidity,
        rainfall: weather.rainfall,
      },
    });
    logged++;
  }

  return logged;
}

export async function getWeatherForDate(kioskId: string, date: Date) {
  return db.weatherLog.findUnique({
    where: { kioskId_date: { kioskId, date } },
  });
}
