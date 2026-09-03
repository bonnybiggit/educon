import { ObjectId } from 'mongodb';
import { env } from '../config/env.js';
import { getCollection, getMemoryStore, isUsingMemoryStore } from '../config/database.js';

export const formatBlogPostResponse = (post) => ({
  id: post._id.toString(),
  title: post.title,
  slug: post.slug,
  excerpt: post.excerpt,
  content: post.content,
  featuredImageUrl: post.featuredImageUrl || '',
  author: post.author,
  category: post.category,
  isPublished: Boolean(post.isPublished),
  createdAt: post.createdAt?.toISOString ? post.createdAt.toISOString() : post.createdAt,
  updatedAt: post.updatedAt?.toISOString ? post.updatedAt.toISOString() : post.updatedAt,
});

export const findBlogPosts = async () => {
  if (isUsingMemoryStore()) {
    return [...getMemoryStore().blogPosts].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }
  return getCollection(env.blogCollection).find().sort({ updatedAt: -1 }).toArray();
};

export const findPublishedBlogPosts = async () => {
  if (isUsingMemoryStore()) {
    return [...getMemoryStore().blogPosts]
      .filter((post) => post.isPublished)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }
  return getCollection(env.blogCollection).find({ isPublished: true }).sort({ updatedAt: -1 }).toArray();
};

export const findBlogPostById = async (id) => {
  if (isUsingMemoryStore()) {
    return getMemoryStore().blogPosts.find((post) => post._id.toString() === id) || null;
  }
  return getCollection(env.blogCollection).findOne({ _id: new ObjectId(id) });
};

export const findBlogPostBySlug = async (slug) => {
  if (isUsingMemoryStore()) {
    return getMemoryStore().blogPosts.find((post) => post.slug === slug) || null;
  }
  return getCollection(env.blogCollection).findOne({ slug });
};

export const insertBlogPost = async (post) => {
  if (isUsingMemoryStore()) {
    getMemoryStore().blogPosts.unshift(post);
    return { insertedId: post._id };
  }
  return getCollection(env.blogCollection).insertOne(post);
};

export const updateBlogPostById = async (id, patch) => {
  if (isUsingMemoryStore()) {
    const post = getMemoryStore().blogPosts.find((item) => item._id.toString() === id);
    if (!post) return null;
    Object.assign(post, patch, { updatedAt: new Date() });
    return post;
  }
  return getCollection(env.blogCollection).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...patch, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );
};

export const deleteBlogPostById = async (id) => {
  if (isUsingMemoryStore()) {
    const posts = getMemoryStore().blogPosts;
    const index = posts.findIndex((post) => post._id.toString() === id);
    if (index === -1) return null;
    const [deleted] = posts.splice(index, 1);
    return deleted;
  }
  const post = await findBlogPostById(id);
  if (!post) return null;
  await getCollection(env.blogCollection).deleteOne({ _id: new ObjectId(id) });
  return post;
};
