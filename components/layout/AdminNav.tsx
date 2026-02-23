'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LayoutGrid, FileText, Archive, BarChart3, Settings, LogOut } from 'lucide-react';

interface AdminNavProps {
  onStatsClick?: () => void;
  onManagementClick?: () => void;
  onSignOut: () => void;
}

export function AdminNav({ onStatsClick, onManagementClick, onSignOut }: AdminNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { 
      label: 'Dashboard', 
      icon: LayoutGrid, 
      path: '/admin',
      onClick: () => router.push('/admin')
    },
    { 
      label: 'Reports', 
      icon: FileText, 
      path: '/reports',
      onClick: () => router.push('/reports')
    },
    { 
      label: 'Archive', 
      icon: Archive, 
      path: '/archive',
      onClick: () => router.push('/archive')
    },
  ];

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-30">
      <div className="max-w-full mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Left: Logo */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <LayoutGrid className="h-5 w-5" />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-bold text-lg leading-tight">Roster Admin</h1>
          </div>
        </div>

        {/* Center: Navigation Items */}
        <nav className="flex items-center gap-1 flex-1 justify-center max-w-2xl">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            
            return (
              <Button
                key={item.path}
                variant={isActive ? 'default' : 'ghost'}
                size="sm"
                onClick={item.onClick}
                className={`gap-2 ${isActive ? 'shadow-sm' : 'text-muted-foreground hover:text-primary'}`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden md:inline">{item.label}</span>
              </Button>
            );
          })}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {onStatsClick && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onStatsClick}
              title="Statistics"
              className="text-muted-foreground hover:text-primary"
            >
              <BarChart3 className="h-5 w-5" />
            </Button>
          )}

          {onManagementClick && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onManagementClick}
              title="Manage Restaurants"
              className="text-muted-foreground hover:text-primary"
            >
              <Settings className="h-5 w-5" />
            </Button>
          )}

          <div className="h-6 w-px bg-border mx-1" />

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onSignOut}
            title="Sign Out"
            className="text-destructive/70 hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
