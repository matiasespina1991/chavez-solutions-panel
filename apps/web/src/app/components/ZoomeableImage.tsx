'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';

type Props = {
  lowSrc: string;
  highSrc?: string;
  alt?: string;
  zoomScale?: number;
  maxHeight?: string;
  className?: string;
  switchToHighOnZoom?: boolean;
  onLowSrcError?: () => void;
  onHighSrcError?: () => void;
};

export default function ZoomeableImage({
  lowSrc,
  highSrc,
  alt = '',
  zoomScale = 2.2,
  maxHeight = '80vh',
  className,
  switchToHighOnZoom = true,
  onLowSrcError,
  onHighSrcError,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const touchDeviceRef = useRef(false);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState<{ x: number; y: number }>({
    x: 50,
    y: 50,
  });
  const [hover, setHover] = useState(false);

  const coordsFromEvent = useCallback((clientX: number, clientY: number) => {
    const el = imgRef.current;
    if (!el) return { x: 50, y: 50 };
    const rect = el.getBoundingClientRect();
    const px = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const py = Math.max(0, Math.min(rect.height, clientY - rect.top));
    return { x: (px / rect.width) * 100, y: (py / rect.height) * 100 };
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (touchDeviceRef.current) return;
      e.stopPropagation();
      const { x, y } = coordsFromEvent(e.clientX, e.clientY);
      setOrigin({ x, y });
      setZoomed((z) => !z);
    },
    [coordsFromEvent]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!zoomed) return;
      e.stopPropagation();
      const { x, y } = coordsFromEvent(e.clientX, e.clientY);
      setOrigin({ x, y });
    },
    [coordsFromEvent, zoomed]
  );

  const handleMouseEnter = useCallback(() => setHover(true), []);
  const handleMouseLeave = useCallback(() => {
    setHover(false);
    setZoomed(false);
    setOrigin({ x: 50, y: 50 });
  }, []);

  const handlePointerLeave = useCallback(() => {
    setHover(false);
    setZoomed(false);
    setOrigin({ x: 50, y: 50 });
  }, []);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.stopPropagation();
      touchDeviceRef.current = true;
      const t = e.touches[0];
      const { x, y } = coordsFromEvent(t.clientX, t.clientY);
      touchStartRef.current = { x, y };
      setOrigin({ x, y });
      setZoomed(true);
    },
    [coordsFromEvent]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!zoomed || e.touches.length !== 1) return;
      const t = e.touches[0];
      const { x, y } = coordsFromEvent(t.clientX, t.clientY);
      setOrigin({ x, y });
      e.preventDefault();
    },
    [coordsFromEvent, zoomed]
  );

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
    if (zoomed) {
      setZoomed(false);
      setOrigin({ x: 50, y: 50 });
    }
  }, [zoomed]);

  // start with lowSrc
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.src && img.src.includes(lowSrc)) return;
    img.src = lowSrc;
  }, [lowSrc]);

  // preload and switch to highSrc when zoomed
  useEffect(() => {
    if (!switchToHighOnZoom) return;
    if (!highSrc) return;
    const img = imgRef.current;
    if (!img) return;
    if (!zoomed) {
      // when unzooming, switch back to lowSrc to save memory/bandwidth if needed
      if (img.src && !img.src.includes(lowSrc)) {
        img.src = lowSrc;
      }
      return;
    }

    // if already using highSrc, nothing to do
    if (img.src && img.src.includes(highSrc)) return;

    // preload high
    let canceled = false;
    const pre = new Image();
    pre.onload = () => {
      if (canceled) return;
      try {
        // swap displayed src to the high-res image
        if (imgRef.current) imgRef.current.src = highSrc;
      } catch {}
    };
    pre.onerror = () => {
      canceled = true;
      onHighSrcError?.();
    };
    pre.src = highSrc;

    return () => {
      canceled = true;
    };
  }, [zoomed, highSrc, lowSrc, switchToHighOnZoom, onHighSrcError]);

  const imgStyle: React.CSSProperties = {
    display: 'block',
    width: 'auto',
    maxWidth: '99vw',
    maxHeight,
    borderRadius: '8px',
    height: 'auto',
    objectFit: 'contain',
    transformOrigin: `${origin.x}% ${origin.y}%`,
    transform: zoomed ? `scale(${zoomScale})` : 'scale(1)',
    transition: zoomed ? 'transform 0.08s linear' : 'transform 240ms ease',
    cursor: zoomed ? 'zoom-out' : hover ? 'zoom-in' : 'default',
    userSelect: 'none',
    pointerEvents: 'auto',
    touchAction: 'none',
    margin: '0 auto',
    zIndex: 1000,
  };

  const containerStyle: React.CSSProperties = {
    padding: '2rem 0',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    maxHeight,
    width: '100%',
    touchAction: 'none',
    overscrollBehavior: 'contain',
  };

  return (
    <div
      ref={containerRef}
      onClick={(e) => e.stopPropagation()}
      onPointerLeave={handlePointerLeave}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchEnd={handleTouchEnd}
      style={containerStyle}
      className={className}
    >
      <img
        ref={imgRef}
        alt={alt}
        draggable={false}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        style={imgStyle}
        onDragStart={(e) => e.preventDefault()}
        onError={onLowSrcError}
      />
    </div>
  );
}
