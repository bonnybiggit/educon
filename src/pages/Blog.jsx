import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, FileText } from 'lucide-react';
import Seo from '../components/Seo';
import { getPublishedBlogPosts } from '../services/api';

const formatDate = (value) => new Date(value).toLocaleDateString(undefined, {
  year: 'numeric', month: 'long', day: 'numeric',
});

const Blog = () => {
  const [posts, setPosts] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let active = true;
    getPublishedBlogPosts()
      .then((result) => {
        if (!active) return;
        setPosts(result.success ? result.data?.posts || [] : []);
        setStatus(result.success ? 'ready' : 'error');
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => { active = false; };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <Seo title="Blog | Universe Consult" description="Guidance and insights for international students from Universe Consult." pathname="/blog" />
      <div className="max-w-6xl mx-auto">
        <div className="max-w-2xl mb-10">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">Insights</p>
          <h1 className="text-4xl font-display font-bold text-gray-900 mt-2">Study abroad guidance</h1>
          <p className="text-gray-600 mt-3">Practical advice and updates to help you move confidently toward your next academic opportunity.</p>
        </div>

        {status === 'loading' && <p className="text-gray-600">Loading articles...</p>}
        {status === 'error' && <p className="text-red-600">Unable to load articles right now.</p>}
        {status === 'ready' && posts.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-10 text-center">
            <FileText className="w-10 h-10 text-primary-600 mx-auto" />
            <h2 className="text-xl font-bold text-gray-900 mt-4">No articles published yet</h2>
            <p className="text-gray-600 mt-2">Please check back soon for the latest guidance.</p>
          </div>
        )}
        {status === 'ready' && posts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <article key={post.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                {post.featuredImageUrl && <img src={post.featuredImageUrl} alt="" className="w-full h-48 object-cover" />}
                <div className="p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">{post.category}</p>
                  <h2 className="text-xl font-bold text-gray-900 mt-2">{post.title}</h2>
                  <p className="text-gray-600 text-sm mt-3">{post.excerpt}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-5"><Calendar className="w-4 h-4" />{formatDate(post.updatedAt || post.createdAt)}</div>
                  <Link to={`/blog/${post.slug}`} className="inline-flex items-center gap-2 mt-5 text-primary-600 font-semibold hover:text-primary-800">Read article <ArrowRight className="w-4 h-4" /></Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Blog;