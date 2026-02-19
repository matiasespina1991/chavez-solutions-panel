import { Box } from '@mui/material';

export function MinimalMenuIcon(props: React.ComponentProps<typeof Box>) {
  return (
    <Box
      {...props}
      sx={{
        width: '3.6rem',
        height: '1.1rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'end',
        ...props.sx,
      }}
    >
      <Box
        sx={{
          width: '100%',
          height: '1px',
          backgroundColor: 'currentColor',
        }}
      />
      <Box
        sx={{
          width: '2rem',
          height: '1px',
          backgroundColor: 'currentColor',
        }}
      />
      <Box
        sx={{
          width: '100%',
          height: '1px',
          backgroundColor: 'currentColor',
        }}
      />
    </Box>
  );
}
