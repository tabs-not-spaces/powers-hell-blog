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
      zIndex: {
        '-1': '-1',
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
};
