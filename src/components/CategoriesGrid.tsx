import { useState } from 'react';
import { Film, Tv, Gamepad2, Music, Newspaper, Trophy, Flame, Radio } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const CategoriesGrid = () => {
  const [showAll, setShowAll] = useState(false);

  const categories = [
    { id: 1, name: 'Movies', icon: Film, path: '/movies', color: 'bg-blue-500/10 text-blue-500' },
    { id: 2, name: 'Series', icon: Tv, path: '/series', color: 'bg-purple-500/10 text-purple-500' },
    { id: 3, name: 'Gaming', icon: Gamepad2, path: '/gaming', color: 'bg-green-500/10 text-green-500' },
    { id: 4, name: 'Music', icon: Music, path: '/music', color: 'bg-pink-500/10 text-pink-500' },
    { id: 5, name: 'News', icon: Newspaper, path: '/news', color: 'bg-orange-500/10 text-orange-500' },
    { id: 6, name: 'Sports', icon: Trophy, path: '/sports', color: 'bg-yellow-500/10 text-yellow-500' },
    { id: 7, name: 'Viral', icon: Flame, path: '/viral', color: 'bg-red-500/10 text-red-500' },
    { id: 8, name: 'Live', icon: Radio, path: '/live', color: 'bg-cyan-500/10 text-cyan-500' },
  ];

  const displayedCategories = showAll ? categories : categories.slice(0, 8);

  return (
    <div className="w-full px-4 lg:px-8 py-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-foreground">Categories</h2>
        <p className="text-sm text-muted-foreground">Explore content by category</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-4">
        {displayedCategories.map((category) => (
          <NavLink key={category.id} to={category.path}>
            <Card className="hover:shadow-lg transition-all hover:scale-105 cursor-pointer border-border hover:border-primary h-full">
              <CardContent className="flex flex-col items-center justify-center p-6 gap-3">
                <div className={`p-4 rounded-full ${category.color}`}>
                  <category.icon className="h-8 w-8" />
                </div>
                <h3 className="font-semibold text-center text-foreground">{category.name}</h3>
              </CardContent>
            </Card>
          </NavLink>
        ))}
      </div>

      {!showAll && categories.length > 8 && (
        <div className="flex justify-center">
          <Button 
            variant="outline" 
            onClick={() => setShowAll(true)}
            className="px-8"
          >
            More
          </Button>
        </div>
      )}
    </div>
  );
};

export default CategoriesGrid;
