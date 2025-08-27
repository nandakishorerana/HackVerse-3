import { useState } from 'react';
import { Send, Phone, Mail, MapPin, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    setTimeout(() => {
      toast({
        title: "Message Sent!",
        description: "Thank you for contacting us. We'll get back to you within 24 hours.",
      });
      
      setFormData({ name: '', email: '', message: '' });
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <section id="contact" className="py-20 bg-muted/20 scroll-target">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Get In Touch
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Have questions or need a custom service? We're here to help your community
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-semibold mb-4">Send us a message</h3>
              <p className="text-muted-foreground">
                Fill out the form below and we'll respond within 24 hours
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  placeholder="Enter your email address"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 resize-none"
                  placeholder="Tell us about your service needs..."
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-neon flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Send Message</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-semibold mb-4">Contact Information</h3>
              <p className="text-muted-foreground">
                Reach out to us through any of these channels
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start space-x-4 p-4 rounded-lg bg-card/50 border border-border/50 hover:bg-card transition-colors">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">Phone</h4>
                  <p className="text-muted-foreground">+91 98765 43210</p>
                  <p className="text-sm text-muted-foreground">Available 24/7</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-4 rounded-lg bg-card/50 border border-border/50 hover:bg-card transition-colors">
                <div className="p-2 bg-secondary/20 rounded-lg">
                  <Mail className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <h4 className="font-semibold">Email</h4>
                  <p className="text-muted-foreground">hello@communityservices.in</p>
                  <p className="text-sm text-muted-foreground">Response within 24hrs</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-4 rounded-lg bg-card/50 border border-border/50 hover:bg-card transition-colors">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <MapPin className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h4 className="font-semibold">Service Areas</h4>
                  <p className="text-muted-foreground">Tier-2 & Tier-3 Cities</p>
                  <p className="text-sm text-muted-foreground">Across India</p>
                </div>
              </div>

              <div className="flex items-start space-x-4 p-4 rounded-lg bg-card/50 border border-border/50 hover:bg-card transition-colors">
                <div className="p-2 bg-muted rounded-lg">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">Business Hours</h4>
                  <p className="text-muted-foreground">Mon - Sat: 8AM - 8PM</p>
                  <p className="text-sm text-muted-foreground">Emergency services available</p>
                </div>
              </div>
            </div>

            {/* Quick Call to Action */}
            <div className="p-6 bg-gradient-primary rounded-lg text-white">
              <h4 className="text-xl font-semibold mb-2">Need Urgent Service?</h4>
              <p className="mb-4 opacity-90">
                Call us directly for immediate assistance
              </p>
              <button
                onClick={() => alert('Calling +91 98765 43210...')}
                className="bg-white text-primary px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              >
                Call Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;