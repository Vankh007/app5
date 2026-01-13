import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';

interface LanguageToggleProps {
  variant?: 'icon' | 'full';
}

export const LanguageToggle = ({ variant = 'icon' }: LanguageToggleProps) => {
  const { language, setLanguage, t } = useLanguage();

  if (variant === 'full') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="w-full justify-start gap-2">
            <Globe className="h-5 w-5" />
            <span>{t('language')}</span>
            <span className={`ml-auto text-xs opacity-70 ${language === 'km' ? 'font-khmer' : ''}`}>
              {language === 'en' ? 'EN' : 'ខ្មែរ'}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem
            onClick={() => setLanguage('en')}
            className={language === 'en' ? 'bg-accent' : ''}
          >
            <span className="mr-2">🇺🇸</span>
            English
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setLanguage('km')}
            className={language === 'km' ? 'bg-accent' : ''}
          >
            <span className="mr-2">🇰🇭</span>
            <span className="font-khmer">ភាសាខ្មែរ</span> (Khmer)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full hover:bg-accent text-primary dark:text-white"
        >
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => setLanguage('en')}
          className={language === 'en' ? 'bg-accent' : ''}
        >
          <span className="mr-2">🇺🇸</span>
          English
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage('km')}
          className={language === 'km' ? 'bg-accent' : ''}
        >
          <span className="mr-2">🇰🇭</span>
          <span className="font-khmer">ភាសាខ្មែរ</span> (Khmer)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
