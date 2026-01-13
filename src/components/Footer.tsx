import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { ChevronUp } from 'lucide-react';
import logoDark from '@/assets/khmerzoon.png';
import logoLight from '@/assets/logo-light-new.png';

export function Footer() {
  const { effectiveTheme } = useTheme();
  const logo = effectiveTheme === 'light' ? logoLight : logoDark;
  const [showMore, setShowMore] = useState(false);

  return (
    <footer className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src={logo} alt="KHMERZOON" className="h-8 w-8 object-contain" />
              <span className="font-bold text-lg">KHMERZOON</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your premier destination for movies, series, and entertainment content.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-3">Browse</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-primary transition-colors">Home</Link></li>
              <li><Link to="/movies" className="hover:text-primary transition-colors">Movies</Link></li>
              <li><Link to="/series" className="hover:text-primary transition-colors">Series</Link></li>
              <li><Link to="/collections" className="hover:text-primary transition-colors">Collections</Link></li>
              <li><Link to="/premium" className="hover:text-primary transition-colors">Premium</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold mb-3">Support</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/faq" className="hover:text-primary transition-colors">FAQ</Link></li>
              <li><Link to="/how-it-works" className="hover:text-primary transition-colors">How It Works</Link></li>
              <li><Link to="/features" className="hover:text-primary transition-colors">Features</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-3">Legal</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms-of-service" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link to="/dmca" className="hover:text-primary transition-colors">DMCA Policy</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-3">Company</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link to="/blog" className="hover:text-primary transition-colors">Blog</Link></li>
              <li><Link to="/careers" className="hover:text-primary transition-colors">Careers</Link></li>
              <li><Link to="/sitemap" className="hover:text-primary transition-colors">Sitemap</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} KHMERZOON. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy</Link>
            <span>•</span>
            <Link to="/terms-of-service" className="hover:text-primary transition-colors">Terms</Link>
            <span>•</span>
            <Link to="/about" className="hover:text-primary transition-colors">About</Link>
            <span>•</span>
            <Link to="/contact" className="hover:text-primary transition-colors">Contact</Link>
            <span>•</span>
            <Link to="/sitemap" className="hover:text-primary transition-colors">Sitemap</Link>
            <span>•</span>
            <div className="relative">
              <button 
                onClick={() => setShowMore(!showMore)}
                className="hover:text-primary transition-colors flex items-center gap-1"
              >
                More
                <ChevronUp className={`h-3 w-3 transition-transform ${showMore ? 'rotate-0' : 'rotate-180'}`} />
              </button>
              {showMore && (
                <div className="absolute bottom-full right-0 mb-2 bg-background border border-border rounded-lg shadow-lg py-2 min-w-[160px] z-50">
                  <Link 
                    to="/faq" 
                    className="block px-4 py-2 hover:bg-muted transition-colors"
                    onClick={() => setShowMore(false)}
                  >
                    FAQ / Help Center
                  </Link>
                  <Link 
                    to="/how-it-works" 
                    className="block px-4 py-2 hover:bg-muted transition-colors"
                    onClick={() => setShowMore(false)}
                  >
                    How It Works
                  </Link>
                  <Link 
                    to="/features" 
                    className="block px-4 py-2 hover:bg-muted transition-colors"
                    onClick={() => setShowMore(false)}
                  >
                    Features
                  </Link>
                  <Link 
                    to="/blog" 
                    className="block px-4 py-2 hover:bg-muted transition-colors"
                    onClick={() => setShowMore(false)}
                  >
                    Blog
                  </Link>
                  <Link 
                    to="/dmca" 
                    className="block px-4 py-2 hover:bg-muted transition-colors"
                    onClick={() => setShowMore(false)}
                  >
                    DMCA Policy
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
