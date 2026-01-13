import { ArrowLeft, Briefcase, MapPin, Clock, Heart, Zap, Users, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const benefits = [
  {
    icon: Heart,
    title: 'Health & Wellness',
    description: 'Comprehensive health coverage and wellness programs to keep you at your best.'
  },
  {
    icon: Zap,
    title: 'Growth Opportunities',
    description: 'Continuous learning and development opportunities to advance your career.'
  },
  {
    icon: Users,
    title: 'Great Team',
    description: 'Work with passionate individuals who love entertainment and technology.'
  },
  {
    icon: Globe,
    title: 'Remote Friendly',
    description: 'Flexible work arrangements including remote and hybrid options.'
  }
];

const openPositions = [
  {
    id: '1',
    title: 'Senior Frontend Developer',
    department: 'Engineering',
    location: 'Phnom Penh / Remote',
    type: 'Full-time',
    description: 'We are looking for a skilled frontend developer to help build and improve our streaming platform.',
    requirements: ['3+ years React experience', 'TypeScript proficiency', 'UI/UX sensibility']
  },
  {
    id: '2',
    title: 'Content Curator',
    department: 'Content',
    location: 'Phnom Penh',
    type: 'Full-time',
    description: 'Join our content team to help curate and organize our growing library of entertainment.',
    requirements: ['Passion for movies & TV', 'Strong organizational skills', 'Bilingual (Khmer/English)']
  },
  {
    id: '3',
    title: 'Customer Support Specialist',
    department: 'Support',
    location: 'Phnom Penh',
    type: 'Full-time',
    description: 'Help our users get the most out of KHMERZOON with excellent customer support.',
    requirements: ['Excellent communication', 'Problem-solving skills', 'Customer-first mindset']
  },
  {
    id: '4',
    title: 'Marketing Manager',
    department: 'Marketing',
    location: 'Phnom Penh / Remote',
    type: 'Full-time',
    description: 'Lead our marketing efforts to grow KHMERZOON reach across Cambodia and beyond.',
    requirements: ['5+ years marketing experience', 'Digital marketing expertise', 'Creative thinking']
  }
];

export default function Careers() {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {/* Hero */}
      <div className="text-center mb-12">
        <Briefcase className="h-12 w-12 text-primary mx-auto mb-4" />
        <h1 className="text-4xl font-bold mb-4">Join Our Team</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Help us shape the future of entertainment in Cambodia. We are always looking for 
          talented individuals who share our passion.
        </p>
      </div>

      {/* Why Join Us */}
      <div className="mb-16">
        <h2 className="text-2xl font-semibold text-center mb-8">Why Work at KHMERZOON?</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit) => (
            <Card key={benefit.title} className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Open Positions */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Open Positions</h2>
        <div className="space-y-4">
          {openPositions.map((position) => (
            <Card key={position.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl mb-2">{position.title}</CardTitle>
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        {position.department}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {position.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {position.type}
                      </span>
                    </div>
                  </div>
                  <Button>Apply Now</Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{position.description}</p>
                <div className="flex flex-wrap gap-2">
                  {position.requirements.map((req) => (
                    <Badge key={req} variant="secondary">{req}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* No Suitable Position */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-8 text-center">
          <h2 className="text-xl font-semibold mb-3">Do Not See a Suitable Position?</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            We are always interested in meeting talented people. Send us your resume and tell us 
            how you can contribute to KHMERZOON.
          </p>
          <Button variant="outline" onClick={() => navigate('/contact')}>
            Get in Touch
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
