'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import styles from './page.module.css';
import Footer from './components/Footer';
import { motion } from 'framer-motion';

import {
  Box,
  Button,
  Grid,
  IconButton,
  Theme,
  useMediaQuery,
} from '@mui/material';

export default function NotFound() {
  useEffect(() => {
    document.title = 'Laura Butallo | 404';
  }, []);

  return (
    <>
      <main className={`${styles.main} ${styles.notFound}`}>
        <Box
          px={{ xs: '1.2rem', sm: '2rem' }}
          py={{ xs: '1.7rem', sm: '2rem' }}
          width="100%"
        >
          <Box
            sx={{
              height: {
                xs: '0rem',
                sm: '4rem',
                md: '5rem',
                lg: '5rem',
                xl: '6rem',
              },
            }}
          />
          <Box
            className={styles.not_found_container}
            sx={{
              minHeight: '50vh',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <h1 style={{ fontSize: '3.6rem', fontWeight: 'bold', margin: 0 }}>
              404
            </h1>
            <Box height="0.5rem" />
            <p>The page you are looking for does not exist.</p>

            <Box height="1.3rem" />
            <Button
              variant="outlined"
              href="/"
              sx={{
                padding: '0.5rem 1rem',
                width: '11rem',
                border: '2px solid rgb(var(--foreground-rgb))',
                borderRadius: '0.5rem',
                textTransform: 'none',
                fontSize: '1rem',
                color: 'rgb(var(--foreground-rgb))',
                '&:hover': {
                  border: '2px solid rgb(var(--foreground-rgb))',
                },
              }}
            >
              Back to Home
            </Button>
          </Box>
        </Box>
      </main>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        style={{ width: '100%' }}
      >
        <Footer />
      </motion.div>
    </>
  );
}
