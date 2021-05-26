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

  },
  variants: {
    extend: {},
  },
  plugins: [
    require("@tailwindcss/typography")
  ],
};
