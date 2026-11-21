import Link from 'next/link';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  href?: string;
  className?: string;
}

export function BrandLogo({
  size = 'md',
  showWordmark = true,
  href = '/home',
  className = '',
}: BrandLogoProps) {
  const pixelSizes = {
    sm: 28,
    md: 36,
    lg: 44,
  };
  const px = pixelSizes[size];

  const content = (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 512 512"
        width={px}
        height={px}
        className="shrink-0 squircle rounded-md shadow-subtle"
        aria-hidden="true"
      >
        <rect width="512" height="512" rx="112" fill="#0E7C57" />
        <g stroke="#FFFFFF" strokeWidth="36" strokeLinecap="round">
          <line x1="150" y1="138" x2="150" y2="374" />
          <line x1="226" y1="138" x2="226" y2="374" />
          <line x1="302" y1="138" x2="302" y2="374" />
          <line x1="378" y1="138" x2="378" y2="374" />
        </g>
        <line
          x1="112"
          y1="330"
          x2="416"
          y2="182"
          stroke="#F5B83D"
          strokeWidth="36"
          strokeLinecap="round"
        />
      </svg>
      {showWordmark && (
        <span className="font-display font-bold text-xl tracking-tight text-text">
          Tallo
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center group">
        {content}
      </Link>
    );
  }

  return content;
}
