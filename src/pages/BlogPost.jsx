import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar } from 'lucide-react';
import Seo from '../components/Seo';
import { getPublishedBlogPost } from '../services/api';

const formatDate = (value) => new Date(value).toLocaleDateString(undefined, {
  year: 'numeric', month: 'long', day: 'numeric',
});

const BlogPost = () => {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let active = true;
    getPublishedBlogPost(slug)
      .then((result) => {
        if (!active) return;
        setPost(result.success ? result.data?.post || null : null);
        setStatus(result.success ? 'ready' : 'not-found');
      })
      .catch(() => {
        if (active) setStatus('not-found');
      });
    return () => { active = false; };
  }, [slug]);

  if (status === 'loading') return <div className="min-h-screen bg-gray-50 py-16 px-4 text-center text-gray-600">Loading article...</div>;
  if (status === 'not-found' || !post) return <div className="min-h-screen bg-gray-50 py-16 px-4 text-center"><h1 className="text-3xl font-display font-bold text-gray-900">Article not found</h1><Link to="/blog" className="inline-flex items-center gap-2 mt-5 text-primary-600 font-semibold"><ArrowLeft className="w-4 h-4" />Back to blog</Link></div>;

  return (
    <article className="min-h-screen bg-gray-50 py-16 px-4">
      <Seo title={`${post.title} | Universe Consult`} description={post.excerpt} pathname={`/blog/${post.slug}`} />
      <div className="max-w-3xl mx-auto">
        <Link to="/blog" className="inline-flex items-center gap-2 text-primary-600 font-semibold hover:text-primary-800"><ArrowLeft className="w-4 h-4" />Back to blog</Link>
        <p className="text-sm font-semibold uppercase tracking-wider text-primary-600 mt-10">{post.category}</p>
        <h1 className="text-4xl font-display font-bold text-gray-900 mt-2">{post.title}</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500 mt-4"><Calendar className="w-4 h-4" />{formatDate(post.updatedAt || post.createdAt)} <span>by {post.author}</span></div>
        {post.featuredImageUrl && <img src={post.featuredImageUrl} alt="" className="w-full max-h-96 object-cover rounded-2xl mt-8" />}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-10 mt-8 whitespace-pre-wrap text-gray-700 leading-8">{post.content}</div>
      </div>
    </article>
  );
};

export default BlogPost;