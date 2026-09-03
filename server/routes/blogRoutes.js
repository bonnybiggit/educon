import { Router } from 'express';
import { findPublishedBlogPosts, formatBlogPostResponse } from '../models/blogModel.js';
import { asyncHandler, sendSuccess } from '../middleware/http.js';

const router = Router();

router.get('/blog', asyncHandler(async (_req, res) => {
  const posts = await findPublishedBlogPosts();
  sendSuccess(res, {
    message: 'Blog posts fetched',
    data: { posts: posts.map(formatBlogPostResponse) },
  });
}));

export default router;
