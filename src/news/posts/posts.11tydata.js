// Shared front matter for every post, so each file only carries its own
// title, date, summary and categories.
export default {
  layout: "post.njk",
  tags: "post",
  permalink: (data) => `/news/${data.page.fileSlug}/`,
  eleventyComputed: {
    // The snippet does double duty as the meta description.
    description: (data) => data.summary,
    ogType: () => "article",
  },
};
