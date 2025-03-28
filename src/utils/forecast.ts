import fetch from "node-fetch"

/**
 * Fetches forecast data from the Stormglass API
 * @param lat Latitude
 * @param lng Longitude
 * @returns Forecast data object or null if fetch fails
 */
export async function fetchForecastData(lat: number, lng: number) {
  try {
    const apiKey = process.env.STORMGLASS_API_KEY
    if (!apiKey) {
      console.warn("Stormglass API key not found")
      return null
    }

    const endTime = new Date()
    endTime.setDate(endTime.getDate() + 3) // Get 3 days of forecast

    const response = await fetch(
      `https://api.stormglass.io/v2/weather/point?lat=${lat}&lng=${lng}&params=waveHeight,wavePeriod,windSpeed,windDirection,swellDirection,waterTemperature&source=noaa&end=${endTime.toISOString()}`,
      {
        headers: {
          Authorization: apiKey,
        },
      },
    )

    if (!response.ok) {
      throw new Error(`Stormglass API error: ${response.status}`)
    }

    const data = await response.json()
    return {
      timestamp: new Date(),
      data: data,
      lastFetched: new Date(),
    }
  } catch (error) {
    console.error("Error fetching forecast data:", error)
    return null
  }
}

/**
 * Logs forecast API usage for monitoring
 * @param action The action being performed
 * @param spotId The ID of the spot
 * @param success Whether the API call was successful
 */
export function logForecastApiUsage(action: string, spotId: string, success: boolean) {
  const timestamp = new Date().toISOString()
  console.log(`[FORECAST API] ${timestamp} | Action: ${action} | Spot: ${spotId} | Success: ${success}`)
}

