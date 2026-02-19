import { Box } from '@mui/material';

export function MinimalRightArrowIcon(props: React.ComponentProps<typeof Box>) {
  return (
    <Box
      {...props}
      sx={{
        width: '1.2rem',
        height: '1.2rem',
        position: 'relative',
        ...props.sx,
      }}
    >
      {/* Upper stroke */}
      <Box
        sx={{
          position: 'absolute',
          right: '50%',
          width: '1px',
          height: '100%',
          top: '7.8px',
          backgroundColor: 'white',
          transform: 'translateX(50%) rotate(30deg)',
        }}
      />

      {/* Lower stroke */}
      <Box
        sx={{
          position: 'absolute',
          bottom: '0',
          right: '50%',
          width: '1px',
          top: '-7.8px',
          height: '100%',
          backgroundColor: 'white',
          transform: 'translateX(50%) rotate(-30deg)',
        }}
      />
    </Box>
  );
}
