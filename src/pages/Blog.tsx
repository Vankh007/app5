import { ArrowLeft, Calendar, Clock, ArrowRight, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Static blog posts for content - these could be fetched from database later
const blogPosts = [
  {
    id: '1',
    title: 'Top 10 Must-Watch Movies This Season',
    excerpt: 'Discover the most anticipated films that are making waves in the entertainment industry. From action-packed blockbusters to heartfelt dramas, here are our top picks for this season.',
    category: 'Recommendations',
    date: '2024-01-15',
    readTime: '5 min read',
    image: null
  },
  {
    id: '2',
    title: 'How to Get the Most Out of Your Streaming Experience',
    excerpt: 'Learn tips and tricks to enhance your viewing experience on KHMERZOON. From optimizing video quality to organizing your watchlist, we cover everything you need to know.',
    category: 'Tips & Tricks',
    date: '2024-01-10',
    readTime: '4 min read',
    image: null
  },
  {
    id: '3',
    title: 'The Rise of Asian Cinema: A Cultural Journey',
    excerpt: 'Explore the growing influence of Asian cinema on global entertainment. From Korean dramas to Japanese anime, discover how Asian content is captivating audiences worldwide.',
    category: 'Culture',
    date: '2024-01-05',
    readTime: '7 min read',
    image: null
  },
  {
    id: '4',
    title: 'New Features Coming to KHMERZOON in 2024',
    excerpt: 'We are excited to share our roadmap for 2024! Discover the new features, improvements, and content additions coming to KHMERZOON this year.',
    category: 'Updates',
    date: '2024-01-01',
    readTime: '3 min read',
    image: null
  },
  {
    id: '5',
    title: 'Understanding Different Video Quality Options',
    excerpt: 'Not sure what the difference between 720p, 1080p, and 4K means for your viewing experience? This guide explains everything about video quality and how to choose the right setting.',
    category: 'Tips & Tricks',
    date: '2023-12-28',
    readTime: '4 min read',
    image: null
  },
  {
    id: '6',
    title: 'Family-Friendly Content Guide for Parents',
    excerpt: 'A comprehensive guide for parents looking for age-appropriate content on KHMERZOON. Learn about our content ratings and how to set up parental controls.',
    category: 'Guides',
    date: '2023-12-20',
    readTime: '6 min read',
    image: null
  }
];

const categories = ['All', 'Recommendations', 'Tips & Tricks', 'Culture', 'Updates', 'Guides'];

export default function Blog() {
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">KHMERZOON Blog</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Stay updated with the latest news, tips, and recommendations from KHMERZOON.
        </p>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2 justify-center mb-10">
        {categories.map((category) => (
          <Button
            key={category}
            variant={category === 'All' ? 'default' : 'outline'}
            size="sm"
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Featured Post */}
      <Card className="mb-10 overflow-hidden">
        <div className="grid md:grid-cols-2">
          <div className="bg-gradient-to-br from-primary/20 to-primary/5 min-h-[250px] flex items-center justify-center">
            <Tag className="h-20 w-20 text-primary/50" />
          </div>
          <div className="p-6 flex flex-col justify-center">
            <Badge className="w-fit mb-3">{blogPosts[0].category}</Badge>
            <h2 className="text-2xl font-bold mb-3">{blogPosts[0].title}</h2>
            <p className="text-muted-foreground mb-4">{blogPosts[0].excerpt}</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(blogPosts[0].date)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {blogPosts[0].readTime}
              </span>
            </div>
            <Button className="w-fit">
              Read More
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Posts Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {blogPosts.slice(1).map((post) => (
          <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="bg-gradient-to-br from-muted to-muted/50 h-40 flex items-center justify-center">
              <Tag className="h-12 w-12 text-muted-foreground/30" />
            </div>
            <CardHeader className="pb-2">
              <Badge variant="secondary" className="w-fit mb-2">{post.category}</Badge>
              <h3 className="font-semibold line-clamp-2">{post.title}</h3>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{post.excerpt}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(post.date)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {post.readTime}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Newsletter Signup */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-10 text-center">
          <h2 className="text-2xl font-semibold mb-3">Subscribe to Our Newsletter</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Get the latest updates, movie recommendations, and exclusive content delivered 
            straight to your inbox.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-2 rounded-md border border-input bg-background"
            />
            <Button>Subscribe</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            By subscribing, you agree to our Privacy Policy. Unsubscribe anytime.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
