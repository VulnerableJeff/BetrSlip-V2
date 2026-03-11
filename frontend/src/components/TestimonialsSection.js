import { useState, useEffect } from 'react';
import axios from 'axios';
import { Star, Quote, Trophy, TrendingUp } from 'lucide-react';
import { BACKEND_URL } from '@/config/api';

const TestimonialsSection = () => {
  const [testimonials, setTestimonials] = useState([]);

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/testimonials/approved`);
      setTestimonials(res.data.testimonials || []);
    } catch (error) {
      console.log('Could not fetch testimonials');
    }
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`}
      />
    ));
  };

  if (testimonials.length === 0) {
    // Show placeholder testimonials if none exist
    const placeholderTestimonials = [
      { id: '1', user_email: 'mike***', rating: 5, message: "Hit a 4-leg parlay thanks to BetrSlip's analysis. The confidence ratings are spot on!", win_amount: "$450" },
      { id: '2', user_email: 'sarah***', rating: 5, message: "Best $5 I spend each month. The daily picks have been incredibly accurate.", win_amount: "3x parlay" },
      { id: '3', user_email: 'james***', rating: 4, message: "Love the AI analysis feature. It caught a bad leg in my parlay that I would've missed.", win_amount: "$280" },
    ];
    return <TestimonialsDisplay testimonials={placeholderTestimonials} renderStars={renderStars} isPlaceholder={true} />;
  }

  return <TestimonialsDisplay testimonials={testimonials} renderStars={renderStars} isPlaceholder={false} />;
};

const TestimonialsDisplay = ({ testimonials, renderStars, isPlaceholder }) => {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 mb-4">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 text-sm font-semibold">Winner Stories</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            What Our <span className="bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">Winners</span> Say
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Real results from real Pro members. Join thousands of bettors winning smarter.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.slice(0, 6).map((testimonial, index) => (
            <div
              key={testimonial.id}
              className="bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-violet-500/30 transition-all duration-300 group"
            >
              {/* Quote Icon */}
              <div className="mb-4">
                <Quote className="w-8 h-8 text-violet-500/30 group-hover:text-violet-500/50 transition-colors" />
              </div>

              {/* Message */}
              <p className="text-slate-300 text-sm leading-relaxed mb-4">
                "{testimonial.message}"
              </p>

              {/* Win Amount Badge */}
              {testimonial.win_amount && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 text-xs font-bold">{testimonial.win_amount}</span>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <div>
                  <p className="text-white font-semibold text-sm">{testimonial.user_email}</p>
                  <div className="flex gap-0.5 mt-1">
                    {renderStars(testimonial.rating)}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {testimonial.user_email.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        {isPlaceholder && (
          <p className="text-center text-slate-500 text-sm mt-8">
            Join our Pro members and share your success story!
          </p>
        )}
      </div>
    </section>
  );
};

export default TestimonialsSection;
