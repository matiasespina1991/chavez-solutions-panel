'use client';

import {
  Box,
  IconButton,
  Stack,
  Theme,
  Typography,
  useMediaQuery,
} from '@mui/material';
import styles from '../page.module.css';
import { AnimatePresence, motion } from 'framer-motion';
import { useContext, useEffect, useMemo, useState } from 'react';
import { ThemeContext } from '../ThemeRegistry';
import Footer from '../components/Footer';
import ZoomableImage from '../components/ZoomeableImage';
import ZoomeableVideo from '../components/ZoomeableVideo';
import { Media } from '@/utils/types/media';
import db from '@/utils/config/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore';
import {
  selectImageAssets,
  selectVideoAssets,
} from '@/utils/media/assetSelectors';
import { useStorageAssetSrc } from '@/hooks/useStorageAssetSrc';
import { isMobile } from 'react-device-detect';

type Exhibition = {
  id: string;
  title: string;
  meta?: string;
  paragraphs: string[];
  mediaItems?: Media[];
};

type ExhibitionDoc = {
  title?: string;
  dateAndLocation?: string;
  body?: string;
  mediaIds?: string[];
  featureMediaId?: string | null;
  order?: number;
};

const parseBodyParagraphs = (body: string) => {
  const trimmed = body.trim();
  if (!trimmed) return [];
  if (typeof window === 'undefined') {
    const fallback = trimmed
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return fallback ? [fallback] : [];
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(trimmed, 'text/html');
  const paragraphs = Array.from(doc.body.querySelectorAll('p'))
    .map((node) => node.innerHTML.trim())
    .filter(Boolean);
  if (paragraphs.length) return paragraphs;
  const fallback = doc.body.innerHTML.trim();
  return fallback ? [fallback] : [];
};

const uniqueIds = (items: string[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item)) return false;
    seen.add(item);
    return true;
  });
};

function ExhibitionVideoPlayer({
  media,
  maxHeight = '45rem',
  onClick,
}: {
  media: Media;
  maxHeight?: string;
  onClick?: () => void;
}) {
  const isMobileDevice = isMobile;
  const isSmallViewport = useMediaQuery((theme: Theme) =>
    theme.breakpoints.down('sm')
  );
  const [loaded, setLoaded] = useState(false);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [media.id]);

  const sources = useMemo(
    () => selectVideoAssets(media, isMobileDevice),
    [media, isMobileDevice]
  );
  const videoSource = useStorageAssetSrc(sources.low);
  const posterSource = useStorageAssetSrc(sources.poster);

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    console.error('[Exhibitions] video error', media.id, e);
    videoSource.handleError();
  };

  return (
    <Box
      sx={{
        opacity: loaded ? 1 : 0,
        transition: 'opacity 300ms ease',
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
        paddingInline: isSmallViewport ? '0rem' : '3rem',
      }}
    >
      <video
        width="100%"
        height="100%"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        controls={showControls}
        poster={posterSource.src || undefined}
        src={videoSource.src || undefined}
        onLoadedData={() => setLoaded(true)}
        onError={handleVideoError}
        onClick={onClick}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
        style={{
          objectFit: 'contain',
          width: '100%',
          height: 'auto',
          maxWidth: '45rem',
          maxHeight,
          paddingInline: '0rem',
          display: 'block',
          borderRadius: isMobileDevice ? '8px' : '10px',
          touchAction: 'pan-y',
        }}
      >
        Your browser does not support video.
      </video>
    </Box>
  );
}

function ExhibitionImage({
  media,
  maxHeight = '45rem',
  onClick,
}: {
  media: Media;
  maxHeight?: string;
  onClick?: () => void;
}) {
  const isMobileDevice = isMobile;
  const sources = useMemo(
    () => selectImageAssets(media, isMobileDevice),
    [media, isMobileDevice]
  );
  const imageSource = useStorageAssetSrc(
    sources.high ?? sources.low ?? sources.original
  );

  return (
    <Box>
      <img
        src={imageSource.src || ''}
        alt={media.title ?? 'Imagen de exhibición'}
        onError={imageSource.handleError}
        onClick={onClick}
        style={{
          objectFit: 'contain',
          width: '100%',
          height: 'auto',
          maxHeight,

          // maxHeight: '90vh',
          display: 'block',
          borderRadius: isMobileDevice ? '8px' : '10px',
        }}
      />
    </Box>
  );
}

function ExhibitionMediaCarousel({
  items,
  mode,
  onMediaClick,
}: {
  items: Media[];
  mode: 'light' | 'dark';
  onMediaClick?: (media: Media) => void;
}) {
  const isMobileDevice = isMobile;
  const [activeIndex, setActiveIndex] = useState(0);
  const total = items.length;

  useEffect(() => {
    setActiveIndex(0);
  }, [items.map((item) => item.id).join('|')]);

  const goPrev = () => {
    setActiveIndex((prev) => (prev === 0 ? total - 1 : prev - 1));
  };

  const goNext = () => {
    setActiveIndex((prev) => (prev === total - 1 ? 0 : prev + 1));
  };

  const activeItem = items[activeIndex];

  const controlColor = '#ffffff';
  const controlBg = mode === 'dark' ? 'rgba(10, 10, 10, 0.6)' : '#151515c4';
  const controlBorder = '#d3d3d330';
  const dotColor = '#202020ff';

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth: '48rem',
        marginInline: 'auto',
        paddingBottom: '1rem',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {total > 1 && (
          <>
            <Box
              component="button"
              type="button"
              onClick={goPrev}
              aria-label="Previous media"
              sx={{
                position: 'absolute',
                left: 0,
                top: '50%',
                backdropFilter: 'blur(2px)',
                transform: 'translate(0%, -50%)',
                width: '2.4rem',
                height: '2.4rem',
                borderRadius: '999px',
                backgroundColor: controlBg,
                border: `1px solid ${controlBorder}`,
                color: controlColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
              }}
            >
              <Box component="span" sx={{ fontSize: '1.4rem', mb: '4px' }}>
                ‹
              </Box>
            </Box>
            <Box
              component="button"
              type="button"
              onClick={goNext}
              aria-label="Next media"
              sx={{
                position: 'absolute',
                right: 0,
                top: '50%',
                backdropFilter: 'blur(2px)',
                transform: 'translate(0%, -50%)',
                width: '2.4rem',
                height: '2.4rem',
                borderRadius: '999px',
                backgroundColor: controlBg,
                border: `1px solid ${controlBorder}`,
                color: controlColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
              }}
            >
              <Box component="span" sx={{ fontSize: '1.4rem', mb: '4px' }}>
                ›
              </Box>
            </Box>
          </>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeItem.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            style={{
              width: '100%',
              display: 'flex',
              minHeight: isMobile ? '10rem' : '20rem',

              justifyContent: 'center',
              alignItems: 'flex-start',
            }}
          >
            {activeItem.type === 'video' ? (
              <ExhibitionVideoPlayer
                media={activeItem}
                maxHeight="28rem"
                onClick={() => onMediaClick?.(activeItem)}
              />
            ) : (
              <ExhibitionImage
                media={activeItem}
                maxHeight="28rem"
                onClick={() => onMediaClick?.(activeItem)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </Box>
      {total > 1 && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.5rem',
            marginTop: '0.75rem',
          }}
        >
          {items.map((_, index) => {
            const isActive = index === activeIndex;
            return (
              <Box
                key={`dot-${items[index].id}`}
                component="button"
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Go to media ${index + 1}`}
                sx={{
                  width: isActive ? '0.50rem' : '0.45rem',
                  height: isActive ? '0.50rem' : '0.45rem',
                  borderRadius: '999px',
                  border: `1px solid ${dotColor}`,
                  backgroundColor: isActive ? dotColor : 'transparent',
                  opacity: isActive ? 1 : 0.6,
                  transition: 'all 200ms ease',
                  cursor: 'pointer',
                }}
              />
            );
          })}
        </Box>
      )}
    </Box>
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

export default function Exhibitions() {
  const { mode } = useContext(ThemeContext);
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [loading, setLoading] = useState(true);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeMedia, setActiveMedia] = useState<Media | null>(null);

  const isMobileQuery = useMediaQuery((theme: Theme) =>
    theme.breakpoints.down('sm')
  );

  useEffect(() => {
    // Defensive: avoid getting stuck with a global scroll-lock class
    // (can be very noticeable on real mobile Safari).
    document.body.classList.remove('no-scroll');
    document.documentElement.classList.remove('no-scroll');
  }, []);

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

  useEffect(() => {
    let isMounted = true;

    const loadExhibitions = async () => {
      setLoading(true);
      try {
        const exhibitionsSnap = await getDocs(
          query(collection(db, 'exhibitions'), orderBy('order', 'asc'))
        );

        const rows = await Promise.all(
          exhibitionsSnap.docs.map(async (docSnap) => {
            const data = docSnap.data() as ExhibitionDoc;
            const paragraphs = parseBodyParagraphs(data.body ?? '');
            const meta = data.dateAndLocation?.trim() || undefined;

            const rawIds = [
              data.featureMediaId ?? null,
              ...(data.mediaIds ?? []),
            ].filter(Boolean) as string[];
            const mediaIds = uniqueIds(rawIds);

            const mediaDocs = await Promise.all(
              mediaIds.map(async (mediaId) => {
                const mediaSnap = await getDoc(doc(db, 'media', mediaId));
                if (!mediaSnap.exists()) return null;
                const mediaData = mediaSnap.data() as Omit<Media, 'id'>;
                const normalized = { ...mediaData, id: mediaSnap.id };
                return normalized.deletedAt ? null : normalized;
              })
            );

            const mediaItems = mediaIds
              .map((mediaId) => mediaDocs.find((item) => item?.id === mediaId))
              .filter((item): item is Media => Boolean(item));

            return {
              id: docSnap.id,
              title: data.title ?? '',
              meta,
              paragraphs,
              mediaItems: mediaItems.length ? mediaItems : undefined,
            };
          })
        );

        if (isMounted) {
          setExhibitions(rows);
        }
      } catch (error) {
        console.error('[Exhibitions] load exhibitions error', error);
        if (isMounted) {
          setExhibitions([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadExhibitions();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (openIndex === null) return;
    if (openIndex > exhibitions.length - 1) {
      setOpenIndex(null);
    }
  }, [exhibitions.length, openIndex]);

  const toggleExhibition = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  const openLightbox = (media: Media) => {
    setActiveMedia(media);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setActiveMedia(null);
  };

  return (
    <>
      <main className={`${styles.main} ${styles.exhibitionsPage}`}>
        <Box
          px={{ xs: '1.1rem', sm: '2rem' }}
          py={{ xs: '2rem', sm: '6rem' }}
          width="100%"
        >
          <Box
            className={styles.exhibition_page_container}
            height="100%"
            width="100%"
          >
            <AnimatePresence mode="wait">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                exit={{ opacity: 0 }}
              >
                <Stack
                  px={{
                    xs: '0.3rem',
                    sm: '0',
                  }}
                  gap={1.5}
                >
                  <Typography
                    sx={{
                      overflowWrap: 'break-word',
                      fontSize: {
                        xs: '1.8rem',
                        sm: '2.5rem',
                      },
                    }}
                    fontWeight="bold"
                    variant="h3"
                  >
                    EXHIBITIONS
                  </Typography>
                  <Box height={10}></Box>
                  {loading ? (
                    //Show skeleton loaders while loading
                    <Box>
                      {Array.from({ length: 3 }).map((_, index) => (
                        <Box key={index} maxWidth={800} mb={4}>
                          <Box
                            sx={{
                              height: '2rem',
                              width: '60%',
                              backgroundColor:
                                mode === 'dark'
                                  ? 'rgba(255, 255, 255, 0.1)'
                                  : 'rgba(0, 0, 0, 0.1)',
                              borderRadius: '4px',
                              mb: 2,
                            }}
                          ></Box>
                          <Box
                            sx={{
                              height: '1.5rem',
                              width: '100%',
                              backgroundColor:
                                mode === 'dark'
                                  ? 'rgba(255, 255, 255, 0.05)'
                                  : 'rgba(0, 0, 0, 0.05)',
                              borderRadius: '4px',
                              mb: 1,
                            }}
                          ></Box>
                          <Box
                            sx={{
                              height: '1.5rem',
                              width: '100%',
                              backgroundColor:
                                mode === 'dark'
                                  ? 'rgba(255, 255, 255, 0.05)'
                                  : 'rgba(0, 0, 0, 0.05)',
                              borderRadius: '4px',
                              mb: 1,
                            }}
                          ></Box>
                          <Box
                            sx={{
                              height: '1.5rem',
                              width: '80%',
                              backgroundColor:
                                mode === 'dark'
                                  ? 'rgba(255, 255, 255, 0.05)'
                                  : 'rgba(0, 0, 0, 0.05)',
                              borderRadius: '4px',
                            }}
                          ></Box>
                        </Box>
                      ))}
                    </Box>
                  ) : exhibitions.length === 0 ? (
                    <Typography
                      sx={{ fontSize: { xs: '1rem', sm: '1.1rem' } }}
                      color="text.secondary"
                    >
                      Todavía no hay exhibiciones publicadas.
                    </Typography>
                  ) : (
                    exhibitions.map((exhibition, index) => {
                      const isOpen = openIndex === index;
                      return (
                        <Box key={exhibition.id}>
                          <Box
                            onClick={() => toggleExhibition(index)}
                            sx={{
                              height: 'auto',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Typography
                              sx={{
                                overflowWrap: 'break-word',
                                fontSize: {
                                  xs: '1.4rem',
                                  sm: '2.5rem',
                                },
                              }}
                              fontWeight="bold"
                              variant="h3"
                            >
                              <img
                                src="/images/icons/arrows/arrow_contact_light.png"
                                alt="Toggle exhibition description"
                                style={{
                                  width: '0.72em',
                                  height: '0.72em',
                                  marginRight: '0.3em',
                                  filter:
                                    mode === 'dark' ? 'invert(1)' : 'none',
                                }}
                              />
                              {exhibition.title}
                            </Typography>
                          </Box>
                          <AnimatePresence initial={false}>
                            {isOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{
                                  duration: 0.3,
                                  ease: 'easeInOut',
                                }}
                              >
                                <Box mt={1.5} pl={{ xs: 0, sm: '1.8rem' }}>
                                  {(() => {
                                    const textContent = (
                                      <>
                                        {exhibition.meta && (
                                          <Typography
                                            variant="subtitle1"
                                            sx={{
                                              fontSize: '1.1rem',
                                              fontStyle: 'italic',
                                              fontWeight: 500,
                                            }}
                                          >
                                            {exhibition.meta}
                                          </Typography>
                                        )}
                                        {exhibition.paragraphs.map(
                                          (paragraph, paragraphIndex) => (
                                            <Typography
                                              key={`${exhibition.id}-${paragraphIndex}`}
                                              component="div"
                                              sx={{
                                                mt:
                                                  paragraphIndex === 0
                                                    ? 1.5
                                                    : 1,
                                                fontSize: {
                                                  xs: '1rem',
                                                  sm: '1.1rem',
                                                },
                                                lineHeight: 1.6,
                                                '& a': {
                                                  display: 'inline',
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
                                              dangerouslySetInnerHTML={{
                                                __html: paragraph,
                                              }}
                                            />
                                          )
                                        )}
                                      </>
                                    );

                                    if (!exhibition.mediaItems?.length) {
                                      return textContent;
                                    }

                                    return (
                                      <Box
                                        className="exhibition-content-grid"
                                        sx={{
                                          display: 'grid',
                                          gridTemplateColumns: {
                                            xs: '1fr',
                                            md: 'minmax(0, 1fr) minmax(0, 1fr)',
                                          },
                                          alignItems: 'start',
                                          columnGap: {
                                            xs: '0',
                                            md: '1.5rem',
                                          },
                                          rowGap: {
                                            xs: '1.5rem',
                                            md: 0,
                                          },
                                          padding: isMobile ? '0rem' : '1rem',
                                        }}
                                      >
                                        <Box sx={{ minWidth: 0 }}>
                                          {textContent}
                                        </Box>
                                        <Box
                                          sx={{
                                            minWidth: 0,
                                            width: '100%',
                                          }}
                                        >
                                          <ExhibitionMediaCarousel
                                            items={exhibition.mediaItems}
                                            mode={mode}
                                            onMediaClick={openLightbox}
                                          />
                                        </Box>
                                      </Box>
                                    );
                                  })()}
                                </Box>
                              </motion.div>
                            )}
                          </AnimatePresence>
                          <Box height={10}></Box>
                        </Box>
                      );
                    })
                  )}
                </Stack>
              </motion.div>
            </AnimatePresence>
            <AnimatePresence mode="wait">
              {lightboxOpen && activeMedia && (
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
                    <motion.div
                      key={activeMedia.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
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
                          <LightboxMediaContent
                            media={activeMedia}
                            isMobileQuery={isMobileQuery}
                            isMobileDevice={isMobile}
                          />
                        </Box>
                      </Box>
                    </motion.div>
                  </Box>
                </motion.div>
              )}
            </AnimatePresence>
          </Box>
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
