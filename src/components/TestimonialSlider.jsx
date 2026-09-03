import { useEffect, useState } from 'react';
import { Quote } from 'lucide-react';
import { getPublishedTestimonials } from '../services/api';

const TestimonialSlider = () => {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadTestimonials = async () => {
      try {
        const result = await getPublishedTestimonials();
        if (isMounted && result.success) {
          setTestimonials(result.data?.testimonials || []);
        }
      } catch {
        if (isMounted) setTestimonials([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadTestimonials();

    return () => {
      isMounted = false;
    };
  }, []);

  const extendedTestimonials = [...testimonials, ...testimonials];

  return (
    <div className="w-full overflow-hidden bg-primary-50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10 text-center">
        <h2 className="text-3xl font-display font-bold text-gray-900">What Our Students Say</h2>
        <p className="mt-4 text-lg text-gray-600">Real stories from limitless achievers.</p>
      </div>
      
      <div className="relative flex overflow-hidden">
        <div className="animate-scroll flex w-[200%] gap-6 pl-6">
          {loading ? (
            <div className="flex-shrink-0 w-80 md:w-96 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <p className="text-gray-600">Loading testimonials...</p>
            </div>
          ) : extendedTestimonials.map((testimonial, idx) => (
            <div 
              key={`${testimonial.id}-${idx}`} 
              className="flex-shrink-0 w-80 md:w-96 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between"
            >
              <div>
                <Quote className="h-8 w-8 text-primary-300 mb-4" />
                <p className="text-gray-700 italic leading-relaxed mb-6">"{testimonial.text}"</p>
              </div>
              <div>
                <div className="h-px w-12 bg-accent-500 mb-4"></div>
                <h4 className="font-semibold text-gray-900 font-display text-lg">{testimonial.name}</h4>
                {testimonial.role && <p className="text-sm text-gray-500">{testimonial.role}</p>}
                <div className="flex text-accent-500 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TestimonialSlider;
