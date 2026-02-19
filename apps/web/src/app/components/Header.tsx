'use client';
import React, { useState, useEffect, useRef, useContext, use } from 'react';
import { createPortal } from 'react-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import { Stack } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import NextLink from 'next/link';
import { MinimalMenuIcon } from './MinimalMenuIcon';
import { MinimalCloseIcon } from './MinimalCloseIcon';
import BurgerIcon from './BurgerIcon';
import { ThemeContext } from '../ThemeRegistry';
import { useThemeTransition } from '@/components/ui/shadcn-io/theme-toggle-button';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import MobileDrawer from './MobileDrawer';

const isDevBranch =
  process.env.NEXT_PUBLIC_DEPLOY_ENV === 'dev' ||
  process.env.NODE_ENV === 'development';

export default function Header() {
  // principal state/hooks (siempre en el top)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [worksDropdownOpen, setWorksDropdownOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const pathname = usePathname();
  const [isHome, setIsHome] = useState<boolean>(true);
  const { toggleTheme, mode } = useContext(ThemeContext);

  // Custom transition function with top-right origin
  const startTransitionFromTopRight = () => {
    const styleId = `theme-transition-${Date.now()}`;
    const style = document.createElement('style');
    style.id = styleId;

    const css = `
      @supports (view-transition-name: root) {
        ::view-transition-old(root) { 
          animation: none;
        }
        ::view-transition-new(root) {
          animation: circle-expand 0.8s ease-out;
          transform-origin: top right;
        }
        @keyframes circle-expand {
          from {
            clip-path: circle(0% at 100% 0%);
          }
          to {
            clip-path: circle(150% at 100% 0%);
          }
        }
      }
    `;

    style.textContent = css;
    document.head.appendChild(style);

    if ('startViewTransition' in document) {
      (document as any).startViewTransition(() => {
        toggleTheme();
      });
    } else {
      toggleTheme();
    }

    setTimeout(() => {
      const styleEl = document.getElementById(styleId);
      if (styleEl) {
        styleEl.remove();
      }
    }, 1000);
  };

  // --- Hooks para el dropdown fuera del AppBar (moved before any early return) ---
  const worksButtonRef = useRef<HTMLButtonElement | null>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [dropdownRect, setDropdownRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  // efectos que usan esos hooks
  useEffect(() => {
    setIsHome(pathname === '/');
  }, [pathname]);

  useEffect(() => {
    setIsMounted(true);
    console.log(process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REFs);
  }, []);

  // Synchronous measurement function
  const updateDropdownRect = () => {
    if (!worksButtonRef.current) return;
    const rect = worksButtonRef.current.getBoundingClientRect();
    setDropdownRect({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    });
  };

  useEffect(() => {
    if (worksDropdownOpen) {
      updateDropdownRect();
    }
  }, [worksDropdownOpen, isMobile, isHome]);

  useEffect(() => {
    const handleResize = () => {
      if (worksDropdownOpen) updateDropdownRect();
    };
    const handleScroll = () => {
      if (worksDropdownOpen) updateDropdownRect();
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [worksDropdownOpen]);

  // Close when clicking outside
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        worksDropdownOpen &&
        !worksButtonRef.current?.contains(target) &&
        !portalRef.current?.contains(target)
      ) {
        setWorksDropdownOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setWorksDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [worksDropdownOpen]);

  const handleBrandClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const worksCategoriesItems = [
    { label: 'Caves', href: '/works/caves' },
    { label: 'Landscapes', href: '/works/landscapes' },
  ];

  // Early return (seguimos manteniéndolo), pero ahora TODOS los hooks se han declarado arriba
  if (!isMounted) return null;

  return (
    <AppBar
      elevation={0}
      position="fixed"
      sx={{
        zIndex: 1,
        backgroundColor: 'transparent',
        color: 'white',
        mixBlendMode: 'difference',
      }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
      >
        <Toolbar
          sx={{
            height: isMobile ? '78px' : '101px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
          variant="dense"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1.5 }}
            style={{
              WebkitTransform: 'translateZ(0)',
              transform: 'translateZ(0)',
            }}
          >
            <Typography
              variant="h3"
              fontWeight="bold"
              fontFamily="Helvetica Neue, sans-serif"
              pl="0.25rem"
              color="white"
              letterSpacing="-0.04em"
              component="div"
              sx={{
                pt: {
                  xl: '1.6rem',
                  xs: '1.1rem',
                },
                flexGrow: 1,
                WebkitTransform: 'translateZ(0)',
                transform: 'translateZ(0)',
                marginTop: isHome ? '0rem' : '0.75rem;',
                fontSize: isHome
                  ? {
                      xs: '36px',
                      sm: '50px',
                      md: '82px',
                      lg: '82px',
                      xl: '82px',
                    }
                  : '20px !important',
                ...(!isHome && { pt: '0rem !important' }),
                transition: '0.5s',
              }}
            >
              {!isMobile ||
                (mode === 'dark' && (
                  <Box
                    sx={{
                      width: '100%',
                      position: 'absolute',
                      height: '100%',
                      backdropFilter: 'blur(0.3px)',
                      pointerEvents: 'none',
                    }}
                  ></Box>
                ))}

              <NextLink
                href="/"
                prefetch
                onClick={handleBrandClick}
                style={{
                  width: '100%',
                  textDecoration: 'none',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  WebkitTransform: 'translateZ(0)',
                  transform: 'translateZ(0)',
                }}
              >
                <Box
                  component="span"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    fontWeight: '400',
                    overflow: 'hidden',
                    width: isHome ? '0rem' : '1.5rem',
                    transition: '0.5s',
                    transitionDelay: isHome ? '0.5s' : '0.5s',
                    fontSize: isHome ? '40px' : '20px',
                    WebkitTransform: 'translateZ(0)',
                    transform: 'translateZ(0)',
                  }}
                >
                  ←{' '}
                </Box>
                Laura Butallo
              </NextLink>
            </Typography>
          </motion.div>

          {isMobile ? (
            <Box
              sx={{
                display: 'flex',
                gap: '0.3rem',
              }}
            >
              <IconButton
                disableRipple
                onClick={startTransitionFromTopRight}
                color="inherit"
                sx={{
                  mt: { xs: '0.6rem', sm: '0rem' },
                  mr: { xs: '0.5rem', sm: '0rem' },
                }}
                aria-label={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
              >
                {mode === 'light' ? (
                  <DarkModeIcon sx={{ fontSize: '1.6rem' }} />
                ) : (
                  <LightModeIcon sx={{ fontSize: '1.6rem' }} />
                )}
              </IconButton>
              <IconButton
                disableRipple
                edge="end"
                color="inherit"
                sx={{
                  mt: { xs: '0.6rem', sm: '0rem' },
                  mr: { xs: '-0.3rem', sm: '0rem' },
                }}
                aria-label="menu"
                onClick={() => setDrawerOpen(true)}
              >
                <MinimalMenuIcon />
              </IconButton>
              <MobileDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                worksCategoriesItems={worksCategoriesItems}
              />
            </Box>
          ) : (
            <Stack
              direction="row"
              gap={4}
              position="relative"
              sx={{
                alignItems: 'center',
              }}
            >
              <IconButton
                disableRipple
                onClick={startTransitionFromTopRight}
                color="inherit"
                aria-label={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
              >
                {mode === 'light' ? (
                  <DarkModeIcon sx={{ fontSize: '1.1rem' }} />
                ) : (
                  <LightModeIcon sx={{ fontSize: '1.1rem' }} />
                )}
              </IconButton>
              {!isMobile ? null : <BurgerIcon />}

              <Button
                disableRipple
                component={NextLink}
                href="/"
                prefetch
                variant="text"
                sx={{
                  textTransform: 'unset',
                  '&:hover': {
                    backgroundColor: 'transparent',
                  },
                }}
                color="inherit"
              >
                <span>Home</span>
              </Button>

              <Box position="relative" sx={{ display: 'inline-block' }}>
                <Button
                  disableRipple
                  ref={worksButtonRef}
                  variant="text"
                  sx={{
                    textTransform: 'unset',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '6px 8px',
                    '&:hover': {
                      backgroundColor: 'transparent',
                    },
                  }}
                  color="inherit"
                  onMouseEnter={() => {
                    if (hoverTimeoutRef.current) {
                      clearTimeout(hoverTimeoutRef.current);
                      hoverTimeoutRef.current = null;
                    }
                    updateDropdownRect();
                    setWorksDropdownOpen(true);
                  }}
                  onMouseLeave={() => {
                    if (hoverTimeoutRef.current) {
                      clearTimeout(hoverTimeoutRef.current);
                    }
                    hoverTimeoutRef.current = setTimeout(() => {
                      setWorksDropdownOpen(false);
                    }, 150);
                  }}
                  onClick={() => {
                    // si vamos a abrir, medir primero para tener coords correctas
                    if (!worksDropdownOpen) {
                      updateDropdownRect();
                      // for a tiny delay to ensure state updated before painting (optional)
                      setTimeout(() => setWorksDropdownOpen(true), 0);
                    } else {
                      setWorksDropdownOpen(false);
                    }
                  }}
                >
                  Works
                  <span
                    style={{
                      fontSize: '0.59rem',
                      transform: worksDropdownOpen
                        ? 'rotate(180deg)'
                        : 'rotate(0deg)',
                      transition: 'transform 0.3s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    ▼
                  </span>
                </Button>

                {/* Dropdown renderizado en portal */}
                {isMounted &&
                  dropdownRect &&
                  createPortal(
                    <AnimatePresence>
                      {worksDropdownOpen && (
                        <motion.div
                          ref={portalRef}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.18 }}
                          onMouseEnter={() => {
                            if (hoverTimeoutRef.current) {
                              clearTimeout(hoverTimeoutRef.current);
                              hoverTimeoutRef.current = null;
                            }
                            setWorksDropdownOpen(true);
                          }}
                          onMouseLeave={() => {
                            if (hoverTimeoutRef.current) {
                              clearTimeout(hoverTimeoutRef.current);
                            }
                            hoverTimeoutRef.current = setTimeout(() => {
                              setWorksDropdownOpen(false);
                            }, 150);
                          }}
                          style={{
                            position: 'fixed',
                            left: Math.max(8, dropdownRect.left) + 'px',
                            top:
                              dropdownRect.top + dropdownRect.height + 4 + 'px',
                            backgroundColor:
                              mode === 'dark' ? '#1a1a1ae6' : '#f0efefcb',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '12px',
                            minWidth: Math.max(160, dropdownRect.width),
                            zIndex: 100,
                            border:
                              mode === 'dark'
                                ? '1px solid rgba(128, 128, 128, 0.3)'
                                : '1px solid rgba(0, 0, 0, 0.12)',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                            isolation: 'isolate',
                            overflow: 'hidden',
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              isolation: 'isolate',
                            }}
                          >
                            {worksCategoriesItems.map((item, index) => (
                              <Button
                                disableRipple
                                key={item.href}
                                component={NextLink}
                                href={item.href}
                                prefetch
                                variant="text"
                                color="inherit"
                                sx={{
                                  color:
                                    mode === 'dark' ? '#ffffff' : '#000000',
                                  textTransform: 'unset',
                                  justifyContent: 'flex-start',
                                  px: '1.25rem',
                                  py: '0.65rem',
                                  fontSize: '0.9rem',
                                  transition: 'background-color 0.18s ease',
                                  isolation: 'isolate',
                                  mixBlendMode: 'normal',
                                  borderBottom:
                                    index < worksCategoriesItems.length - 1
                                      ? mode === 'dark'
                                        ? '1px solid rgba(128, 128, 128, 0.2)'
                                        : '1px solid rgba(0, 0, 0, 0.06)'
                                      : 'none',
                                  '&:hover': {
                                    backgroundColor:
                                      mode === 'dark'
                                        ? 'rgba(255,255,255,0.1)'
                                        : 'rgba(0,0,0,0.04)',
                                  },
                                }}
                                onClick={() => setWorksDropdownOpen(false)}
                              >
                                {item.label}
                              </Button>
                            ))}
                          </Box>
                        </motion.div>
                      )}
                    </AnimatePresence>,
                    document.body
                  )}
              </Box>

              <Button
                disableRipple
                component={NextLink}
                href="/exhibitions"
                prefetch
                variant="text"
                sx={{
                  textTransform: 'unset',
                  '&:hover': {
                    backgroundColor: 'transparent',
                  },
                }}
                color="inherit"
              >
                <span>Exhibitions</span>
              </Button>

              <Button
                disableRipple
                component={NextLink}
                href="/about-me"
                prefetch
                variant="text"
                sx={{
                  textTransform: 'unset',
                  '&:hover': {
                    backgroundColor: 'transparent',
                  },
                }}
                color="inherit"
              >
                <span>About&nbsp;Me</span>
              </Button>

              <Button
                disableRipple
                component={NextLink}
                href="/contact"
                prefetch
                variant="text"
                sx={{
                  textTransform: 'unset',
                  '&:hover': {
                    backgroundColor: 'transparent',
                  },
                }}
                color="inherit"
              >
                <span>Contact</span>
              </Button>
            </Stack>
          )}
        </Toolbar>
      </motion.div>
    </AppBar>
  );
}
