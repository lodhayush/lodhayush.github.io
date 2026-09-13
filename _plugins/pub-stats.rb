# Counts bibliography entries per year and exposes them as site.data.pub_stats,
# which drives the "Publication Timeline" chart on the About page. Computed on
# every build, so the chart stays in sync with _bibliography/papers.bib.
module Jekyll
  class PubStatsGenerator < Generator
    safe true
    priority :highest

    def generate(site)
      scholar = site.config['scholar'] || {}
      dir = (scholar['source'] || '_bibliography').to_s.sub(%r{\A/}, '')
      path = File.join(site.source, dir, (scholar['bibliography'] || 'papers.bib').to_s)
      return unless File.exist?(path)

      counts = Hash.new(0)
      File.read(path, encoding: 'UTF-8').scan(/^\s*year\s*=\s*[{"]?\s*(\d{4})/i).each do |match|
        counts[match[0].to_i] += 1
      end

      site.data['pub_stats'] = {
        'years' => counts.sort.map { |year, count| { 'year' => year, 'count' => count } },
        'total' => counts.values.sum
      }
    end
  end
end
