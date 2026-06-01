import { Link, useLocation } from 'react-router-dom';

const Logout = () => {
  const { state } = useLocation();
  const name = state?.name || '';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <img src="/logo.png" alt="Logo" className="h-20 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{name ? `Goodbye, ${name}` : 'You have successfully logged out'}</h2>
        <p className="text-gray-600 mb-6">{name ? 'Thank you for using our portal — we hope to see you again soon.' : 'Thanks for visiting — we hope to see you again soon.'}</p>
        <div className="flex justify-center gap-4">
          <Link to="/login" className="px-6 py-3 bg-primary-600 text-white rounded-lg">Sign In</Link>
          <Link to="/portal/setup" className="px-6 py-3 border rounded-lg">Register Now</Link>
        </div>
      </div>
    </div>
  );
};

export default Logout;
