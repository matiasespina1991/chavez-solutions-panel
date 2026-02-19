'use client';
import React, { useState } from 'react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemText from '@mui/material/ListItemText';
import ListItemButton from '@mui/material/ListItemButton';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import NextLink from 'next/link';
import { MinimalCloseIcon } from './MinimalCloseIcon';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  worksCategoriesItems: Array<{ label: string; href: string }>;
}

const isDevBranch =
  process.env.NEXT_PUBLIC_DEPLOY_ENV === 'dev' ||
  process.env.NODE_ENV === 'development';

export default function MobileDrawer({
  open,
  onClose,
  worksCategoriesItems,
}: MobileDrawerProps) {
  const [worksDrawerExpanded, setWorksDrawerExpanded] = useState(false);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleClose = () => {
    setWorksDrawerExpanded(false);
    onClose();
  };

  if (!isMounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={handleClose}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1200,
            }}
          />
          {/* Drawer content */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 1300,
              maxHeight: '100vh',
              overflowY: 'auto',
            }}
          >
            <Box
              sx={{
                width: '100vw',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
                minHeight: '100vh',
              }}
              role="presentation"
            >
              <List sx={{ pl: '1.2rem' }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    paddingTop: '0.8rem',
                    paddingRight: '1rem',
                  }}
                >
                  <IconButton
                    aria-label="close menu"
                    onClick={handleClose}
                    sx={{ color: 'var(--foreground)' }}
                  >
                    <MinimalCloseIcon />
                  </IconButton>
                </Box>

                <Box sx={{ height: '2.8rem' }} />

                {/* Home */}
                <motion.div
                  initial={{ opacity: 0, y: -5, filter: 'blur(3px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.4, delay: 0, ease: 'easeOut' }}
                >
                  <ListItemButton
                    component={NextLink}
                    href="/"
                    prefetch
                    onClick={handleClose}
                  >
                    <ListItemText
                      primary={
                        <Typography
                          variant="h3"
                          fontWeight="500"
                          fontFamily="Helvetica Neue, sans-serif"
                          fontSize={{
                            xs: '36px',
                            sm: '50px',
                            md: '82px',
                            lg: '82px',
                            xl: '82px',
                          }}
                          pt={{ xs: '0.5rem', sm: '3rem' }}
                          letterSpacing="-0.04em"
                          component="div"
                          sx={{ flexGrow: 1 }}
                        >
                          Home
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </motion.div>

                {/* Works - EXPANDIBLE */}

                <>
                  <Box sx={{ height: '1rem' }} />
                  <motion.div
                    initial={{ opacity: 0, y: -5, filter: 'blur(3px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{
                      duration: 0.4,
                      delay: 0.1,
                      ease: 'easeOut',
                    }}
                  >
                    <ListItemButton
                      onClick={(e) => {
                        e.preventDefault();
                        setWorksDrawerExpanded(!worksDrawerExpanded);
                      }}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography
                            variant="h3"
                            fontWeight="500"
                            fontFamily="Helvetica Neue, sans-serif"
                            fontSize={{
                              xs: '36px',
                              sm: '50px',
                              md: '82px',
                              lg: '82px',
                              xl: '82px',
                            }}
                            pt={{ xs: '0.5rem', sm: '3rem' }}
                            letterSpacing="-0.04em"
                            component="div"
                            noWrap
                            sx={{
                              flexGrow: 0,
                              display: 'inline-flex',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Works
                          </Typography>
                        }
                      />
                    </ListItemButton>
                  </motion.div>

                  {/* Submenu expandible */}
                  <AnimatePresence>
                    {worksDrawerExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                      >
                        <Box
                          sx={{
                            pl: '2rem',
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                        >
                          {worksCategoriesItems.map((item) => (
                            <ListItemButton
                              key={item.href}
                              component={NextLink}
                              href={item.href}
                              prefetch
                              onClick={handleClose}
                            >
                              <ListItemText
                                primary={
                                  <Typography
                                    variant="h4"
                                    fontWeight="400"
                                    fontFamily="Helvetica Neue, sans-serif"
                                    fontSize={{
                                      xs: '24px',
                                      sm: '32px',
                                      md: '48px',
                                      lg: '48px',
                                      xl: '48px',
                                    }}
                                    letterSpacing="-0.04em"
                                    component="div"
                                    sx={{ opacity: 0.8 }}
                                  >
                                    {item.label}
                                  </Typography>
                                }
                              />
                            </ListItemButton>
                          ))}
                        </Box>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>

                <Box sx={{ height: '1rem' }} />

                {/* Exhibitions */}
                <motion.div
                  initial={{ opacity: 0, y: -5, filter: 'blur(3px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
                >
                  <ListItemButton
                    component={NextLink}
                    href="/exhibitions"
                    prefetch
                    onClick={handleClose}
                  >
                    <ListItemText
                      primary={
                        <Typography
                          variant="h3"
                          fontWeight="500"
                          fontFamily="Helvetica Neue, sans-serif"
                          fontSize={{
                            xs: '36px',
                            sm: '50px',
                            md: '82px',
                            lg: '82px',
                            xl: '82px',
                          }}
                          pt={{ xs: '0.5rem', sm: '3rem' }}
                          letterSpacing="-0.04em"
                          component="div"
                          noWrap
                          sx={{
                            flexGrow: 0,
                            display: 'inline-flex',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Exhibitions
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </motion.div>

                <Box sx={{ height: '1rem' }} />

                {/* About Me */}
                <motion.div
                  initial={{ opacity: 0, y: -5, filter: 'blur(3px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
                >
                  <ListItemButton
                    component={NextLink}
                    href="/about-me"
                    prefetch
                    onClick={handleClose}
                  >
                    <ListItemText
                      primary={
                        <Typography
                          variant="h3"
                          fontWeight="500"
                          fontFamily="Helvetica Neue, sans-serif"
                          fontSize={{
                            xs: '36px',
                            sm: '50px',
                            md: '82px',
                            lg: '82px',
                            xl: '82px',
                          }}
                          pt={{ xs: '0.5rem', sm: '3rem' }}
                          letterSpacing="-0.04em"
                          component="div"
                          noWrap
                          sx={{
                            flexGrow: 0,
                            display: 'inline-flex',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          About&nbsp;Me
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </motion.div>

                <Box sx={{ height: '1rem' }} />

                {/* Contact */}
                <motion.div
                  initial={{ opacity: 0, y: -5, filter: 'blur(3px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.4, delay: 0.3, ease: 'easeOut' }}
                >
                  <ListItemButton
                    component={NextLink}
                    href="/contact"
                    prefetch
                    onClick={handleClose}
                  >
                    <ListItemText
                      primary={
                        <Typography
                          variant="h3"
                          fontWeight="500"
                          fontFamily="Helvetica Neue, sans-serif"
                          fontSize={{
                            xs: '36px',
                            sm: '50px',
                            md: '82px',
                            lg: '82px',
                            xl: '82px',
                          }}
                          pt={{ xs: '0.5rem', sm: '3rem' }}
                          letterSpacing="-0.04em"
                          component="div"
                          sx={{ flexGrow: 1 }}
                        >
                          Contact
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </motion.div>

                <Box sx={{ height: '1rem' }} />
              </List>
            </Box>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
