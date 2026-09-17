import Seo from '../components/Seo';

const Terms = () => (
  <div className="min-h-screen bg-gray-50 py-16 px-4">
    <Seo title="Terms of Service | Universe Consult" description="Universe Consult terms of service." pathname="/terms" noIndex />
    <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-8 md:p-10">
      <h1 className="text-3xl font-display font-bold text-gray-900">Terms of Service</h1>
      <p className="text-gray-600 mt-4">By using Universe Consult services, you agree to provide accurate information and to use this website and portal lawfully.</p>
      <h2 className="text-xl font-bold text-gray-900 mt-8">Our services</h2>
      <p className="text-gray-600 mt-2">We provide guidance and application support. Admission, visa, and other decisions remain with the relevant universities and authorities.</p>
      <h2 className="text-xl font-bold text-gray-900 mt-8">Your responsibilities</h2>
      <p className="text-gray-600 mt-2">Keep your account details confidential, submit genuine documents, and notify us promptly if your information changes.</p>
      <p className="text-gray-600 mt-8">Last updated: September 17, 2026</p>
    </div>
  </div>
);

export default Terms;