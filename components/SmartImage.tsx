"use client";

import Image from "next/image";
import { useState } from "react";

interface SmartImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
}

export function SmartImage({ src, alt, className, width = 48, height = 48 }: SmartImageProps) {
  const [error, setError] = useState(false);
  
  // Check if it's a base64 string
  const isBase64 = src.startsWith("data:");
  
  // If it's a base64 string or there's an error, use regular img
  if (isBase64 || error) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        style={{ objectFit: "cover" }}
      />
    );
  }
  
  // Otherwise use Next.js Image
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={() => setError(true)}
    />
  );
}