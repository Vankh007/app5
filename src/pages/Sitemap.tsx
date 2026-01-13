import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, Film, Tv, Crown, FileText, Mail, Info, List, Clock, Heart, MapPin, Shield, FileCheck } from 'lucide-react';

const sitemapSections = [
  {
    title: 'Main Pages',
    icon: Home,
    links: [
      { name: 'Home', path: '/' },
      { name: 'Movies', path: '/movies' },
      { name: 'Series', path: '/series' },
      { name: 'Collections', path: '/collections' },
      { name: 'Shorts', path: '/shorts' },
    ]
  },
  {
    title: 'Premium',
    icon: Crown,
    links: [
      { name: 'Premium Membership', path: '/premium' },
      { name: 'Subscriptions', path: '/subscriptions' },
      { name: 'Shop', path: '/shop' },
    ]
  },
  {
    title: 'User Account',
    icon: Heart,
    links: [
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'My List', path: '/my-list' },
      { name: 'Watch History', path: '/history' },
      { name: 'Liked Content', path: '/liked' },
      { name: 'My Reports', path: '/my-reports' },
    ]
  },
  {
    title: 'Legal & Policies',
    icon: Shield,
    links: [
      { name: 'Privacy Policy', path: '/privacy-policy' },
      { name: 'Terms of Service', path: '/terms-of-service' },
    ]
  },
  {
    title: 'Company',
    icon: Info,
    links: [
      { name: 'About Us', path: '/about' },
      { name: 'Contact', path: '/contact' },
    ]
  },
];

export default function Sitemap() {
  return (
    <Layout>
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <MapPin className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-3">Sitemap</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Navigate through all pages and sections of KHMERZOON. Find everything you need in one place.
            </p>
          </div>

          {/* Sitemap Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sitemapSections.map((section) => (
              <Card key={section.title} className="bg-card/50 backdrop-blur border-border/50 hover:border-primary/30 transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <section.icon className="h-5 w-5 text-primary" />
                    </div>
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {section.links.map((link) => (
                      <li key={link.path}>
                        <Link
                          to={link.path}
                          className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors py-1.5 px-2 rounded-md hover:bg-primary/5"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                          {link.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* XML Sitemap Link */}
          <div className="mt-12 text-center">
            <Card className="bg-muted/30 border-dashed inline-block">
              <CardContent className="py-6 px-8">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <FileCheck className="h-5 w-5" />
                  <span>Looking for the XML sitemap?</span>
                  <a 
                    href="/sitemap.xml" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-medium"
                  >
                    View sitemap.xml
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
