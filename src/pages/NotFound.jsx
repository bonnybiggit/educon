import { Link } from 'react-router-dom';
import Seo from '../components/Seo';

const NotFound = () => (
  <div className="min-h-screen bg-gray-50 py-20 px-4 flex items-center justify-center">
    <Seo title="Page Not Found | Universe Consult" description="The page you requested could not be found." pathname="/404" noIndex />
    <div className="text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-primary-600">404</p>
      <h1 className="text-4xl font-display font-bold text-gray-900 mt-2">Page not found</h1>
      <p className="text-gray-600 mt-3">The page you requested does not exist.</p>
      <Link to="/" className="inline-block mt-6 px-6 py-3 bg-primary-600 text-white rounded-lg">Return home</Link>
    </div>
  </div>
);

export default NotFound;