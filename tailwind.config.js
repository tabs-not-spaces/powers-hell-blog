module.exports = {
  corePlugins: {
    preflight: true,
    listStyleType: false,
  },
  purge: [
    './**/*.html',
    './**/*.md',
    './_assets/**/*.js',
  ],
  darkMode: 'class', // or 'class' or false
  theme: {
    extend: {
      margin: {
        '-104': '-26rem',
        '-112': '-28rem',
        '-120': '-30rem',
      },
      screens: {
        '3xl': '1600px',
        '4xl': '1920px'
      }
    }

  },
  variants: {
    extend: {},
  },
  plugins: [
    require("@tailwindcss/typography")
  ],
};
