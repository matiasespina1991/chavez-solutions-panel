'use client';

import { Box, Stack, Typography } from '@mui/material';
import styles from '../page.module.css';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useContext, useEffect, useState } from 'react';
import { getContactData } from '@/utils/functions/getContactData';
import { ContactData } from '@/utils/types/types';
import { ThemeContext } from '../ThemeRegistry';
import Footer from '../components/Footer';

export default function Contact() {
  const { mode } = useContext(ThemeContext);
  const [contactData, setContactData] = useState<ContactData>({
    items: [],
  });

  const fetchContactData = async () => {
    const data: ContactData | null = await getContactData();

    if (data) {
      setContactData(data);
    }
  };

  useEffect(() => {
    fetchContactData();
  }, []);

  return (
    <>
      <main className={`${styles.main} ${styles.contactPage}`}>
        <Box
          px={{ xs: '1.1rem', sm: '2rem' }}
          py={{ xs: '1.7rem', sm: '2rem' }}
          width="100%"
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
          <Box className={styles.contact_page_container} width="100%">
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
                    CONTACT
                  </Typography>
                  <Box height={10}></Box>
                  {contactData.items.map((item) => {
                    const isMail = item.url.startsWith('mailto:');
                    const isHttp = item.url.startsWith('http');
                    return (
                      <div key={item.id}>
                        <Link
                          href={item.url}
                          target={isHttp ? '_blank' : undefined}
                          rel={isHttp ? 'noopener noreferrer' : undefined}
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
                              alt={item.label}
                              style={{
                                width: '0.72em',
                                height: '0.72em',
                                marginRight: '0.3em',
                                filter: mode === 'dark' ? 'invert(1)' : 'none',
                              }}
                            />
                            {item.label}
                          </Typography>
                        </Link>
                        <Box height={10}></Box>
                      </div>
                    );
                  })}
                </Stack>
              </motion.div>
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
