import { ArrowRight, Star, Users, CheckCircle } from 'lucide-react';
import heroImage from '@/assets/hero-services.jpg';

const Hero = () => {
  const scrollToServices = () => {
    const element = document.getElementById('services');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="home" className="min-h-screen flex items-center hero-bg scroll-target">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                <span className="text-glow animate-glow">Trusted Local</span>
                <br />
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  Home Services
                </span>
                <br />
                <span className="text-foreground">For Your Community</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-lg">
                Connect with verified service professionals in tier-2 and tier-3 cities. 
                Quality work, fair prices, community trust.
              </p>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Star className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <div className="font-semibold">4.8+ Rating</div>
                  <div className="text-sm text-muted-foreground">From 10k+ customers</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-secondary/20 rounded-lg">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold">500+ Professionals</div>
                  <div className="text-sm text-muted-foreground">Verified & skilled</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <div className="font-semibold">24/7 Support</div>
                  <div className="text-sm text-muted-foreground">Always here to help</div>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={scrollToServices}
                className="btn-neon flex items-center justify-center space-x-2 group"
              >
                <span>Explore Services</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => {
                  alert('Learn more about our community-driven approach to home services!');
                }}
                className="px-6 py-3 border border-border rounded-lg hover:bg-muted transition-all duration-300 hover:scale-105"
              >
                Learn More
              </button>
            </div>
          </div>

          {/* Right Content - Hero Image */}
          <div className="relative">
            <div className="relative overflow-hidden rounded-2xl animate-float">
              <img
                src={heroImage}
                alt="Professional home service providers"
                className="w-full h-[500px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent"></div>
            </div>
            
            {/* Floating Cards */}
            <div className="absolute -top-4 -right-4 bg-card/90 backdrop-blur-lg rounded-lg p-4 border border-border/50 animate-float" style={{ animationDelay: '1s' }}>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Available Now</span>
              </div>
            </div>
            
            <div className="absolute -bottom-6 -left-6 bg-card/90 backdrop-blur-lg rounded-lg p-4 border border-border/50 animate-float" style={{ animationDelay: '2s' }}>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">₹299</div>
                <div className="text-sm text-muted-foreground">Starting from</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;