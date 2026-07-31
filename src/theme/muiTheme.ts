import { createTheme } from '@mui/material/styles';

export type MuiThemeMode = 'light' | 'dark';

export function createMuiTheme(mode: MuiThemeMode = 'dark') {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? '#D97743' : '#A84F24',
        light: isDark ? '#E49A70' : '#D97743',
        dark: '#843B1B',
        contrastText: isDark ? '#18191A' : '#F3F2EE',
      },
      secondary: {
        main: isDark ? '#A3A39B' : '#6E6D68',
        contrastText: isDark ? '#18191A' : '#F3F2EE',
      },
      success: {
        main: '#7A8F51',
        contrastText: '#18191A',
      },
      warning: {
        main: '#B7791F',
        contrastText: '#18191A',
      },
      error: {
        main: '#B45E52',
        contrastText: isDark ? '#F0F0F0' : '#1C1C1A',
      },
      background: {
        default: isDark ? '#18191A' : '#F3F2EE',
        paper: isDark ? '#222325' : '#EBE9E4',
      },
      text: {
        primary: isDark ? '#F0F0F0' : '#1C1C1A',
        secondary: isDark ? '#A3A39B' : '#6E6D68',
        disabled: isDark ? '#6F706D' : '#96938C',
      },
      divider: isDark ? '#3A3A38' : '#D1D0CA',
    },
    typography: {
      fontFamily: '"Work Sans", Arial, sans-serif',
      fontSize: 14,
      button: {
        fontFamily: '"JetBrains Mono", monospace',
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      },
      h1: {
        fontFamily: '"Staatliches", Impact, sans-serif',
        fontWeight: 400,
        letterSpacing: '0.01em',
      },
      h2: {
        fontFamily: '"Staatliches", Impact, sans-serif',
        fontWeight: 400,
        letterSpacing: '0.01em',
      },
    },
    shape: {
      borderRadius: 2,
    },
  });
}

const muiTheme = createMuiTheme('dark');

export default muiTheme;
