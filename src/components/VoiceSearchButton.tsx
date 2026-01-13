import React, { useState, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVoiceSearch } from '@/hooks/useVoiceSearch';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface VoiceSearchButtonProps {
  onSearchResult: (query: string) => void;
}

const VoiceSearchButton = ({ onSearchResult }: VoiceSearchButtonProps) => {
  const { toast } = useToast();
  const { language, setLanguage } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState(() => 
    language === 'km' ? 'km-KH' : 'en-US'
  );

  // Sync voice language with app language
  useEffect(() => {
    const newVoiceLang = language === 'km' ? 'km-KH' : 'en-US';
    setSelectedLanguage(newVoiceLang);
  }, [language]);

  const handleResult = React.useCallback((transcript: string) => {
    if (transcript.trim()) {
      onSearchResult(transcript);
      toast({
        title: "Voice search",
        description: `Searching for: "${transcript}"`,
      });
    }
  }, [onSearchResult, toast]);

  const { isListening, transcript, error, startListening, stopListening } = useVoiceSearch({
    onResult: handleResult,
    language: selectedLanguage,
  });

  const handleClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const languages = [
    { code: 'en-US', label: 'English (US)', appLang: 'en' as const },
    { code: 'en-GB', label: 'English (UK)', appLang: 'en' as const },
    { code: 'km-KH', label: 'ភាសាខ្មែរ (Khmer)', appLang: 'km' as const },
    { code: 'zh-CN', label: '中文 (Chinese)', appLang: 'en' as const },
    { code: 'ja-JP', label: '日本語 (Japanese)', appLang: 'en' as const },
    { code: 'ko-KR', label: '한국어 (Korean)', appLang: 'en' as const },
    { code: 'th-TH', label: 'ไทย (Thai)', appLang: 'en' as const },
    { code: 'vi-VN', label: 'Tiếng Việt (Vietnamese)', appLang: 'en' as const },
  ];

  const handleLanguageChange = (langCode: string) => {
    setSelectedLanguage(langCode);
    const lang = languages.find(l => l.code === langCode);
    if (lang) {
      setLanguage(lang.appLang);
    }
  };

  if (error) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full hover:bg-accent text-muted-foreground cursor-not-allowed"
        disabled
        title={error}
      >
        <MicOff className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClick}
          className={`rounded-full hover:bg-accent ${
            isListening
              ? 'text-red-500 animate-pulse'
              : 'text-primary dark:text-white'
          }`}
          title={isListening ? 'Stop listening' : 'Start voice search'}
        >
          {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs rounded-full hover:bg-accent text-primary dark:text-white"
          >
            {languages.find(l => l.code === selectedLanguage)?.code.split('-')[0].toUpperCase()}
          </Button>
        </DropdownMenuTrigger>
      </div>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={selectedLanguage === lang.code ? 'bg-accent' : ''}
          >
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
      {isListening && transcript && (
        <div className="absolute top-full mt-2 right-0 bg-background border rounded-lg p-2 shadow-lg text-sm max-w-xs">
          {transcript}
        </div>
      )}
    </DropdownMenu>
  );
};

export default VoiceSearchButton;
