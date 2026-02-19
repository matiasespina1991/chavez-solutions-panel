'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';

type Props = {
  lowSrc: string;
  highSrc?: string;
  poster?: string;
  zoomScale?: number;
  maxHeight?: string;
  className?: string;
  loop?: boolean;
  muted?: boolean;
  autoPlay?: boolean;
  switchToHighOnZoom?: boolean;
  onLowSrcError?: () => void;
  onHighSrcError?: () => void;
};

export default function ZoomeableVideo({
  lowSrc,
  highSrc,
  poster,
  zoomScale = 2.2,
  maxHeight = '80vh',
  className,
  loop = true,
  muted = true,
  autoPlay = true,
  switchToHighOnZoom = true,
  onLowSrcError,
  onHighSrcError,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const touchDeviceRef = useRef(false);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState<{ x: number; y: number }>({
    x: 50,
    y: 50,
  });
  const [hover, setHover] = useState(false);

  const coordsFromEvent = useCallback((clientX: number, clientY: number) => {
    const el = videoRef.current;
    if (!el) return { x: 50, y: 50 };
    const rect = el.getBoundingClientRect();
    const px = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const py = Math.max(0, Math.min(rect.height, clientY - rect.top));
    return { x: (px / rect.width) * 100, y: (py / rect.height) * 100 };
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;
      e.stopPropagation();
      e.preventDefault(); // ✅ AÑADE ESTO
      touchDeviceRef.current = true;
      const t = e.touches[0];
      const { x, y } = coordsFromEvent(t.clientX, t.clientY);
      touchStartRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
      setOrigin({ x, y });
      setZoomed(true);
    },
    [coordsFromEvent]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!zoomed || e.touches.length !== 1) return;
      e.stopPropagation();
      e.preventDefault(); // ✅ AÑADE ESTO
      const t = e.touches[0];
      const { x, y } = coordsFromEvent(t.clientX, t.clientY);
      setOrigin({ x, y });
    },
    [coordsFromEvent, zoomed]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.stopPropagation(); // ✅ AÑADE ESTO
      e.preventDefault(); // ✅ AÑADE ESTO
      touchStartRef.current = null;
      if (zoomed) {
        setZoomed(false);
        setOrigin({ x: 50, y: 50 });
      }
    },
    [zoomed]
  );

  // En el useEffect, SINCRONIZA stopPropagation en React handlers
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
  }, []);

  const handlePointerLeave = useCallback(() => {
    setHover(false);
  }, []);

  const handleVideoError = useCallback(() => {
    if (zoomed) {
      onHighSrcError?.();
    } else {
      onLowSrcError?.();
    }
  }, [zoomed, onHighSrcError, onLowSrcError]);

  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(
    null
  );

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    // init to lowSrc if not set
    if (!vid.src || (lowSrc && !vid.currentSrc?.includes(lowSrc))) {
      try {
        vid.src = lowSrc;
      } catch {}
    }

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let moved = false;

    const nativeTouchStart = (ev: TouchEvent) => {
      if (!ev || ev.touches.length !== 1) return;
      // must be non-passive so preventDefault can be called if needed
      const t = ev.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      startTime = Date.now();
      moved = false;
      // Prevent default here to hinder the browser long-press menu.
      // We'll synthesize click on touchend if it's a short tap (so taps still work).
      ev.preventDefault();
    };

    const nativeTouchMove = (ev: TouchEvent) => {
      if (!ev || ev.touches.length !== 1) return;
      const t = ev.touches[0];
      const dx = Math.abs(t.clientX - startX);
      const dy = Math.abs(t.clientY - startY);
      if (dx > 10 || dy > 10) moved = true;
      // if zoomed, prevent scrolling
      if (zoomed) {
        ev.preventDefault();
      }
    };

    const nativeTouchEnd = (ev: TouchEvent) => {
      const duration = Date.now() - startTime;
      // short tap (no movement, short time) => synthesize click so React handlers still run
      if (!moved && duration < 250) {
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: window,
        });
        // dispatch click on the video element
        vid.dispatchEvent(clickEvent);
      }
    };

    const onContextMenu = (ev: Event) => {
      ev.preventDefault();
    };

    // add native listeners with passive: false where we call preventDefault
    vid.addEventListener('touchstart', nativeTouchStart, { passive: false });
    vid.addEventListener('touchmove', nativeTouchMove, { passive: false });
    vid.addEventListener('touchend', nativeTouchEnd);
    vid.addEventListener('contextmenu', onContextMenu);

    return () => {
      try {
        vid.removeEventListener('touchstart', nativeTouchStart as any);
        vid.removeEventListener('touchmove', nativeTouchMove as any);
        vid.removeEventListener('touchend', nativeTouchEnd as any);
        vid.removeEventListener('contextmenu', onContextMenu as any);
      } catch {}
    };
  }, [lowSrc, zoomed]);

  // Cambiar fuente al activar zoom (preserva tiempo y estado de reproducción)
  useEffect(() => {
    if (!switchToHighOnZoom) return;
    const vid = videoRef.current;
    if (!vid) return;
    // Importante: evitamos volver a lowSrc al des-zoomear para no recargar el video
    // (eso suele causar flicker y puede disparar mouseleave/pointerleave en desktop).
    const choose = zoomed ? highSrc : undefined;
    if (!choose) return;
    if (vid.currentSrc && choose && vid.currentSrc.includes(choose)) return;

    const prevTime = Math.max(0, vid.currentTime || 0);
    const wasPlaying = !vid.paused && !vid.ended;

    try {
      vid.pause();
    } catch {}
    vid.src = choose;
    vid.load();

    const onLoaded = () => {
      try {
        if (!Number.isFinite(prevTime) || isNaN(prevTime)) {
          vid.currentTime = 0;
        } else {
          const dur = vid.duration || Infinity;
          vid.currentTime = Math.min(prevTime, dur - 0.1);
        }
      } catch {}
      if (wasPlaying) {
        vid.play().catch(() => {});
      }
      vid.removeEventListener('loadedmetadata', onLoaded);
    };
    vid.addEventListener('loadedmetadata', onLoaded);
    return () => {
      try {
        vid.removeEventListener('loadedmetadata', onLoaded);
      } catch {}
    };
  }, [zoomed, highSrc, lowSrc, switchToHighOnZoom]);

  const videoStyle: React.CSSProperties = {
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
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        preload="metadata"
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onDragStart={(e) => e.preventDefault()}
        onError={handleVideoError}
        style={videoStyle}
      />
    </div>
  );
}
