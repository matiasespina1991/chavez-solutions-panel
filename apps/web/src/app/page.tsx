'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import styles from './page.module.css';
import { MediaSet } from '@/utils/types/mediaset';
import { Media } from '@/utils/types/media';
import ScrollContainer from 'react-indiana-drag-scroll';
import { AnimatePresence, motion } from 'framer-motion';
import NextImage from 'next/image';
import { Box, Grid, IconButton, Theme, useMediaQuery } from '@mui/material';
import { isMobile } from 'react-device-detect';

import { useSwipeable } from 'react-swipeable';
import { fetchMediaSetsWithMedia } from '@/utils/functions/fetchMediaSetsWithMedia';
import { MinimalLeftArrowIcon } from './components/MinimalLeftArrowIcon';
import { MinimalRightArrowIcon } from './components/MinimalRightArrowIcon';
import ZoomableImage from './components/ZoomeableImage';
import ZoomeableVideo from './components/ZoomeableVideo';
import {
  selectImageAssets,
  selectVideoAssets,
} from '@/utils/media/assetSelectors';
import { useStorageAssetSrc } from '@/hooks/useStorageAssetSrc';
import Footer from './components/Footer';

type MediaWithHandlers = {
  m: Media;
  index: number;
  setIndex: number;
  setId: string;
  total: number;
  onMediaLoaded: (setId: string, index: number, total: number) => void;
  isVisible: boolean;
  sequenceVersion: number;
  isInitialLoad: boolean;
  showPostSkeleton: boolean;
  openLightbox: (
    mediaArray: Media[],
    mediaIndex: number,
    setIndex: number
  ) => void;
  mediaArray: Media[];
  setSize: number;
};

function MediaItem(props: MediaWithHandlers) {
  if (props.m.type === 'image') {
    return <ImageGridItem {...props} />;
  }
  return <VideoGridItem {...props} />;
}

function ImageGridItem({
  m,
  index,
  setIndex,
  setId,
  total,
  onMediaLoaded,
  isVisible,
  sequenceVersion,
  isInitialLoad,
  showPostSkeleton,
  openLightbox,
  mediaArray,
  setSize,
}: MediaWithHandlers) {
  const [loaded, setLoaded] = useState(false);
  const isMobileDevice = isMobile;
  const imageRef = useRef<HTMLImageElement | null>(null);
  const hasNotifiedRef = useRef(false);
  const canReveal = isVisible && loaded;
  const fadeDelay = isInitialLoad ? '2s' : '0s';

  useEffect(() => {
    setLoaded(false);
    hasNotifiedRef.current = false;
  }, [sequenceVersion]);

  useEffect(() => {
    setLoaded(false);
  }, [m.id]);

  const sources = useMemo(
    () => selectImageAssets(m, isMobileDevice),
    [m, isMobileDevice]
  );
  const lowImage = useStorageAssetSrc(sources.low ?? sources.original);

  const notifyLoaded = useCallback(() => {
    if (hasNotifiedRef.current) return;
    hasNotifiedRef.current = true;
    setLoaded(true);
    onMediaLoaded(setId, index, total);
  }, [index, onMediaLoaded, setId, total]);

  useEffect(() => {
    const img = imageRef.current;
    if (img && img.complete) {
      notifyLoaded();
    }
  }, [lowImage.src, sequenceVersion, notifyLoaded]);

  useEffect(() => {
    if (!lowImage.src) {
      notifyLoaded();
    }
  }, [lowImage.src, notifyLoaded]);

  useEffect(() => {
    if (!isInitialLoad) return;
    if (loaded) return;
    const timeout = window.setTimeout(() => {
      if (hasNotifiedRef.current) return;
      notifyLoaded();
    }, 3500);
    return () => window.clearTimeout(timeout);
  }, [isInitialLoad, loaded, notifyLoaded, setId, index, total, lowImage.src]);

  const handleImageError = () => {
    lowImage.handleError();
    notifyLoaded();
  };

  return (
    <motion.div
      className={styles.mediaHover}
      initial={{ opacity: 1, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        delay: Math.min(0.3 + setIndex * 0.15, 1.2),
        duration: 1.0,
      }}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      {!canReveal && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(128, 128, 128, 0.06)',
            borderRadius: isMobileDevice ? '8px' : '10px',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            zIndex: 0,
          }}
        />
      )}
      {showPostSkeleton ? (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(128, 128, 128, 0.06)',
            borderRadius: isMobileDevice ? '8px' : '10px',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        />
      ) : null}
      {lowImage.src ? (
        <NextImage
          ref={imageRef}
          draggable={false}
          width={600}
          height={600}
          onLoad={notifyLoaded}
          style={{
            userSelect: 'none',
            display: 'block',
            borderRadius: isMobileDevice ? '8px' : '10px',
            position: 'relative',
            zIndex: 1,
            opacity: canReveal ? 1 : 0,
            transition: `opacity 1.4s ease ${fadeDelay}`,
          }}
          src={lowImage.src}
          onError={handleImageError}
          onClick={() => openLightbox(mediaArray, index, setIndex)}
          alt={'Media'}
          className={styles.photoSetImage}
          priority={setIndex === 0 && index < 4}
          loading={setIndex === 0 ? 'eager' : 'lazy'}
        />
      ) : null}
      {/* SEE MORE LINK */}
      {/* <a
        className={styles.seeMore}
        href="https://zora.co"
        target="_blank"
        rel="noreferrer noopener"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        style={{
          fontSize: setSize === 1 ? '4rem' : setSize === 2 ? '3rem' : '2rem',
        }}
      >
        see in zora
        <img
          src="/images/logos/zora/zora_logo.svg"
          alt=""
          aria-hidden="true"
          style={{
            width: setSize === 1 ? '2.5rem' : setSize === 2 ? '2rem' : '1.5rem',
          }}
        />
        <img
          src="/images/icons/arrows/arrow_contact_light.png"
          alt=""
          aria-hidden="true"
          className={styles.seeMoreIcon}
        />
      </a> */}
    </motion.div>
  );
}

function VideoGridItem({
  m,
  index,
  setIndex,
  setId,
  total,
  onMediaLoaded,
  isVisible,
  sequenceVersion,
  isInitialLoad,
  showPostSkeleton,
  openLightbox,
  mediaArray,
  setSize,
}: MediaWithHandlers) {
  const [loaded, setLoaded] = useState(false);
  const isMobileDevice = isMobile;
  const hasNotifiedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canReveal = isVisible && loaded;
  const fadeDelay = isInitialLoad ? '2s' : '0s';

  useEffect(() => {
    setLoaded(false);
    hasNotifiedRef.current = false;
  }, [sequenceVersion]);

  useEffect(() => {
    setLoaded(false);
  }, [m.id]);

  const sources = useMemo(
    () => selectVideoAssets(m, isMobileDevice),
    [m, isMobileDevice]
  );
  const videoSource = useStorageAssetSrc(sources.low);
  const posterSource = useStorageAssetSrc(sources.poster);

  const handleVideoLoaded = useCallback(() => {
    if (hasNotifiedRef.current) return;
    hasNotifiedRef.current = true;
    setLoaded(true);
    onMediaLoaded(setId, index, total);
  }, [index, onMediaLoaded, setId, total]);

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    console.error('[MediaItem] video error', m.id, e);
    videoSource.handleError();
    if (hasNotifiedRef.current) return;
    hasNotifiedRef.current = true;
    setLoaded(true);
    onMediaLoaded(setId, index, total);
  };

  useEffect(() => {
    if (!videoSource.src) {
      if (hasNotifiedRef.current) return;
      hasNotifiedRef.current = true;
      setLoaded(true);
      onMediaLoaded(setId, index, total);
    }
  }, [videoSource.src, onMediaLoaded, setId, index, total]);

  useEffect(() => {
    const video = videoRef.current;
    if (video && video.readyState >= 2) {
      handleVideoLoaded();
    }
  }, [sequenceVersion, videoSource.src, handleVideoLoaded]);

  return (
    <motion.div
      className={styles.mediaHover}
      initial={{ opacity: 1, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        delay: Math.min(0.3 + setIndex * 0.15, 1.2),
        duration: 1.0,
      }}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      {!canReveal && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(128, 128, 128, 0.06)',
            borderRadius: isMobileDevice ? '8px' : '10px',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            zIndex: 0,
          }}
        />
      )}
      {showPostSkeleton ? (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(128, 128, 128, 0.06)',
            borderRadius: isMobileDevice ? '8px' : '10px',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        />
      ) : null}
      <video
        ref={videoRef}
        width="100%"
        height="100%"
        autoPlay
        loop
        muted
        playsInline
        preload={setIndex === 0 ? 'auto' : 'none'}
        poster={posterSource.src || undefined}
        src={videoSource.src || undefined}
        onLoadedData={handleVideoLoaded}
        onError={handleVideoError}
        style={{
          objectFit: 'cover',
          width: '100%',
          height: '100%',
          display: 'block',
          borderRadius: isMobileDevice ? '8px' : '10px',
          position: 'relative',
          zIndex: 1,
          opacity: canReveal ? 1 : 0,
          transition: `opacity 1.4s ease ${fadeDelay}`,
        }}
        onClick={() => openLightbox(mediaArray, index, setIndex)}
      >
        Your browser does not support video.
      </video>
      {/* SEE MORE LINK */}
      {/* <a
        className={styles.seeMore}
        href="https://zora.co"
        target="_blank"
        rel="noreferrer noopener"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        style={{
          fontSize: setSize === 1 ? '4rem' : setSize === 2 ? '3rem' : '2rem',
        }}
      >
        see in zora
        <img
          src="/images/logos/zora/zora_logo.svg"
          alt=""
          aria-hidden="true"
          style={{
            width: setSize === 1 ? '2.5rem' : setSize === 2 ? '2rem' : '1.5rem',
          }}
        />
        <img
          src="/images/icons/arrows/arrow_contact_light.png"
          alt=""
          aria-hidden="true"
          className={styles.seeMoreIcon}
        />
      </a> */}
    </motion.div>
  );
}

type LightboxMediaProps = {
  media: Media;
  isMobileQuery: boolean;
  isMobileDevice: boolean;
};

function LightboxMediaContent(props: LightboxMediaProps) {
  if (props.media.type === 'image') {
    return <LightboxImageContent {...props} />;
  }
  return <LightboxVideoContent {...props} />;
}

function LightboxImageContent({
  media,
  isMobileQuery,
  isMobileDevice,
}: LightboxMediaProps) {
  const sources = useMemo(
    () => selectImageAssets(media, isMobileDevice),
    [media, isMobileDevice]
  );
  const lowImage = useStorageAssetSrc(sources.low ?? sources.original);
  const highImage = useStorageAssetSrc(sources.high ?? sources.original);

  return (
    <ZoomableImage
      className="auto-cursor"
      lowSrc={lowImage.src || ''}
      highSrc={highImage.src || undefined}
      alt="Fullscreen Image"
      zoomScale={2.5}
      maxHeight={'87vh'}
      onLowSrcError={lowImage.handleError}
      onHighSrcError={highImage.handleError}
    />
  );
}

function LightboxVideoContent({
  media,
  isMobileQuery,
  isMobileDevice,
}: LightboxMediaProps) {
  const sources = useMemo(
    () => selectVideoAssets(media, isMobileDevice),
    [media, isMobileDevice]
  );
  const lowVideo = useStorageAssetSrc(sources.low, { preferDirect: false });
  const highVideo = useStorageAssetSrc(sources.high, { preferDirect: false });
  const posterSource = useStorageAssetSrc(sources.poster);

  return (
    <ZoomeableVideo
      className="auto-cursor"
      lowSrc={lowVideo.src || ''}
      highSrc={highVideo.src || undefined}
      poster={posterSource.src || undefined}
      zoomScale={isMobileDevice ? 2 : 3}
      maxHeight={'87vh'}
      autoPlay={true}
      muted={true}
      loop={true}
      onLowSrcError={lowVideo.handleError}
      onHighSrcError={highVideo.handleError}
    />
  );
}

export default function Home() {
  const [mediaSetsWithMedia, setMediaSetsWithMedia] = useState<
    { mediaset: MediaSet; media: Media[] }[]
  >([]);
  const [activeMediaIndex, setActiveMediaIndex] = useState<number | null>(null);
  const [activeMediaSetIndex, setActiveMediaSetIndex] = useState<number | null>(
    null
  );
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);
  const [lightboxImageIsDragging, setLightboxImageIsDragging] =
    useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [allImagesLoaded, setAllImagesLoaded] = useState<boolean>(false);
  const loadedFlagsRef = useRef<Record<string, boolean[]>>({});
  const [maxVisibleBySet, setMaxVisibleBySet] = useState<
    Record<string, number>
  >({});
  const [firstSetReady, setFirstSetReady] = useState(false);
  const [postSkeletonVisible, setPostSkeletonVisible] = useState(false);
  const [sequenceVersion, setSequenceVersion] = useState(0);
  const firstSetId = mediaSetsWithMedia[0]?.mediaset.id;
  const firstSetTotal = mediaSetsWithMedia[0]?.media.length ?? 0;

  const isMobileQuery = useMediaQuery((theme: Theme) =>
    theme.breakpoints.down('sm')
  );

  const getGridColumns = (length: number) => {
    switch (length) {
      case 1:
        return 1;
      case 2:
        return 2;
      case 3:
        return 3;
      case 4:
        return 4;
      case 5:
        return 4;
      case 6:
        return 3;
      case 7:
        return 4;
      case 8:
        return 4;
      default:
        return 1;
    }
  };

  useEffect(() => {
    async function loadMediaSets() {
      const cacheKey = 'home_mediaSets_cache';
      const cacheTimestampKey = 'home_mediaSets_cache_timestamp';

      let cachedData: string | null = null;

      // Try to load from cache first
      try {
        cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          setMediaSetsWithMedia(parsed);
          setIsLoading(false);
          setTimeout(() => setAllImagesLoaded(true), 800);
        }
      } catch (error) {
        console.error('Error loading from cache:', error);
      }

      // Fetch fresh data from database
      setIsLoading(cachedData ? false : true);
      if (!cachedData) {
        setAllImagesLoaded(false);
      }
      const fetched = await fetchMediaSetsWithMedia();
      setMediaSetsWithMedia(fetched);
      setIsLoading(false);
      setTimeout(() => setAllImagesLoaded(true), 800);

      // Save to cache
      try {
        localStorage.setItem(cacheKey, JSON.stringify(fetched));
        localStorage.setItem(cacheTimestampKey, Date.now().toString());
      } catch (error) {
        console.error('Error saving to cache:', error);
      }
    }
    loadMediaSets();
  }, []);

  useEffect(() => {
    setMaxVisibleBySet((prev) =>
      Object.fromEntries(
        mediaSetsWithMedia.map((setWithMedia) => {
          const setId = setWithMedia.mediaset.id;
          const total = setWithMedia.media.length;
          const prevLimit = prev[setId] ?? 0;
          const maxIndex = Math.max(total - 1, 0);
          return [setId, Math.min(prevLimit, maxIndex)];
        })
      )
    );
    if (!allImagesLoaded) {
      loadedFlagsRef.current = {};
      setFirstSetReady(false);
      setSequenceVersion((prev) => prev + 1);
    }
  }, [mediaSetsWithMedia, allImagesLoaded]);

  useEffect(() => {
    if (!firstSetId) {
      setFirstSetReady(false);
      return;
    }
    if (firstSetTotal === 0) {
      setFirstSetReady(true);
    }
  }, [firstSetId, firstSetTotal]);

  useEffect(() => {
    if (!allImagesLoaded) {
      setPostSkeletonVisible(false);
      return;
    }
    setPostSkeletonVisible(true);
    const timeout = window.setTimeout(() => {
      setPostSkeletonVisible(false);
    }, 3000);
    return () => window.clearTimeout(timeout);
  }, [allImagesLoaded]);

  const handleMediaLoaded = useCallback(
    (setId: string, index: number, total: number) => {
      const existing = loadedFlagsRef.current[setId];
      const flags = existing
        ? [...existing]
        : Array.from({ length: total }, () => false);
      if (flags.length !== total) {
        flags.length = total;
        for (let i = 0; i < total; i += 1) {
          if (typeof flags[i] !== 'boolean') flags[i] = false;
        }
      }
      if (flags[index]) return;
      flags[index] = true;
      loadedFlagsRef.current[setId] = flags;

      let contiguous = -1;
      for (let i = 0; i < flags.length; i += 1) {
        if (flags[i]) {
          contiguous = i;
        } else {
          break;
        }
      }

      const nextVisible = Math.min(contiguous + 1, total - 1);
      setMaxVisibleBySet((prev) => {
        if (prev[setId] === nextVisible) return prev;
        return { ...prev, [setId]: nextVisible };
      });

      if (firstSetId && setId === firstSetId) {
        const allLoaded =
          flags.length === firstSetTotal && flags.every(Boolean);
        if (allLoaded) setFirstSetReady(true);
      }
    },
    [firstSetId, firstSetTotal]
  );

  const handlePreviousMedia = useCallback(() => {
    if (activeMediaIndex !== null && activeMediaSetIndex !== null) {
      const currentSet = mediaSetsWithMedia[activeMediaSetIndex];
      if (activeMediaIndex > 0) {
        setActiveMediaIndex(activeMediaIndex - 1);
      } else {
        const prevSetIndex =
          activeMediaSetIndex > 0
            ? activeMediaSetIndex - 1
            : mediaSetsWithMedia.length - 1;
        const prevSet = mediaSetsWithMedia[prevSetIndex];
        if (prevSet.media.length > 0) {
          setActiveMediaSetIndex(prevSetIndex);
          setActiveMediaIndex(prevSet.media.length - 1);
        }
      }
    }
  }, [activeMediaIndex, activeMediaSetIndex, mediaSetsWithMedia]);

  const handleNextMedia = useCallback(() => {
    if (activeMediaIndex !== null && activeMediaSetIndex !== null) {
      const currentSet = mediaSetsWithMedia[activeMediaSetIndex];
      if (activeMediaIndex < currentSet.media.length - 1) {
        setActiveMediaIndex(activeMediaIndex + 1);
      } else {
        const nextSetIndex =
          activeMediaSetIndex < mediaSetsWithMedia.length - 1
            ? activeMediaSetIndex + 1
            : 0;
        const nextSet = mediaSetsWithMedia[nextSetIndex];
        if (nextSet.media.length > 0) {
          setActiveMediaSetIndex(nextSetIndex);
          setActiveMediaIndex(0);
        }
      }
    }
  }, [activeMediaIndex, activeMediaSetIndex, mediaSetsWithMedia]);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => handleNextMedia(),
    onSwipedRight: () => handlePreviousMedia(),
  });

  useEffect(() => {
    if (lightboxOpen) {
      document.body.classList.add('no-scroll');
      document.documentElement.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
      document.documentElement.classList.remove('no-scroll');
    }
    return () => {
      document.body.classList.remove('no-scroll');
      document.documentElement.classList.remove('no-scroll');
    };
  }, [lightboxOpen]);

  const openLightbox = (
    mediaArray: Media[],
    mediaIndex: number,
    setIndex: number
  ) => {
    setActiveMediaIndex(mediaIndex);
    setActiveMediaSetIndex(setIndex);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setActiveMediaIndex(null);
    setActiveMediaSetIndex(null);
  };

  useEffect(() => {
    if (lightboxOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowRight') handleNextMedia();
        if (e.key === 'ArrowLeft') handlePreviousMedia();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [lightboxOpen, handleNextMedia, handlePreviousMedia]);

  return (
    <>
      <main className={`${styles.main} ${styles.homePage}`}>
        <Box
          sx={{
            height: {
              xs: '2.2rem',
              sm: '4rem',
              md: '5rem',
              lg: '5rem',
              xl: '7rem',
            },
          }}
        />
        <Box
          px={{ xs: '1.2rem', sm: '2rem' }}
          pb={{ xs: '0rem', sm: '6rem' }}
          width="100%"
        >
          {isLoading || !allImagesLoaded ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, delay: 0.5 }}
            >
              <Box
                display="flex"
                flexDirection="column"
                gap={isMobileQuery ? '13px' : '16px'}
              >
                {/* Fila de 2 */}
                <Box
                  display="grid"
                  gridTemplateColumns="repeat(2, 1fr)"
                  gap={isMobileQuery ? '13px' : '16px'}
                >
                  <Box
                    sx={{
                      aspectRatio: '1',
                      backgroundColor: 'rgba(128, 128, 128, 0.1)',
                      borderRadius: isMobileQuery ? '8px' : '10px',
                      animation:
                        'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                      '@keyframes pulse': {
                        '0%, 100%': { opacity: 1 },
                        '50%': { opacity: 0.5 },
                      },
                    }}
                  />
                  <Box
                    sx={{
                      aspectRatio: '1',
                      backgroundColor: 'rgba(128, 128, 128, 0.06)',
                      borderRadius: isMobileQuery ? '8px' : '10px',
                      animation:
                        'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    }}
                  />
                </Box>
                {/* Fila de 4 */}
                <Box
                  display="grid"
                  gridTemplateColumns="repeat(4, 1fr)"
                  gap={isMobileQuery ? '13px' : '16px'}
                >
                  {[...Array(4)].map((_, i) => (
                    <Box
                      key={i}
                      sx={{
                        aspectRatio: '1',
                        backgroundColor: 'rgba(128, 128, 128, 0.06)',
                        borderRadius: isMobileQuery ? '8px' : '10px',
                        animation:
                          'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                      }}
                    />
                  ))}
                </Box>
                {/* Fila de 2 */}
                <Box
                  display="grid"
                  gridTemplateColumns="repeat(2, 1fr)"
                  gap={isMobileQuery ? '13px' : '16px'}
                >
                  <Box
                    sx={{
                      aspectRatio: '1',
                      backgroundColor: 'rgba(128, 128, 128, 0.06)',
                      borderRadius: isMobileQuery ? '8px' : '10px',
                      animation:
                        'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    }}
                  />
                  <Box
                    sx={{
                      aspectRatio: '1',
                      backgroundColor: 'rgba(128, 128, 128, 0.06)',
                      borderRadius: isMobileQuery ? '8px' : '10px',
                      animation:
                        'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    }}
                  />
                </Box>
                {/* Fila de 3 */}
                <Box
                  display="grid"
                  gridTemplateColumns="repeat(3, 1fr)"
                  gap={isMobileQuery ? '13px' : '16px'}
                >
                  {[...Array(3)].map((_, i) => (
                    <Box
                      key={i}
                      sx={{
                        aspectRatio: '1',
                        backgroundColor: 'rgba(128, 128, 128, 0.06)',
                        borderRadius: isMobileQuery ? '8px' : '10px',
                        animation:
                          'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                      }}
                    />
                  ))}
                </Box>
                {/* Fila de 2 (duplicada) */}
                <Box
                  display="grid"
                  gridTemplateColumns="repeat(2, 1fr)"
                  gap={isMobileQuery ? '13px' : '16px'}
                >
                  <Box
                    sx={{
                      aspectRatio: '1',
                      backgroundColor: 'rgba(128, 128, 128, 0.1)',
                      borderRadius: isMobileQuery ? '8px' : '10px',
                      animation:
                        'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    }}
                  />
                  <Box
                    sx={{
                      aspectRatio: '1',
                      backgroundColor: 'rgba(128, 128, 128, 0.06)',
                      borderRadius: isMobileQuery ? '8px' : '10px',
                      animation:
                        'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    }}
                  />
                </Box>
                {/* Fila de 4 (duplicada) */}
                <Box
                  display="grid"
                  gridTemplateColumns="repeat(4, 1fr)"
                  gap={isMobileQuery ? '13px' : '16px'}
                >
                  {[...Array(4)].map((_, i) => (
                    <Box
                      key={i}
                      sx={{
                        aspectRatio: '1',
                        backgroundColor: 'rgba(128, 128, 128, 0.06)',
                        borderRadius: isMobileQuery ? '8px' : '10px',
                        animation:
                          'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                      }}
                    />
                  ))}
                </Box>
                {/* Fila de 2 (duplicada) */}
                <Box
                  display="grid"
                  gridTemplateColumns="repeat(2, 1fr)"
                  gap={isMobileQuery ? '13px' : '16px'}
                >
                  <Box
                    sx={{
                      aspectRatio: '1',
                      backgroundColor: 'rgba(128, 128, 128, 0.06)',
                      borderRadius: isMobileQuery ? '8px' : '10px',
                      animation:
                        'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    }}
                  />
                  <Box
                    sx={{
                      aspectRatio: '1',
                      backgroundColor: 'rgba(128, 128, 128, 0.06)',
                      borderRadius: isMobileQuery ? '8px' : '10px',
                      animation:
                        'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    }}
                  />
                </Box>
                {/* Fila de 3 (duplicada) */}
                <Box
                  display="grid"
                  gridTemplateColumns="repeat(3, 1fr)"
                  gap={isMobileQuery ? '13px' : '16px'}
                >
                  {[...Array(3)].map((_, i) => (
                    <Box
                      key={i}
                      sx={{
                        aspectRatio: '1',
                        backgroundColor: 'rgba(128, 128, 128, 0.06)',
                        borderRadius: isMobileQuery ? '8px' : '10px',
                        animation:
                          'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </motion.div>
          ) : null}

          {mediaSetsWithMedia.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: allImagesLoaded ? 1 : 0 }}
              transition={{ duration: 1.2 }}
            >
              <ScrollContainer draggable={false} className={styles.carousel}>
                {mediaSetsWithMedia.map((setWithMedia, setIndex) => {
                  if (setIndex > 0 && !firstSetReady) return null;
                  const columns =
                    isMobileQuery && setWithMedia.media.length === 4
                      ? 2
                      : getGridColumns(setWithMedia.media.length);
                  const setId = setWithMedia.mediaset.id;
                  const visibleLimit = maxVisibleBySet[setId] ?? 0;

                  return (
                    <motion.div
                      key={setWithMedia.mediaset.id}
                      className={styles.photoSetContainer}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{
                        duration: 1,
                        ease: 'easeInOut',
                        delay: setIndex * 0.12,
                      }}
                    >
                      {setWithMedia.media.length > 0 && (
                        <Box>
                          <Grid
                            className="media-grid"
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: `repeat(${columns}, 1fr)`,
                            }}
                            gap={isMobileQuery ? '13px' : '16px'}
                          >
                            {setWithMedia.media.map((m, mediaIndex) => {
                              if (mediaIndex > visibleLimit) return null;
                              return (
                                <Box key={m.id} width="100%" height="100%">
                                  <MediaItem
                                    m={m}
                                    index={mediaIndex}
                                    setIndex={setIndex}
                                    setId={setId}
                                    total={setWithMedia.media.length}
                                    setSize={setWithMedia.media.length}
                                    onMediaLoaded={handleMediaLoaded}
                                    isVisible={mediaIndex <= visibleLimit}
                                    sequenceVersion={sequenceVersion}
                                    isInitialLoad={!allImagesLoaded}
                                    showPostSkeleton={postSkeletonVisible}
                                    openLightbox={openLightbox}
                                    mediaArray={setWithMedia.media}
                                  />
                                </Box>
                              );
                            })}
                          </Grid>
                        </Box>
                      )}
                    </motion.div>
                  );
                })}
              </ScrollContainer>
            </motion.div>
          )}

          {/* Lightbox */}
          <AnimatePresence mode="wait">
            {lightboxOpen &&
              activeMediaIndex !== null &&
              activeMediaSetIndex !== null && (
                <motion.div
                  onClick={closeLightbox}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  style={{
                    touchAction: 'none',
                    display: 'flex',
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    height: '100vh',
                    width: '100vw',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingBottom: isMobileQuery ? '5rem' : '0',
                    zIndex: 900,
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    backdropFilter: 'blur(2px) saturate(0)',
                    overscrollBehavior: 'none',
                    pointerEvents: 'auto',
                    WebkitTouchCallout: 'none',
                    WebkitUserSelect: 'none',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: 900,
                      background: 'transparent',
                      pointerEvents: 'auto',
                    }}
                  />
                  <IconButton
                    sx={{
                      position: 'absolute',
                      left: '1rem',
                      color: 'white',
                      zIndex: 1000,
                      transform: 'scale(1.5)',
                      opacity: lightboxImageIsDragging ? 0 : 1,
                      transition: 'opacity 0.3s',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreviousMedia();
                    }}
                  >
                    <MinimalLeftArrowIcon />
                  </IconButton>

                  <Box
                    sx={{
                      position: 'relative',
                      cursor: 'pointer',
                      zIndex: 900,
                      display: 'grid',
                      width: '100%',
                      height: '100%',
                      placeItems: 'center',
                    }}
                    onClick={closeLightbox}
                  >
                    <AnimatePresence>
                      <motion.div
                        key={
                          mediaSetsWithMedia[activeMediaSetIndex].media[
                            activeMediaIndex
                          ].id
                        }
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        // {...swipeHandlers}
                        style={{
                          gridArea: '1 / 1',
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          pointerEvents: 'none',
                        }}
                      >
                        <Box
                          onClick={(e) => e.stopPropagation()}
                          onTouchStart={(e) => {}}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                          }}
                          style={{
                            display: 'block',
                            userSelect: 'none',
                            pointerEvents: 'auto',
                            maxWidth: '99vw',
                            maxHeight: '80vh',
                            margin: '0 auto',
                          }}
                        >
                          <Box
                            sx={{
                              borderRadius: '6px',
                              overflow: 'hidden',
                            }}
                          >
                            <IconButton
                              sx={{
                                position: 'absolute',
                                top: '1rem',
                                right: '1rem',
                                color: 'white',
                                zIndex: 9999,
                                opacity: lightboxImageIsDragging ? 0 : 1,
                                transition: 'opacity 0.3s',
                                transform: 'scale(1.3)',
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                closeLightbox();
                              }}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                width="35px"
                                height="35px"
                              >
                                <line
                                  x1="6"
                                  y1="6"
                                  x2="18"
                                  y2="18"
                                  stroke="currentColor"
                                  strokeWidth="0.6"
                                />
                                <line
                                  x1="18"
                                  y1="6"
                                  x2="6"
                                  y2="18"
                                  stroke="currentColor"
                                  strokeWidth="0.6"
                                />
                              </svg>
                            </IconButton>

                            {(() => {
                              const media =
                                mediaSetsWithMedia[activeMediaSetIndex].media[
                                  activeMediaIndex
                                ];
                              return (
                                <LightboxMediaContent
                                  media={media}
                                  isMobileQuery={isMobileQuery}
                                  isMobileDevice={isMobile}
                                />
                              );
                            })()}
                          </Box>
                        </Box>
                      </motion.div>
                    </AnimatePresence>
                  </Box>

                  <IconButton
                    sx={{
                      position: 'absolute',
                      right: '1rem',
                      color: 'white',
                      zIndex: 1000,
                      opacity: lightboxImageIsDragging ? 0 : 1,
                      transition: 'opacity 0.3s',
                      transform: 'scale(1.5)',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextMedia();
                    }}
                  >
                    <MinimalRightArrowIcon />
                  </IconButton>
                </motion.div>
              )}
          </AnimatePresence>
        </Box>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          style={{ width: '100%', marginTop: 'auto' }}
        >
          <Footer />
        </motion.div>
      </main>
    </>
  );
}
