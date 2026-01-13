import { ArrowLeft, UserPlus, Search, Play, Star, Download, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';

const steps = [
  {
    number: 1,
    icon: UserPlus,
    title: 'Create Your Account',
    description: 'Sign up for free in seconds using your email address or Google account. No credit card required to get started.',
    details: [
      'Quick and easy registration process',
      'Verify your email to activate your account',
      'Set up your profile and preferences',
      'Start exploring content immediately'
    ]
  },
  {
    number: 2,
    icon: Search,
    title: 'Discover Content',
    description: 'Browse our extensive library of movies, series, and anime. Use filters, search, and personalized recommendations to find your next favorite.',
    details: [
      'Browse by genre, year, or popularity',
      'Use advanced search to find specific titles',
      'Get personalized recommendations',
      'Explore curated collections'
    ]
  },
  {
    number: 3,
    icon: Play,
    title: 'Start Watching',
    description: 'Click play and enjoy instant streaming in high quality. Pick up where you left off across all your devices.',
    details: [
      'Stream in HD or 4K quality',
      'Adjust playback settings to your preference',
      'Enable subtitles when available',
      'Continue watching from any device'
    ]
  },
  {
    number: 4,
    icon: Star,
    title: 'Engage & Interact',
    description: 'Rate content, leave reviews, and build your watchlist. Share your favorite finds with friends and the community.',
    details: [
      'Rate movies and shows',
      'Add to your personal watchlist',
      'Leave comments and reviews',
      'Share with friends'
    ]
  }
];

const features = [
  {
    icon: Play,
    title: 'Seamless Streaming',
    description: 'Enjoy buffer-free streaming with adaptive quality that adjusts to your internet speed.'
  },
  {
    icon: Download,
    title: 'Offline Downloads',
    description: 'Premium members can download content to watch offline, perfect for travel or areas with limited connectivity.'
  },
  {
    icon: Shield,
    title: 'Safe & Secure',
    description: 'Your data is protected with industry-standard encryption. We never sell your personal information.'
  }
];

export default function HowItWorks() {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">How KHMERZOON Works</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Getting started with KHMERZOON is easy. Follow these simple steps to begin your 
          entertainment journey.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-12 mb-16">
        {steps.map((step, index) => (
          <div 
            key={step.number}
            className={`flex flex-col md:flex-row gap-8 items-center ${
              index % 2 === 1 ? 'md:flex-row-reverse' : ''
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl">
                  {step.number}
                </div>
                <h2 className="text-2xl font-semibold">{step.title}</h2>
              </div>
              <p className="text-muted-foreground mb-4">{step.description}</p>
              <ul className="space-y-2">
                {step.details.map((detail, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex-1 flex justify-center">
              <Card className="w-48 h-48 bg-gradient-to-br from-primary/20 to-primary/5">
                <CardContent className="h-full flex items-center justify-center">
                  <step.icon className="h-20 w-20 text-primary" />
                </CardContent>
              </Card>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Features */}
      <div className="bg-muted/30 rounded-2xl p-8 mb-12">
        <h2 className="text-2xl font-semibold text-center mb-8">Why Choose KHMERZOON?</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="bg-background">
              <CardContent className="p-6 text-center">
                <feature.icon className="h-10 w-10 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">Ready to Get Started?</h2>
        <p className="text-muted-foreground mb-6">
          Join thousands of users already enjoying KHMERZOON.
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg" onClick={() => navigate('/auth')}>
            Sign Up Free
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/premium')}>
            View Premium Plans
          </Button>
        </div>
      </div>
    </div>
  );
}
