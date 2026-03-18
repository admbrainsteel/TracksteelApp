
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserAvatarProps {
  imageUrl?: string | null;
  name?: string | null;
  email?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base',
  xl: 'h-16 w-16 text-lg'
};

export function UserAvatar({ 
  imageUrl, 
  name, 
  email, 
  size = 'md',
  className = ""
}: UserAvatarProps) {
  const getInitials = () => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      <AvatarImage src={imageUrl || undefined} alt={name || email || 'User'} />
      <AvatarFallback className="bg-slate-600 text-white">
        {getInitials()}
      </AvatarFallback>
    </Avatar>
  );
}
