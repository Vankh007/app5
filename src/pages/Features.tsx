import { ArrowLeft, Play, Download, Users, Globe, Shield, Zap, Smartphone, Star, Bell, Clock, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const mainFeatures = [
  {
    icon: Play,
    title: 'High Quality Streaming',
    description: 'Enjoy crystal-clear video quality up to 4K UHD. Our adaptive streaming technology ensures smooth playback regardless of your internet speed.',
    highlights: ['4K UHD Support', 'Adaptive Bitrate', 'Buffer-free Experience']
  },
  {
    icon: Globe,
    title: 'Multi-Language Support',
    description: 'Access content with subtitles and audio options in multiple languages. Breaking language barriers to bring entertainment to everyone.',
    highlights: ['Multiple Subtitles', 'Dubbed Content', 'Khmer & English UI']
  },
  {
    icon: Smartphone,
    title: 'Watch Anywhere',
    description: 'Stream on your desktop, laptop, tablet, or smartphone. Our responsive design ensures a great experience on any screen size.',
    highlights: ['Cross-device Sync', 'PWA Support', 'Responsive Design']
  },
  {
    icon: Download,
    title: 'Offline Downloads',
    description: 'Download your favorite content and watch offline. Perfect for travel, commutes, or areas with limited internet connectivity.',
    highlights: ['Premium Feature', 'Automatic Quality', '30-day Availability'],
    premium: true
  },
  {
    icon: Shield,
    title: 'Safe & Secure',
    description: 'Your privacy matters. We use enterprise-grade encryption to protect your data and never share your personal information with third parties.',
    highlights: ['End-to-end Encryption', 'No Data Selling', 'Secure Payments']
  },
  {
    icon: Users,
    title: 'Community Features',
    description: 'Connect with other viewers through comments, ratings, and reviews. Discover new content through community recommendations.',
    highlights: ['User Reviews', 'Ratings System', 'Social Sharing']
  }
];

const additionalFeatures = [
  {
    icon: Bell,
    title: 'Notifications',
    description: 'Get notified when new episodes are released or when your favorite content is added.'
  },
  {
    icon: Clock,
    title: 'Watch History',
    description: 'Track everything you have watched and easily continue from where you left off.'
  },
  {
    icon: Star,
    title: 'Personalized Recommendations',
    description: 'Our algorithm learns your preferences to suggest content you will love.'
  },
  {
    icon: Film,
    title: 'Curated Collections',
    description: 'Explore hand-picked collections organized by themes, genres, and occasions.'
  },
  {
    icon: Zap,
    title: 'Fast Loading',
    description: 'Our optimized platform ensures quick page loads and instant playback start.'
  },
  {
    icon: Play,
    title: 'Continue Watching',
    description: 'Pick up exactly where you left off, even when switching between devices.'
  }
];

export default function Features() {
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Platform Features</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Discover all the features that make KHMERZOON your ultimate entertainment destination.
        </p>
      </div>

      {/* Main Features */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        {mainFeatures.map((feature) => (
          <Card key={feature.title} className="relative overflow-hidden">
            {feature.premium && (
              <Badge className="absolute top-4 right-4 bg-gradient-to-r from-yellow-500 to-amber-500">
                Premium
              </Badge>
            )}
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{feature.description}</p>
              <div className="flex flex-wrap gap-2">
                {feature.highlights.map((highlight) => (
                  <Badge key={highlight} variant="secondary" className="text-xs">
                    {highlight}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Features */}
      <div className="mb-16">
        <h2 className="text-2xl font-semibold text-center mb-8">More Features You Will Love</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {additionalFeatures.map((feature) => (
            <Card key={feature.title} className="bg-card/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Comparison */}
      <Card className="mb-12">
        <CardHeader>
          <CardTitle className="text-center">Free vs Premium</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Feature</th>
                  <th className="text-center py-3 px-4">Free</th>
                  <th className="text-center py-3 px-4">Premium</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="py-3 px-4">Access to Free Content</td>
                  <td className="text-center py-3 px-4 text-green-500">✓</td>
                  <td className="text-center py-3 px-4 text-green-500">✓</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">HD Streaming (720p)</td>
                  <td className="text-center py-3 px-4 text-green-500">✓</td>
                  <td className="text-center py-3 px-4 text-green-500">✓</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">Ad-Free Experience</td>
                  <td className="text-center py-3 px-4 text-muted-foreground">—</td>
                  <td className="text-center py-3 px-4 text-green-500">✓</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">4K Ultra HD</td>
                  <td className="text-center py-3 px-4 text-muted-foreground">—</td>
                  <td className="text-center py-3 px-4 text-green-500">✓</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">Exclusive Content</td>
                  <td className="text-center py-3 px-4 text-muted-foreground">—</td>
                  <td className="text-center py-3 px-4 text-green-500">✓</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">Offline Downloads</td>
                  <td className="text-center py-3 px-4 text-muted-foreground">—</td>
                  <td className="text-center py-3 px-4 text-green-500">✓</td>
                </tr>
                <tr>
                  <td className="py-3 px-4">Priority Support</td>
                  <td className="text-center py-3 px-4 text-muted-foreground">—</td>
                  <td className="text-center py-3 px-4 text-green-500">✓</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <div className="text-center bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-8">
        <h2 className="text-2xl font-semibold mb-4">Experience All Features</h2>
        <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
          Start with a free account and upgrade anytime to unlock premium features.
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg" onClick={() => navigate('/auth')}>
            Get Started Free
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/premium')}>
            View Premium Plans
          </Button>
        </div>
      </div>
    </div>
  );
}
