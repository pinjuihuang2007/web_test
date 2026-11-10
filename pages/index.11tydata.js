module.exports = {
  eleventyComputed: {
    localeMeta: (data) => data.pageLocale,

    t: (data) => {
      return data.i18n[data.pageLocale.code] || {};
    }
  }
};
