const AdminPlaceholder = ({ title, message }) => {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
      <h1 className="text-3xl font-display font-bold text-slate-900 mb-4">{title}</h1>
      <p className="text-slate-600">{message}</p>
    </div>
  );
};

export const AdminEnquiries = () => (
  <AdminPlaceholder title="Enquiries" message="Enquiries management will be available here." />
);

export const AdminServices = () => (
  <AdminPlaceholder title="Services" message="Services management will be available here." />
);

export const AdminTestimonials = () => (
  <AdminPlaceholder title="Testimonials" message="Testimonials management will be available here." />
);

export const AdminBlog = () => (
  <AdminPlaceholder title="Blog" message="Blog management will be available here." />
);

export const AdminSettings = () => (
  <AdminPlaceholder title="Settings" message="Settings management will be available here." />
);
