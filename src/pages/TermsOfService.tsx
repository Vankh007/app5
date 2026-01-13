import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

export default function TermsOfService() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('Terms of Service');
  const [content, setContent] = useState('');

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const { data, error } = await supabase
          .from('content_sections')
          .select('title, content')
          .eq('section_key', 'terms_of_service')
          .eq('is_active', true)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
          if (data.title) setTitle(data.title);
          if (data.content) setContent(data.content);
        }
      } catch (error) {
        console.error('Error fetching terms of service:', error);
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
          <Skeleton className="h-6 w-48" />
          <div className="space-y-3 mt-8">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ) : (
        <>
          <h1 className="text-3xl font-bold mb-6">{title}</h1>
          <p className="text-muted-foreground mb-8">Last updated: December 13, 2025</p>
          
          {content ? (
            <div 
              className="prose prose-neutral dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
              <section>
                <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
                <p className="text-muted-foreground leading-relaxed">
                  By accessing and using KHMERZOON, you accept and agree to be bound by the terms and 
                  provisions of this agreement. If you do not agree to abide by these terms, please do 
                  not use this service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">2. Use License</h2>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  Permission is granted to temporarily access the materials on KHMERZOON for personal, 
                  non-commercial transitory viewing only.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">3. Contact Us</h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you have any questions about these Terms, please contact us at:{' '}
                  <a href="mailto:support@khmerzoon.biz" className="text-primary hover:underline">support@khmerzoon.biz</a>
                </p>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
