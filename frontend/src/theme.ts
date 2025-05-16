import { extendTheme, type ThemeConfig } from '@chakra-ui/react'

const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
}

const colors = {
  theme: {
    bg: '#1a1b26',
    bgDarker: '#16161e',
    bgLighter: '#1f2335',
    fg: '#a9b1d6',
    accent: '#7aa2f7',
    accentDarker: '#5d7ab8',
    red: '#f7768e',
    green: '#9ece6a',
    yellow: '#e0af68',
    blue: '#7aa2f7',
    magenta: '#bb9af7',
    cyan: '#7dcfff',
    gray: '#565f89',
  },
}

const styles = {
  global: {
    body: {
      bg: 'theme.bg',
      color: 'theme.fg',
    },
  },
}

const components = {
  Button: {
    variants: {
      solid: {
        bg: 'theme.accent',
        color: 'white',
        _hover: {
          bg: 'theme.accentDarker',
        },
      },
      outline: {
        borderColor: 'theme.accent',
        color: 'theme.accent',
        _hover: {
          bg: 'theme.bgLighter',
        },
      },
    },
  },
  Card: {
    baseStyle: {
      container: {
        bg: 'theme.bgLighter',
        borderRadius: 'lg',
      },
    },
  },
  Input: {
    variants: {
      outline: {
        field: {
          borderColor: 'theme.gray',
          _hover: {
            borderColor: 'theme.accent',
          },
          _focus: {
            borderColor: 'theme.accent',
            boxShadow: '0 0 0 1px var(--chakra-colors-theme-accent)',
          },
        },
      },
    },
  },
  Heading: {
    baseStyle: {
      color: 'theme.fg',
    },
  },
}

const theme = extendTheme({ config, colors, styles, components })

export default theme 