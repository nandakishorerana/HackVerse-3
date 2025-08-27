import { Heart, Home, Phone, Mail, MapPin } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-background border-t border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Home className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">Community Services</span>
            </div>
            <p className="text-muted-foreground">
              Connecting communities with trusted local service providers across India's tier-2 and tier-3 cities.
            </p>
            <div className="flex space-x-4">
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer">
                <span className="text-sm font-bold">f</span>
              </div>
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer">
                <span className="text-sm font-bold">t</span>
              </div>
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer">
                <span className="text-sm font-bold">in</span>
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Our Services</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li className="hover:text-primary transition-colors cursor-pointer">House Cleaning</li>
              <li className="hover:text-primary transition-colors cursor-pointer">Plumbing</li>
              <li className="hover:text-primary transition-colors cursor-pointer">Electrical Work</li>
              <li className="hover:text-primary transition-colors cursor-pointer">Carpentry</li>
              <li className="hover:text-primary transition-colors cursor-pointer">Painting</li>
              <li className="hover:text-primary transition-colors cursor-pointer">Appliance Repair</li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Company</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li className="hover:text-primary transition-colors cursor-pointer">About Us</li>
              <li className="hover:text-primary transition-colors cursor-pointer">How It Works</li>
              <li className="hover:text-primary transition-colors cursor-pointer">Become a Partner</li>
              <li className="hover:text-primary transition-colors cursor-pointer">Safety Standards</li>
              <li className="hover:text-primary transition-colors cursor-pointer">Terms & Conditions</li>
              <li className="hover:text-primary transition-colors cursor-pointer">Privacy Policy</li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>+91 98765 43210</span>
              </div>
              <div className="flex items-center space-x-3 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>hello@communityservices.in</span>
              </div>
              <div className="flex items-center space-x-3 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>Serving Tier-2 & Tier-3 Cities</span>
              </div>
            </div>
            
            {/* Newsletter */}
            <div className="mt-6">
              <h4 className="font-medium mb-2">Stay Updated</h4>
              <div className="flex space-x-2">
                <input
                  type="email"
                  placeholder="Enter email"
                  className="flex-1 px-3 py-2 bg-muted rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:scale-105 transition-transform text-sm">
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-border/50">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-center md:text-left">
              <p className="text-muted-foreground flex items-center justify-center md:justify-start space-x-2">
                <span>© {currentYear} Community Home Services | Thank you for watching</span>
                <Heart className="w-4 h-4 text-red-500 animate-pulse" />
              </p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>Made with</span>
              <Heart className="w-4 h-4 text-red-500" />
              <span>for Indian Communities</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;