require "nokogiri"

module SiteSelectedPublications
  # Prepare only the homepage bibliography; full publication lists are unaffected.
  def selected_publications_initial_state(html, paper_tags)
    fragment = Nokogiri::HTML.fragment(html)
    paper_tags ||= {}
    visible_count = 0

    fragment.css(".bibliography > li").each do |item|
      entry = item.at_css(".row > [id]")
      paper = entry ? paper_tags.fetch(entry["id"], {}) : {}
      tags = paper.is_a?(Array) ? paper : paper.fetch("tags", [])
      featured = !paper.is_a?(Hash) || paper["show_in_all"] != false

      item["data-publication-tags"] = tags.join(" ")
      item["data-show-in-all"] = featured.to_s
      if featured
        visible_count += 1
      else
        item["hidden"] = "hidden"
      end
    end

    { "html" => fragment.to_html, "visible_count" => visible_count }
  end
end

Liquid::Template.register_filter(SiteSelectedPublications)
