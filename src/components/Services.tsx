import { ArrowRight } from 'lucide-react';
import cleanerIcon from '@/assets/icon-cleaner.png';
import plumberIcon from '@/assets/icon-plumber.png';
import carpenterIcon from '@/assets/icon-carpenter.png';
import mechanicIcon from '@/assets/icon-mechanic.png';
import electricianIcon from '@/assets/icon-electrician.png';
import painterIcon from '@/assets/icon-painter.png';
import gardenerIcon from '@/assets/icon-gardener.png';
import applianceIcon from '@/assets/icon-appliance.png';

const Services = () => {
  const services = [
    {
      name: 'House Cleaning',
      description: 'Professional cleaning services for homes and offices',
      icon: cleanerIcon,
      price: 'Starting ₹299',
    },
    {
      name: 'Plumbing',
      description: 'Expert plumbing repairs and installations',
      icon: plumberIcon,
      price: 'Starting ₹199',
    },
    {
      name: 'Carpentry',
      description: 'Custom furniture and woodwork solutions',
      icon: carpenterIcon,
      price: 'Starting ₹399',
    },
    {
      name: 'Vehicle Repair',
      description: 'Reliable mechanics for all vehicle types',
      icon: mechanicIcon,
      price: 'Starting ₹299',
    },
    {
      name: 'Electrical Work',
      description: 'Safe electrical repairs and installations',
      icon: electricianIcon,
      price: 'Starting ₹199',
    },
    {
      name: 'Painting',
      description: 'Interior and exterior painting services',
      icon: painterIcon,
      price: 'Starting ₹499',
    },
    {
      name: 'Gardening',
      description: 'Garden maintenance and landscaping',
      icon: gardenerIcon,
      price: 'Starting ₹249',
    },
    {
      name: 'Appliance Repair',
      description: 'Fix and maintain household appliances',
      icon: applianceIcon,
      price: 'Starting ₹179',
    },
  ];

  const handleBookNow = (serviceName: string) => {
    alert(`Booking ${serviceName} service... We'll connect you with verified professionals in your area!`);
  };

  return (
    <section id="services" className="py-20 bg-background scroll-target">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Our Services
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Professional home services delivered by trusted local experts in your community
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <div
              key={service.name}
              className="service-card group cursor-pointer"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Service Icon */}
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 rounded-xl bg-gradient-primary p-3 group-hover:scale-110 transition-transform duration-300">
                  <img
                    src={service.icon}
                    alt={`${service.name} icon`}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* Service Content */}
              <div className="text-center space-y-4">
                <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                  {service.name}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {service.description}
                </p>
                
                {/* Price */}
                <div className="text-lg font-bold text-secondary">
                  {service.price}
                </div>

                {/* Book Now Button */}
                <button
                  onClick={() => handleBookNow(service.name)}
                  className="w-full mt-4 px-4 py-2 bg-muted hover:bg-primary hover:text-primary-foreground rounded-lg transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center space-x-2"
                >
                  <span>Book Now</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Hover Glow Effect */}
              <div className="absolute inset-0 rounded-lg bg-gradient-primary opacity-0 group-hover:opacity-10 transition-opacity duration-300 -z-10"></div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-muted-foreground mb-6">
            Need a custom service not listed above?
          </p>
          <button
            onClick={() => {
              const element = document.getElementById('contact');
              if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="btn-neon"
          >
            Contact Us for Custom Services
          </button>
        </div>
      </div>
    </section>
  );
};

export default Services;