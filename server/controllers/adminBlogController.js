import { ObjectId } from 'mongodb';
import {
  deleteBlogPostById,
  findBlogPostById,
  findBlogPostBySlug,
  findBlogPosts,
  formatBlogPostResponse,
  insertBlogPost,
  updateBlogPostById,
} from '../models/blogModel.js';
import { logActivity } from '../services/activityLogService.js';
import { AppError, cleanString, sendSuccess } from '../middleware/http.js';

const slugify = (value) => cleanString(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const validateBlogPostId = (id) => {
  if (!ObjectId.isValid(id)) throw new AppError('Invalid blog post id', 400);
};

const ensureUniqueSlug = async (slug, currentId) => {
  const existing = await findBlogPostBySlug(slug);
  if (existing && existing._id.toString() !== currentId) {
    throw new AppError('A blog post with this slug already exists', 409);
  }
};

const getBlogPostFields = async (payload, { partial = false, currentId } = {}) => {
  const patch = {};
  if (!partial || payload.title !== undefined) {
    const title = cleanString(payload.title);
    if (!title) throw new AppError('Title is required', 400);
    patch.title = title;
  }
  if (!partial || payload.excerpt !== undefined) {
    const excerpt = cleanString(payload.excerpt);
    if (!excerpt) throw new AppError('Excerpt is required', 400);
    patch.excerpt = excerpt;
  }
  if (!partial || payload.content !== undefined) {
    const content = cleanString(payload.content);
    if (!content) throw new AppError('Content is required', 400);
    patch.content = content;
  }
  if (!partial || payload.author !== undefined) {
    const author = cleanString(payload.author);
    if (!author) throw new AppError('Author is required', 400);
    patch.author = author;
  }
  if (!partial || payload.category !== undefined) {
    const category = cleanString(payload.category);
    if (!category) throw new AppError('Category is required', 400);
    patch.category = category;
  }
  if (!partial || payload.featuredImageUrl !== undefined) {
    patch.featuredImageUrl = cleanString(payload.featuredImageUrl);
  }
  if (!partial || payload.slug !== undefined || payload.title !== undefined) {
    const source = cleanString(payload.slug) || payload.title;
    const slug = slugify(source);
    if (!slug) throw new AppError('Slug is required', 400);
    await ensureUniqueSlug(slug, currentId);
    patch.slug = slug;
  }
  if (!partial || payload.isPublished !== undefined) {
    if (typeof payload.isPublished !== 'boolean') throw new AppError('Publish status must be a boolean', 400);
    patch.isPublished = payload.isPublished;
  }
  return patch;
};

export const getAdminBlogPosts = async (_req, res) => {
  const posts = await findBlogPosts();
  sendSuccess(res, {
    message: 'Blog posts fetched',
    data: { posts: posts.map(formatBlogPostResponse) },
  });
};

export const getAdminBlogPost = async (req, res) => {
  validateBlogPostId(req.params.id);
  const post = await findBlogPostById(req.params.id);
  if (!post) throw new AppError('Blog post not found', 404);
  sendSuccess(res, {
    message: 'Blog post fetched',
    data: { post: formatBlogPostResponse(post) },
  });
};

export const createAdminBlogPost = async (req, res) => {
  const now = new Date();
  const post = {
    _id: new ObjectId(),
    ...await getBlogPostFields(req.body),
    createdAt: now,
    updatedAt: now,
  };
  await insertBlogPost(post);
  await logActivity({
    adminId: req.admin.id,
    action: 'blog_post_creation',
    resource: 'blogPost',
    resourceId: post._id,
    details: { title: post.title, slug: post.slug },
  });
  sendSuccess(res, {
    statusCode: 201,
    message: 'Blog post created',
    data: { post: formatBlogPostResponse(post) },
  });
};

export const updateAdminBlogPost = async (req, res) => {
  validateBlogPostId(req.params.id);
  const patch = await getBlogPostFields(req.body, { partial: true, currentId: req.params.id });
  if (!Object.keys(patch).length) throw new AppError('No valid fields to update', 400);
  const post = await updateBlogPostById(req.params.id, patch);
  if (!post) throw new AppError('Blog post not found', 404);
  await logActivity({
    adminId: req.admin.id,
    action: 'blog_post_update',
    resource: 'blogPost',
    resourceId: req.params.id,
    details: { title: post.title, slug: post.slug, isPublished: post.isPublished },
  });
  sendSuccess(res, {
    message: 'Blog post updated',
    data: { post: formatBlogPostResponse(post) },
  });
};

export const deleteAdminBlogPost = async (req, res) => {
  validateBlogPostId(req.params.id);
  const post = await deleteBlogPostById(req.params.id);
  if (!post) throw new AppError('Blog post not found', 404);
  await logActivity({
    adminId: req.admin.id,
    action: 'blog_post_deletion',
    resource: 'blogPost',
    resourceId: req.params.id,
    details: { title: post.title, slug: post.slug },
  });
  sendSuccess(res, { message: 'Blog post deleted' });
};
