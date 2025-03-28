import type { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import { connectToDatabase } from "@/lib/mongoose"
import SurfSpot from "@/models/SurfSpot"
import Comment from "@/models/Comment"
import { fetchForecastData } from "@/utils/forecast"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "https://surfapp2.vercel.app")
  res.setHeader("Access-Control-Allow-Credentials", "true")
  res.setHeader("Access-Control-Allow-Methods", "GET,PUT,DELETE,OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  try {
    // Connect to database
    await connectToDatabase()

    const { id } = req.query

    // Get authentication session
    const session = await getServerSession(req, res, authOptions)

    // For GET requests, we'll allow access but will handle auth in the frontend
    if (req.method !== "GET" && !session) {
      return res.status(401).json({ error: "Not authenticated" })
    }

    // Get a single spot with populated comments
    if (req.method === "GET") {
      try {
        const spot = await SurfSpot.findById(id).lean()

        if (!spot) {
          return res.status(404).json({ error: "Surf spot not found" })
        }

        // Get all comments for this spot and populate the user field
        const comments = await Comment.find({ spot: id })
          .populate("user", "username email image")
          .sort({ createdAt: -1 })
          .lean()

        // Calculate average rating
        if (comments.length > 0) {
          const validComments = comments.filter((comment) => typeof comment.rating === "number")
          if (validComments.length > 0) {
            const totalRating = validComments.reduce((sum, comment) => sum + (comment.rating || 0), 0)
            // Use type assertion to add the rating property
            ;(spot as any).rating = totalRating / validComments.length
          }
        }
        // Add comments to the spot object using type assertion
        ;(spot as any).comments = comments

        return res.status(200).json(spot)
      } catch (error) {
        console.error("Error fetching spot:", error)
        return res
          .status(500)
          .json({ error: "Failed to fetch surf spot: " + (error instanceof Error ? error.message : String(error)) })
      }
    }

    // Update a spot
    if (req.method === "PUT") {
      // Check if user is an admin (with null check)
      if (!session || session.user.role !== "admin") {
        return res.status(403).json({ error: "Not authorized to update spots" })
      }

      try {
        const updateData = { ...req.body }

        // Check if we should skip forecast update
        const skipForecastUpdate = req.query.skipForecastUpdate === "true"

        // Only fetch new forecast data if not skipping and location is provided
        if (!skipForecastUpdate && updateData.location && updateData.location.lat && updateData.location.lng) {
          console.log("Fetching new forecast data for spot update")
          const forecastData = await fetchForecastData(updateData.location.lat, updateData.location.lng)

          if (forecastData) {
            updateData.forecast = forecastData
          }
        } else if (skipForecastUpdate) {
          console.log("Skipping forecast update as requested")
          // Remove forecast from updateData to preserve existing data
          delete updateData.forecast
        }

        const updatedSpot = await SurfSpot.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })

        if (!updatedSpot) {
          return res.status(404).json({ error: "Surf spot not found" })
        }

        return res.status(200).json(updatedSpot)
      } catch (error) {
        console.error("Error updating spot:", error)
        return res.status(500).json({ error: "Failed to update surf spot" })
      }
    }

    // Delete a spot
    if (req.method === "DELETE") {
      // Check if user is an admin (with null check)
      if (!session || session.user.role !== "admin") {
        return res.status(403).json({ error: "Not authorized to delete spots" })
      }

      try {
        const deletedSpot = await SurfSpot.findByIdAndDelete(id)

        if (!deletedSpot) {
          return res.status(404).json({ error: "Surf spot not found" })
        }

        // Delete all comments associated with this spot
        await Comment.deleteMany({ spot: id })

        return res.status(200).json({ message: "Surf spot deleted successfully" })
      } catch (error) {
        console.error("Error deleting spot:", error)
        return res.status(500).json({ error: "Failed to delete surf spot" })
      }
    }

    res.status(405).json({ error: "Method not allowed" })
  } catch (error) {
    console.error("API route error:", error)
    res
      .status(500)
      .json({ error: "Internal server error: " + (error instanceof Error ? error.message : String(error)) })
  }
}

