import { useState, useEffect } from 'react';
import { ArrowLeft, Play, Users, Globe, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

export default function AboutUs() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('About KHMERZOON');
  const [content, setContent] = useState('');

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const { data, error } = await supabase
          .from('content_sections')
          .select('title, content')
          .eq('section_key', 'about_us')
          .eq('is_active', true)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
          if (data.title) setTitle(data.title);
          if (data.content) setContent(data.content);
        }
      } catch (error) {
        console.error('Error fetching about us:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>
      
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="space-y-3 mt-8">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ) : (
        <>
          <h1 className="text-3xl font-bold mb-6">{title}</h1>
          
          {content ? (
            <div 
              className="prose prose-neutral dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <div className="space-y-8">
              <section>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  KHMERZOON is a premier streaming platform dedicated to bringing the best entertainment 
                  content to audiences across Cambodia and beyond. We are passionate about connecting people 
                  with quality movies, series, and original content that entertains, educates, and inspires.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Our mission is to make quality entertainment accessible to everyone. We believe that 
                  great stories have the power to bring people together, spark conversations, and create 
                  lasting memories. We are committed to providing a seamless streaming experience with 
                  diverse content that caters to all tastes and preferences.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">What We Offer</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="bg-card/50">
                    <CardContent className="p-6">
                      <Play className="h-8 w-8 text-primary mb-3" />
                      <h3 className="font-semibold mb-2">Extensive Library</h3>
                      <p className="text-sm text-muted-foreground">
                        Thousands of movies, TV series, and exclusive content updated regularly.
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card/50">
                    <CardContent className="p-6">
                      <Globe className="h-8 w-8 text-primary mb-3" />
                      <h3 className="font-semibold mb-2">Global Content</h3>
                      <p className="text-sm text-muted-foreground">
                        Content from around the world with subtitles and dubbing options.
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card/50">
                    <CardContent className="p-6">
                      <Users className="h-8 w-8 text-primary mb-3" />
                      <h3 className="font-semibold mb-2">Community Features</h3>
                      <p className="text-sm text-muted-foreground">
                        Engage with other viewers through comments, ratings, and recommendations.
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-card/50">
                    <CardContent className="p-6">
                      <Shield className="h-8 w-8 text-primary mb-3" />
                      <h3 className="font-semibold mb-2">Safe & Secure</h3>
                      <p className="text-sm text-muted-foreground">
                        Your privacy and security are our top priorities with encrypted connections.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </section>

              <section className="bg-muted/30 rounded-lg p-6">
                <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
                <p className="text-muted-foreground mb-4">
                  We would love to hear from you! Whether you have questions, feedback, or partnership 
                  inquiries, feel free to reach out.
                </p>
                <p className="text-muted-foreground">
                  Email: <a href="mailto:support@khmerzoon.biz" className="text-primary hover:underline">support@khmerzoon.biz</a>
                </p>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
