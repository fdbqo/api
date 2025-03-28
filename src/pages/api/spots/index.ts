import type { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import { connectToDatabase } from "@/lib/mongoose"
import SurfSpot from "@/models/SurfSpot"
import { fetchForecastData } from "@/utils/forecast"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "https://surfapp2.vercel.app")
  res.setHeader("Access-Control-Allow-Credentials", "true")
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  await connectToDatabase()

  // Get all surf spots
  if (req.method === "GET") {
    try {
      const spots = await SurfSpot.find().populate("user", "username email image")
      return res.status(200).json(spots)
    } catch (error) {
      console.error("Error fetching surf spots:", error)
      return res.status(500).json({ error: "Failed to fetch surf spots" })
    }
  }

  // Create a new surf spot
  if (req.method === "POST") {
    const session = await getServerSession(req, res, authOptions)
    if (!session) return res.status(401).json({ error: "Not authenticated" })

    try {
      const {
        name,
        description,
        imageUrl,
        region,
        country,
        difficulty,
        waveType,
        swellDirection,
        windDirection,
        tide,
        crowdFactor,
        season,
        location,
        lat,
        lng,
      } = req.body

      // Validate required fields for surf spot
      if (!name) {
        return res.status(400).json({ error: "Name is required" })
      }

      // Create the surf spot data object
      const spotData: any = {
        name,
        user: session.user._id,
        comments: [],
      }

      // Add optional fields if they exist
      if (description) spotData.description = description
      if (imageUrl) spotData.imageUrl = imageUrl
      if (region) spotData.region = region
      if (country) spotData.country = country
      if (difficulty) spotData.difficulty = difficulty
      if (waveType) spotData.waveType = waveType
      if (swellDirection) spotData.swellDirection = swellDirection
      if (windDirection) spotData.windDirection = windDirection
      if (tide) spotData.tide = tide
      if (crowdFactor) spotData.crowdFactor = crowdFactor
      if (season) spotData.season = season

      // Handle location data
      if (location) {
        spotData.location = location
      } else if (lat !== undefined && lng !== undefined) {
        spotData.location = {
          lat: Number(lat),
          lng: Number(lng),
        }
      }

      // Fetch forecast data if we have coordinates
      if (spotData.location && spotData.location.lat && spotData.location.lng) {
        const forecastData = await fetchForecastData(spotData.location.lat, spotData.location.lng)

        if (forecastData) {
          spotData.forecast = forecastData
        }
      }

      // Create the surf spot
      const spot = await SurfSpot.create(spotData)

      // Populate the user field for the response
      const populatedSpot = await SurfSpot.findById(spot._id).populate("user", "username email image")

      return res.status(201).json(populatedSpot)
    } catch (error) {
      console.error("Error creating surf spot:", error)
      return res.status(500).json({ error: "Failed to create surf spot" })
    }
  }

  res.status(405).json({ error: "Method not allowed" })
}

