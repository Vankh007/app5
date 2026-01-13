import { useState } from 'react';
import { ArrowLeft, Search, HelpCircle, CreditCard, User, Play, Shield, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const faqCategories = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Play,
    questions: [
      {
        q: 'How do I create an account?',
        a: 'Creating an account is easy! Click the "Sign Up" button in the top right corner, enter your email address, create a password, and verify your email. You can also sign up using your Google account for faster registration.'
      },
      {
        q: 'Is KHMERZOON free to use?',
        a: 'KHMERZOON offers both free and premium content. Free users can access a selection of content with advertisements. Premium members enjoy ad-free viewing, exclusive content, and additional features.'
      },
      {
        q: 'What devices can I use to watch content?',
        a: 'KHMERZOON works on most modern devices including desktop computers, laptops, tablets, and smartphones. We support Chrome, Firefox, Safari, and Edge browsers. Our platform is also available as a Progressive Web App (PWA) for mobile devices.'
      },
      {
        q: 'How do I find content to watch?',
        a: 'You can browse content by category (Movies, Series, Anime), use our search feature to find specific titles, or explore our curated collections. We also provide personalized recommendations based on your viewing history.'
      }
    ]
  },
  {
    id: 'account',
    title: 'Account & Profile',
    icon: User,
    questions: [
      {
        q: 'How do I reset my password?',
        a: 'Click "Forgot Password" on the login page, enter your email address, and we will send you a password reset link. Check your spam folder if you do not receive the email within a few minutes.'
      },
      {
        q: 'How do I update my profile information?',
        a: 'Log in to your account and go to your Dashboard. Click on your profile picture or settings icon to access your profile settings where you can update your name, email, profile picture, and preferences.'
      },
      {
        q: 'Can I have multiple profiles on one account?',
        a: 'Currently, each account supports one profile. We are working on multi-profile support for families and households, which will be available in a future update.'
      },
      {
        q: 'How do I delete my account?',
        a: 'To delete your account, please contact our support team at support@khmerzoon.biz. Note that account deletion is permanent and you will lose access to any purchased content or remaining subscription time.'
      }
    ]
  },
  {
    id: 'subscription',
    title: 'Subscription & Billing',
    icon: CreditCard,
    questions: [
      {
        q: 'What payment methods do you accept?',
        a: 'We accept various payment methods including credit/debit cards, mobile payments, and local payment options like KHQR for Cambodian users. Payment options may vary by region.'
      },
      {
        q: 'How do I upgrade to Premium?',
        a: 'Visit the Premium page from your dashboard or the main menu. Choose a subscription plan that suits you, complete the payment process, and enjoy instant access to all premium features.'
      },
      {
        q: 'Can I cancel my subscription anytime?',
        a: 'Yes, you can cancel your subscription at any time. Your premium access will continue until the end of your current billing period. No refunds are provided for partial months.'
      },
      {
        q: 'Do you offer refunds?',
        a: 'Refunds are considered on a case-by-case basis. If you experience technical issues that prevent you from using the service, please contact our support team within 7 days of your payment.'
      },
      {
        q: 'What is included in the Premium subscription?',
        a: 'Premium subscribers enjoy: ad-free viewing, access to exclusive content, HD and 4K streaming quality, offline downloads, priority customer support, and early access to new releases.'
      }
    ]
  },
  {
    id: 'playback',
    title: 'Video Playback',
    icon: Play,
    questions: [
      {
        q: 'Why is my video buffering or loading slowly?',
        a: 'Video buffering can be caused by slow internet connection, network congestion, or device limitations. Try lowering the video quality in settings, checking your internet speed, or restarting your device/browser.'
      },
      {
        q: 'Can I download content for offline viewing?',
        a: 'Offline downloads are available for Premium subscribers on supported devices. Look for the download icon on content pages. Downloaded content expires after 30 days or 48 hours after you start watching.'
      },
      {
        q: 'What video quality options are available?',
        a: 'We offer multiple quality options: Auto (adjusts based on your connection), 360p, 480p, 720p HD, 1080p Full HD, and 4K UHD (where available). Premium users have access to higher quality streams.'
      },
      {
        q: 'Why are subtitles not showing?',
        a: 'Check if subtitles are enabled in the video player settings (CC icon). Not all content has subtitles available. If subtitles are enabled but not showing, try refreshing the page or clearing your browser cache.'
      }
    ]
  },
  {
    id: 'security',
    title: 'Privacy & Security',
    icon: Shield,
    questions: [
      {
        q: 'How is my personal information protected?',
        a: 'We use industry-standard encryption to protect your data. Your personal information is never sold to third parties. Read our Privacy Policy for detailed information about how we handle your data.'
      },
      {
        q: 'What data do you collect?',
        a: 'We collect basic account information (email, name), viewing history for recommendations, and usage analytics to improve our service. You can manage your privacy settings in your account dashboard.'
      },
      {
        q: 'How do I report a security concern?',
        a: 'If you notice any security issues or suspicious activity on your account, please contact us immediately at support@khmerzoon.biz. We take security concerns very seriously.'
      }
    ]
  }
];

export default function FAQ() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredCategories = faqCategories.map(category => ({
    ...category,
    questions: category.questions.filter(
      q => q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
           q.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  const displayCategories = selectedCategory 
    ? filteredCategories.filter(c => c.id === selectedCategory)
    : filteredCategories;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <div className="text-center mb-10">
        <HelpCircle className="h-12 w-12 text-primary mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-3">Frequently Asked Questions</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Find answers to common questions about KHMERZOON. Cannot find what you are looking for? 
          Contact our support team.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search for answers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        <Button
          variant={selectedCategory === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory(null)}
        >
          All
        </Button>
        {faqCategories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category.id)}
          >
            <category.icon className="h-4 w-4 mr-1" />
            {category.title}
          </Button>
        ))}
      </div>

      {/* FAQ Sections */}
      <div className="space-y-8">
        {displayCategories.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
              <Button 
                variant="link" 
                onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}
              >
                Clear search
              </Button>
            </CardContent>
          </Card>
        ) : (
          displayCategories.map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <category.icon className="h-5 w-5 text-primary" />
                  {category.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {category.questions.map((item, index) => (
                    <AccordionItem key={index} value={`${category.id}-${index}`}>
                      <AccordionTrigger className="text-left">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Still Need Help */}
      <Card className="mt-10 bg-primary/5 border-primary/20">
        <CardContent className="py-8 text-center">
          <Mail className="h-10 w-10 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Still have questions?</h2>
          <p className="text-muted-foreground mb-4">
            Our support team is here to help you with any questions or issues.
          </p>
          <Button onClick={() => navigate('/contact')}>
            Contact Support
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
