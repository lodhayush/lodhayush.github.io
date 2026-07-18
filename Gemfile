source 'https://rubygems.org'

gem 'jekyll'

# Pin sass-embedded below 1.100.0: that release's native build requires
# JSON::Fragment (json gem >= 2.9.0), which Ruby 3.1.6 (used in CI) does not
# ship, breaking `bundle install`. 1.99.x builds cleanly.
gem 'sass-embedded', '~> 1.99.0'

# Core plugins that directly affect site building
group :jekyll_plugins do
  gem 'jekyll-archives'
  gem 'jekyll-email-protect'
  gem 'jekyll-feed'
  gem 'jekyll-get-json'
  gem 'jekyll-imagemagick'
  gem 'jekyll-jupyter-notebook'
  gem 'jekyll-link-attributes'
  gem 'jekyll-minifier'
  gem 'jekyll-paginate-v2'
  gem 'jekyll-scholar'
  gem 'jekyll-sitemap'
  gem 'jekyll-socials' 
  gem 'jekyll-tabs'
  gem 'jekyll-terser', git: 'https://github.com/RobertoJBeltran/jekyll-terser.git'
  gem 'jekyll-toc'
  gem 'jekyll-twitter-plugin'
  gem 'jemoji'
  gem 'classifier-reborn'
end

# Gems for development or external data fetching
group :other_plugins do
  gem 'css_parser'
  gem 'feedjira'
  gem 'httparty'
  gem 'observer'
  gem 'ostruct'
end
