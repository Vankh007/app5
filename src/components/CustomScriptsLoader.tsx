import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function CustomScriptsLoader() {
  const [headerScripts, setHeaderScripts] = useState('');
  const [footerScripts, setFooterScripts] = useState('');

  useEffect(() => {
    const fetchScripts = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('setting_key, setting_value')
          .in('setting_key', ['header_scripts', 'footer_scripts']);

        if (error) throw error;

        data?.forEach((setting) => {
          if (setting.setting_key === 'header_scripts') {
            setHeaderScripts((setting.setting_value as { content?: string })?.content || '');
          } else if (setting.setting_key === 'footer_scripts') {
            setFooterScripts((setting.setting_value as { content?: string })?.content || '');
          }
        });
      } catch (error) {
        console.error('Error fetching custom scripts:', error);
      }
    };

    fetchScripts();
  }, []);

  useEffect(() => {
    if (headerScripts) {
      injectScripts(headerScripts, 'head');
    }
  }, [headerScripts]);

  useEffect(() => {
    if (footerScripts) {
      injectScripts(footerScripts, 'body');
    }
  }, [footerScripts]);

  return null;
}

function injectScripts(scriptContent: string, target: 'head' | 'body') {
  // Create a temporary container to parse the HTML
  const container = document.createElement('div');
  container.innerHTML = scriptContent;

  const targetElement = target === 'head' ? document.head : document.body;

  // Find all script tags and inject them
  const scripts = container.querySelectorAll('script');
  scripts.forEach((originalScript) => {
    const newScript = document.createElement('script');
    
    // Copy attributes
    Array.from(originalScript.attributes).forEach((attr) => {
      newScript.setAttribute(attr.name, attr.value);
    });
    
    // Copy inline content if present
    if (originalScript.textContent) {
      newScript.textContent = originalScript.textContent;
    }

    // Add a data attribute to identify injected scripts
    newScript.setAttribute('data-custom-script', 'true');
    
    targetElement.appendChild(newScript);
  });

  // Handle non-script elements (like meta tags)
  const nonScriptElements = Array.from(container.children).filter(
    (el) => el.tagName.toLowerCase() !== 'script'
  );
  
  nonScriptElements.forEach((element) => {
    const clone = element.cloneNode(true) as Element;
    clone.setAttribute('data-custom-element', 'true');
    targetElement.appendChild(clone);
  });
}
