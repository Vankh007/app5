import { AdminLayout } from '@/components/admin/AdminLayout';
import { Input } from '@/components/ui/input';
import { 
  Settings, 
  Image, 
  Cog, 
  Bell, 
  CreditCard, 
  Search as SearchIcon,
  LayoutTemplate,
  Monitor,
  Languages,
  Puzzle,
  Power,
  Cookie,
  FileCode,
  FileText,
  Shield,
  Share2,
  ScrollText,
  Smartphone,
  ChevronRight,
  Code
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface SettingCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  link?: string;
  onClick?: () => void;
}

const settingsCards: SettingCard[] = [
  {
    id: 'general',
    title: 'General Setting',
    description: 'Configure the fundamental information of the site.',
    icon: <Settings className="h-6 w-6" />,
    link: '/admin/settings/general'
  },
  {
    id: 'logo',
    title: 'Logo and Favicon',
    description: 'Upload your logo and favicon here.',
    icon: <Image className="h-6 w-6" />,
    link: '/admin/settings/logo'
  },
  {
    id: 'system',
    title: 'System Configuration',
    description: 'Control all of the basic modules of the system.',
    icon: <Cog className="h-6 w-6" />,
    link: '/admin/settings/system'
  },
  {
    id: 'notification',
    title: 'Notification Setting',
    description: 'Control and configure overall notification elements of the system.',
    icon: <Bell className="h-6 w-6" />,
    link: '/admin/settings/notifications'
  },
  {
    id: 'payment',
    title: 'Payment Gateways',
    description: 'Configure automatic or manual payment gateways to accept payment from users.',
    icon: <CreditCard className="h-6 w-6" />,
    link: '/admin/settings/payment-gateways'
  },
  {
    id: 'seo',
    title: 'SEO Configuration',
    description: 'Configure proper meta title, meta description, meta keywords, etc to make the system SEO-friendly.',
    icon: <SearchIcon className="h-6 w-6" />,
    link: '/admin/settings/seo'
  },
  {
    id: 'templates',
    title: 'Manage Templates',
    description: 'Control frontend template of the system.',
    icon: <LayoutTemplate className="h-6 w-6" />,
    link: '/admin/settings/templates'
  },
  {
    id: 'frontend',
    title: 'Manage Frontend',
    description: 'Control all of the frontend contents of the system.',
    icon: <Monitor className="h-6 w-6" />,
    link: '/admin/settings/frontend'
  },
  {
    id: 'social',
    title: 'Social Login Setting',
    description: 'Provide the required information here to use the login system by social media.',
    icon: <Share2 className="h-6 w-6" />,
    link: '/admin/settings/social-login'
  },
  {
    id: 'language',
    title: 'Language',
    description: 'Configure your required languages and keywords to localize the system.',
    icon: <Languages className="h-6 w-6" />,
    link: '/admin/languages'
  },
  {
    id: 'extensions',
    title: 'Extensions',
    description: 'Manage extensions of the system here to extend some extra features of the system.',
    icon: <Puzzle className="h-6 w-6" />,
    link: '/admin/settings/extensions'
  },
  {
    id: 'policy',
    title: 'Policy Pages',
    description: 'Configure your policy and terms of the system here.',
    icon: <ScrollText className="h-6 w-6" />,
    link: '/admin/settings/policy'
  },
  {
    id: 'maintenance',
    title: 'Maintenance Mode',
    description: 'Enable or disable the maintenance mode of the system when required.',
    icon: <Power className="h-6 w-6" />,
    link: '/admin/settings/maintenance'
  },
  {
    id: 'gdpr',
    title: 'GDPR Cookie',
    description: 'Set GDPR Cookie policy if required. It will ask visitor of the system to accept if enabled.',
    icon: <Cookie className="h-6 w-6" />,
    link: '/admin/settings/gdpr'
  },
  {
    id: 'custom-css',
    title: 'Custom CSS',
    description: 'Write custom css here to modify some styles of frontend of the system if you need to.',
    icon: <FileCode className="h-6 w-6" />,
    link: '/admin/settings/custom-css'
  },
  {
    id: 'scripts',
    title: 'Header & Footer Scripts',
    description: 'Add custom scripts like Google AdSense verification, Analytics, or other third-party integrations.',
    icon: <Code className="h-6 w-6" />,
    link: '/admin/settings/scripts'
  },
  {
    id: 'sitemap',
    title: 'Sitemap XML',
    description: 'Insert the sitemap XML here to enhance SEO performance.',
    icon: <FileText className="h-6 w-6" />,
    link: '/admin/settings/sitemap'
  },
  {
    id: 'robots',
    title: 'Robots txt',
    description: 'Insert the robots.txt content here to enhance bot web crawlers and instruct them on how to interact with certain areas of the website.',
    icon: <Shield className="h-6 w-6" />,
    link: '/admin/settings/robots'
  },
  {
    id: 'in-app-payment',
    title: 'In App Payment',
    description: 'Configure google pay to accept payments directly within your app.',
    icon: <Smartphone className="h-6 w-6" />,
    link: '/admin/settings/in-app-payment'
  }
];

export default function AdminSettings() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const filteredCards = settingsCards.filter(card =>
    card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCardClick = (card: SettingCard) => {
    if (card.link) {
      navigate(card.link);
    } else if (card.onClick) {
      card.onClick();
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground">Configure and manage all system settings</p>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background border-border"
          />
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCards.map((card) => (
            <div
              key={card.id}
              onClick={() => handleCardClick(card)}
              className="group relative flex items-start gap-4 p-5 bg-card border border-border rounded-xl cursor-pointer transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
            >
              {/* Icon Container */}
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                {card.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {card.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {card.description}
                </p>
              </div>

              {/* Arrow Indicator */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight className="h-5 w-5 text-primary" />
              </div>

              {/* Decorative Settings Icon */}
              <div className="absolute right-4 bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Cog className="h-8 w-8 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>

        {filteredCards.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No settings found matching your search.</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
