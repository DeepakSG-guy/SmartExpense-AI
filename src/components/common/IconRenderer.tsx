import React from 'react';
import * as Icons from 'lucide-react';

interface IconRendererProps {
  name: string;
  className?: string;
  size?: number;
}

export const IconRenderer: React.FC<IconRendererProps> = ({ name, className = 'w-5 h-5', size }) => {
  // Try to find the icon by exact name or pascal case
  const iconKey = name as keyof typeof Icons;
  const LucideIcon = Icons[iconKey] as React.ComponentType<{ className?: string; size?: number }>;

  if (LucideIcon && typeof LucideIcon === 'function') {
    return <LucideIcon className={className} size={size} />;
  }

  // Fallback to Tag icon
  return <Icons.Tag className={className} size={size} />;
};
