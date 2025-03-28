import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { connectToDatabase } from '@/lib/mongoose';
import Comment from '@/models/Comment';
import SurfSpot from '@/models/SurfSpot';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', 'https://surfapp2.vercel.app');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  await connectToDatabase();
  
  const { id } = req.query;
  
  // Get authentication session
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });
  
  // Find the comment
  const comment = await Comment.findById(id).populate('user');
  if (!comment) {
    return res.status(404).json({ error: 'Comment not found' });
  }
  
  // Get a single comment
  if (req.method === 'GET') {
    return res.status(200).json(comment);
  }
  
  // Update a comment
  if (req.method === 'PUT') {
    // Check if user is authorized to update this comment
    if (comment.user._id.toString() !== session.user._id.toString() && 
        session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this comment' });
    }
    
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }
      
      comment.text = text;
      comment.edited = true;
      await comment.save();
      
      return res.status(200).json(comment);
    } catch (error) {
      console.error('Error updating comment:', error);
      return res.status(500).json({ error: 'Failed to update comment' });
    }
  }
  
  // Delete a comment
  if (req.method === 'DELETE') {
    // Check if user is authorized to delete this comment
    if (comment.user._id.toString() !== session.user._id.toString() && 
        session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }
    
    try {
      await SurfSpot.findByIdAndUpdate(comment.spot, {
        $pull: { comments: comment._id }
      });
      
      if (!comment.parentId) {
        await Comment.deleteMany({ parentId: comment._id });
      }
      
      await Comment.findByIdAndDelete(id);
      
      return res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (error) {
      console.error('Error deleting comment:', error);
      return res.status(500).json({ error: 'Failed to delete comment' });
    }
  }
  
  res.status(405).json({ error: 'Method not allowed' });
}