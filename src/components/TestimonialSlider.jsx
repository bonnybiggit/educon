import { Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Korede',
    text: 'I got my admission for masters by research and it allowed me to bring my family with me. I did not pay any service fees. Excellent service, Universe Consults',
  },
  {
    name: 'Doreen',
    text: 'Seamlessly the best Educational consultancy. I rate them 5/5',
  },
  {
    name: 'Jesuseun',
    text: 'I will recommend Universe Consults any day and any time. Thumbs up',
  },
  {
    name: 'Alex',
    text: 'You need personalised services? Think Universe Consults.',
  },
  {
    name: 'Nneka',
    text: 'I have 3rd class and everyone said I cannot study masters abroad. Universe Consults helped me secure my msc admission and assisted until I resumed in September 2025',
  },
];

const TestimonialSlider = () => {
  // Duplicate array to make infinite scrolling seamless
  const extendedTestimonials = [...testimonials, ...testimonials];

  return (
    <div className="w-full overflow-hidden bg-primary-50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10 text-center">
        <h2 className="text-3xl font-display font-bold text-gray-900">What Our Students Say</h2>
        <p className="mt-4 text-lg text-gray-600">Real stories from limitless achievers.</p>
      </div>
      
      <div className="relative flex overflow-hidden">
        <div className="animate-scroll flex w-[200%] gap-6 pl-6">
          {extendedTestimonials.map((testimonial, idx) => (
            <div 
              key={idx} 
              className="flex-shrink-0 w-80 md:w-96 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between"
            >
              <div>
                <Quote className="h-8 w-8 text-primary-300 mb-4" />
                <p className="text-gray-700 italic leading-relaxed mb-6">"{testimonial.text}"</p>
              </div>
              <div>
                <div className="h-px w-12 bg-accent-500 mb-4"></div>
                <h4 className="font-semibold text-gray-900 font-display text-lg">{testimonial.name}</h4>
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
