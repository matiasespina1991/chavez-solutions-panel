import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserAvatarProfileProps {
  className?: string;
  showInfo?: boolean;
  user: {
    imageUrl?: string;
    fullName?: string | null;
    emailAddresses: Array<{ emailAddress: string }>;
  } | null;
}

export function UserAvatarProfile({
  className,
  showInfo = false,
  user
}: UserAvatarProfileProps) {
  const email = user?.emailAddresses[0]?.emailAddress || '';
  const primaryLabel = user?.fullName || '';
  const isPrimaryLabelEmail =
    primaryLabel.trim().toLowerCase() === email.trim().toLowerCase();

  return (
    <div className='flex items-center gap-2'>
      <Avatar className={className}>
        <AvatarImage src={user?.imageUrl || ''} alt={user?.fullName || ''} />
        <AvatarFallback className='rounded-lg text-black dark:text-white'>
          {user?.fullName?.slice(0, 2)?.toUpperCase() || 'CN'}
        </AvatarFallback>
      </Avatar>

      {showInfo && (
        <div className='grid flex-1 text-left text-sm leading-tight'>
          <span
            className={`truncate ${
              isPrimaryLabelEmail ? 'font-normal' : 'font-semibold'
            }`}
          >
            {primaryLabel}
          </span>
          <span className='truncate text-xs'>
            {email}
          </span>
        </div>
      )}
    </div>
  );
}
