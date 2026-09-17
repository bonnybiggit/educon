import { Router } from 'express';
import { findBlogPostBySlug, findPublishedBlogPosts, formatBlogPostResponse } from '../models/blogModel.js';
import { AppError, asyncHandler, sendSuccess } from '../middleware/http.js';

const router = Router();

router.get('/blog', asyncHandler(async (_req, res) => {
  const posts = await findPublishedBlogPosts();
  sendSuccess(res, {
    message: 'Blog posts fetched',
    data: { posts: posts.map(formatBlogPostResponse) },
  });
}));

router.get('/blog/:slug', asyncHandler(async (req, res) => {
  const post = await findBlogPostBySlug(req.params.slug);
  if (!post || !post.isPublished) throw new AppError('Blog post not found', 404);
  sendSuccess(res, {
    message: 'Blog post fetched',
    data: { post: formatBlogPostResponse(post) },
  });
}));

export default router;
