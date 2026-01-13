import { useEffect } from 'react';

interface SocialShareMetaProps {
  title: string;
  description: string;
  image?: string;
  type?: string;
}

export const SocialShareMeta = ({ title, description, image, type = 'website' }: SocialShareMetaProps) => {
  useEffect(() => {
    const previousTitle = document.title;

    // Update document title
    if (title) {
      document.title = title;
    }

    // Update meta tags
    const updateMetaTag = (property: string, content: string) => {
      let element = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!element) {
        element = document.querySelector(`meta[name="${property}"]`) as HTMLMetaElement;
      }
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(property.startsWith('og:') ? 'property' : 'name', property);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    if (title) updateMetaTag('og:title', title);
    updateMetaTag('og:description', description);
    updateMetaTag('og:type', type);
    if (image) {
      updateMetaTag('og:image', image);
    }
    updateMetaTag('twitter:card', 'summary_large_image');
    if (title) updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    if (image) {
      updateMetaTag('twitter:image', image);
    }

    return () => {
      // Restore previous title (e.g., global Site Title - Site Detail)
      document.title = previousTitle;
    };
  }, [title, description, image, type]);

  return null;
};
