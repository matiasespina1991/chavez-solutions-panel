'use client';

import { Box, Typography } from '@mui/material';
import { isMobile } from 'react-device-detect';

export default function Footer() {
  return (
    <Box mt="3.5rem" width="100%">
      <footer
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: isMobile ? '7rem' : '10rem',
          backgroundColor: 'rgb(var(--background-rgb))',
          color: 'rgb(var(--foreground-rgb))',
          transition: 'background-color 0.3s ease, color 0.3s ease',
          borderTop: '1px solid rgba(128, 127, 127, 0.10)',
        }}
      >
        <Box
          sx={{
            p: '3.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography fontSize="0.70rem">
            Laura Butallo © {new Date().getFullYear()}
          </Typography>

          <Typography fontSize="0.7rem">
            Website by{' '}
            <a href="mailto:matiasespina1991@gmail.com">
              <b>Cymatics Ideas</b>
            </a>
          </Typography>
        </Box>
      </footer>
    </Box>
  );
}
