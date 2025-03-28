import type { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth/next"
import { authOptions } from "../auth/[...nextauth]"
import { connectToDatabase } from "@/lib/mongoose"
import Comment from "@/models/Comment"
import SurfSpot from "@/models/SurfSpot"

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

  // Get all comments
  if (req.method === "GET") {
    try {
      const comments = await Comment.find().populate("user")
      return res.status(200).json(comments)
    } catch (error) {
      console.error("Error fetching comments:", error)
      return res.status(500).json({ error: "Failed to fetch comments" })
    }
  }

  // Create a new comment
  if (req.method === "POST") {
    const session = await getServerSession(req, res, authOptions)
    if (!session) return res.status(401).json({ error: "Not authenticated" })

    try {
      const { spotId, text, rating, parentId } = req.body

      // Define the comment data with proper typing
      const commentData: {
        spot?: any
        text: string
        rating?: number
        user: string
        parentId?: string
      } = {
        text,
        user: session.user._id,
      }

      // If this is a reply to another comment
      if (parentId) {
        // Find the parent comment to get its spot ID
        const parentComment = await Comment.findById(parentId)

        if (!parentComment) {
          return res.status(404).json({ error: "Parent comment not found" })
        }

        // Use the parent comment's spot ID
        commentData.spot = parentComment.spot
        commentData.parentId = parentId

        // Don't include rating for replies, it will be set to undefined in the model's pre-validate hook
      } else {
        // This is a top-level comment, so spotId and rating are required
        if (!spotId || rating === undefined) {
          return res.status(400).json({ error: "spotId and rating are required for top-level comments" })
        }

        commentData.spot = spotId
        commentData.rating = Number(rating)
      }

      const comment = await Comment.create(commentData)

      await SurfSpot.findByIdAndUpdate(commentData.spot, {
        $push: { comments: comment._id },
      })

      const populatedComment = await Comment.findById(comment._id).populate("user")

      return res.status(201).json(populatedComment)
    } catch (error) {
      console.error("Error creating comment:", error)
      return res.status(500).json({ error: "Failed to create comment" })
    }
  }

  res.status(405).json({ error: "Method not allowed" })
}

