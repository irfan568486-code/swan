import React, { useState } from 'react';
import { Gamepad2 } from 'lucide-react';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export function SafeImage({ src, alt, className = '', fallbackLabel }: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#1C2133] via-[#141824] to-[#26121A] text-amber-400/80 ${className}`}
        role="img"
        aria-label={alt}
      >
        <Gamepad2 className="w-8 h-8 mb-1.5" />
        {fallbackLabel && <span className="text-xs font-medium text-slate-300">{fallbackLabel}</span>}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
