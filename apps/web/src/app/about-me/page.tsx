'use client';

import { Box, Typography } from '@mui/material';
import styles from '../page.module.css';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { getAboutMeData } from '@/utils/functions/getAboutMeData';
import { AboutMeData } from '@/utils/types/types';
import Footer from '../components/Footer';
import { doc, getDoc } from 'firebase/firestore';

import { useStorageAssetSrc } from '@/hooks/useStorageAssetSrc';
import NextImage from 'next/image';
import db from '@/utils/config/firebase';

type MediaDoc = {
  id: string;
  type: 'image' | 'video';
  paths?: {
    original?: { storagePath?: string; downloadURL?: string };
    derivatives?: Record<
      string,
      { storagePath?: string; downloadURL?: string }
    >;
  };
};

export default function AboutMe() {
  const [aboutMeData, setAboutMeData] = useState<AboutMeData>({
    title: '',
    content: '',
    imageId: null,
    subcontent: {
      education: {
        title: '',
        content: '',
      },
    },
  });
  const [imageMedia, setImageMedia] = useState<MediaDoc | null>(null);

  const fetchAboutMeData = async () => {
    const data = await getAboutMeData();

    if (data) {
      console.log('[About Me] Loaded data:', data);
      setAboutMeData({
        title: data.title,
        content: data.content,
        imageId: data.imageId,
        subcontent: data.subcontent,
      });

      // Load image if exists
      if (data.imageId) {
        console.log('[About Me] Loading image with ID:', data.imageId);
        try {
          const imageDocSnap = await getDoc(doc(db, 'media', data.imageId));
          if (imageDocSnap.exists()) {
            const mediaData = {
              id: imageDocSnap.id,
              ...imageDocSnap.data(),
            } as MediaDoc;
            console.log('[About Me] Image loaded:', mediaData);
            setImageMedia(mediaData);
          } else {
            console.log('[About Me] Image document does not exist');
          }
        } catch (error) {
          console.error('[About Me] Error loading image:', error);
        }
      } else {
        console.log('[About Me] No imageId in data');
      }
    }
  };

  useEffect(() => {
    fetchAboutMeData();
  }, []);

  return (
    <>
      <main className={`${styles.main} ${styles.aboutMePage}`}>
        <Box
          px={{ xs: '1.1rem', sm: '2rem' }}
          py={{ xs: '1.7rem', sm: '2rem' }}
          width="100%"
        >
          <AnimatePresence mode="wait">
            <motion.div
              className={styles.about_me_container}
              style={{ width: '100%' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              exit={{ opacity: 0 }}
            >
              <Box
                sx={{
                  height: {
                    xs: '1rem',
                    sm: '3rem',
                    md: '3rem',
                    lg: '3.5rem',
                    xl: '5rem',
                  },
                }}
              ></Box>
              <Box width="100%">
                <Typography
                  sx={{
                    fontSize: {
                      xs: '1.8rem',
                      sm: '2.8rem',
                    },
                  }}
                  fontWeight="bold"
                  variant="h3"
                >
                  {aboutMeData.title}
                </Typography>
                <Box height={15}></Box>

                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    gap: { xs: '2rem', md: '3rem' },
                    alignItems: { xs: 'flex-start', md: 'flex-start' },
                  }}
                >
                  <Box sx={{ flex: 4 }}>
                    <Typography
                      maxWidth={{
                        sm: '100%',
                        md: '95%',
                        lg: '95%',
                        xl: '95%',
                      }}
                      sx={{
                        fontSize: {
                          xs: '1.1rem',
                          sm: '1.1rem',
                        },
                        '& p': {
                          margin: 0,
                        },
                        '& a': {
                          textDecoration: 'underline',
                          textUnderlineOffset: '2px',
                        },
                        '& img': {
                          display: 'block',
                          maxWidth: '640px',
                          maxHeight: '640px',
                          width: '100%',
                          height: 'auto',
                        },
                      }}
                      dangerouslySetInnerHTML={{ __html: aboutMeData.content }}
                    />
                  </Box>

                  {imageMedia && <AboutMeImage media={imageMedia} />}
                </Box>
              </Box>

              <Box height={120}></Box>
            </motion.div>
          </AnimatePresence>
        </Box>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          style={{ width: '100%' }}
        >
          <Footer />
        </motion.div>
      </main>
    </>
  );
}

function AboutMeImage({ media }: { media: MediaDoc }) {
  const imageAsset =
    media.paths?.derivatives?.webp_small ??
    media.paths?.derivatives?.webp_medium ??
    media.paths?.original ??
    null;

  const imageSource = useStorageAssetSrc(
    imageAsset?.storagePath
      ? {
          storagePath: imageAsset.storagePath,
          downloadURL: imageAsset.downloadURL ?? null,
        }
      : null
  );

  return (
    <Box
      sx={{
        flex: 2,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        width: '100%',
        paddingTop: { xs: '2rem', md: 0 },
        paddingRight: { xs: 0, md: '2rem' },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: { xs: '11rem', sm: '220px', md: '100%' },
          height: { xs: '11rem', sm: '220px', md: 'auto' },
          maxWidth: { xs: '11rem', sm: 'none', md: '300px' },
          aspectRatio: { xs: 'auto', sm: '1', md: '1' },
          borderRadius: '50%',
          overflow: 'hidden',
        }}
      >
        <NextImage
          src={imageSource.src}
          alt="About Me"
          fill
          style={{ objectFit: 'cover' }}
          onError={imageSource.handleError}
        />
      </Box>
    </Box>
  );
}
