'use client';

import { Box } from '@mui/material';
import AnimatedCursor from 'react-animated-cursor';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { isMobile } from 'react-device-detect';
import { ThemeContext } from './ThemeRegistry';

export default function CSAnimatedCursor() {
  const [hidden, setHidden] = useState(false);
  const rafRef = useRef<number | null>(null);
  const { mode } = useContext(ThemeContext);

  useEffect(() => {
    if (isMobile) return; // no cursor on mobile

    const onPointerMove = (ev: PointerEvent) => {
      // throttle with rAF
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(() => {
        // elementFromPoint necesita coordenadas relativas al viewport
        const el = document.elementFromPoint(
          ev.clientX,
          ev.clientY
        ) as HTMLElement | null;
        // busca ancestro con clase .auto-cursor
        const overAuto = !!(el && el.closest && el.closest('.auto-cursor'));
        setHidden(overAuto);
      });
    };

    const onPointerLeaveWindow = () => {
      // al salir de la ventana, ocultar cursor animado también
      setHidden(false);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('blur', onPointerLeaveWindow);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('blur', onPointerLeaveWindow);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: hidden ? 0 : 1 }}>
      <Box
        id="cs-animated-cursor"
        sx={{
          display: isMobile ? 'none' : hidden ? 'none' : 'block',
          // IMPORTANT: pointerEvents none so this overlay doesn't block underlying mouse events
          pointerEvents: 'none',
          zIndex: 9999,
        }}
      >
        <AnimatedCursor
          innerSize={10}
          outerSize={45}
          innerScale={1}
          outerScale={2}
          outerAlpha={0}
          trailingSpeed={5}
          clickables={[
            'a',
            'button',
            'input[type="text"]',
            'input[type="email"]',
            'input[type="number"]',
            'input[type="submit"]',
            'label[for]',
            'select',
            'textarea',
            '.media-grid img',
            '.media-grid video',
          ]}
          innerStyle={{
            backgroundColor: 'white',
            filter: 'opacity(0.9)',
            backdropFilter: 'invert(1)',
            zIndex: 1000,
          }}
          outerStyle={{
            backdropFilter: 'invert(1)',
            zIndex: 1000,
          }}
        />
      </Box>
    </motion.div>
  );
}
