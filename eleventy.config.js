module.exports = function(eleventyConfig) {
  // 複製靜態資源與資料夾
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("_data");
   eleventyConfig.addPassthroughCopy("admin");
  return {
    dir: {
      input: ".",
      includes: "_includes",
      data: "_data",
      output: "_site"
    },
    pathPrefix: "/web_test/", // 關鍵：對應你的 GitHub Repository 名稱
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
