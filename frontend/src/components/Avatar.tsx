import React from "react";

const DEFAULT_AVATAR =
  "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png";

interface AvatarProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  onClick?: () => void;
}

export const Avatar: React.FC<AvatarProps> = ({ src, alt, className, onClick }) => (
  <img
    className={className}
    src={src ?? DEFAULT_AVATAR}
    alt={alt}
    onClick={onClick}
    onError={(e) => {
      (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
    }}
  />
);
