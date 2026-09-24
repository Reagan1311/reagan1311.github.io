---
layout: page
title: gallery
permalink: /gallery/
description: Moments from conferences, travels, lab activities, and everyday life.
nav: true
nav_order: 4.5
---

{% assign gallery_items = site.data.gallery.items %}
{% if gallery_items and gallery_items.size > 0 %}

  <div class="activity-gallery">
    <div class="gallery-column-sizer" aria-hidden="true"></div>
    <div class="gallery-gutter-sizer" aria-hidden="true"></div>
    {% for item in gallery_items %}
      <article class="gallery-card">
        <div class="gallery-card-inner">
          <div class="gallery-media">
            {% include figure.liquid
              path=item.image
              alt=item.alt
              title=item.alt
              class="gallery-image"
              loading="lazy"
              sizes="(min-width: 992px) 30vw, (min-width: 576px) 45vw, 95vw"
            %}
          </div>
          <div class="gallery-caption">
            {% if item.date or item.location %}
              <p class="gallery-meta">
                {% if item.date %}<time>{{ item.date }}</time>{% endif %}
                {% if item.date and item.location %}<span aria-hidden="true"> · </span>{% endif %}
                {% if item.location %}<span>{{ item.location }}</span>{% endif %}
              </p>
            {% endif %}
            {% if item.description %}<p class="gallery-description">{{ item.description }}</p>{% endif %}
          </div>
        </div>
      </article>
    {% endfor %}
  </div>
{% else %}
  <p class="gallery-empty">New moments will be added soon.</p>
{% endif %}

<script>
  (() => {
    const initGallery = () => {
      const gallery = document.querySelector(".activity-gallery");
      if (!gallery || gallery.dataset.masonryReady || typeof window.Masonry !== "function") return;

      gallery.dataset.masonryReady = "true";
      gallery.classList.add("is-masonry");

      const masonry = new window.Masonry(gallery, {
        itemSelector: ".gallery-card",
        columnWidth: ".gallery-column-sizer",
        gutter: ".gallery-gutter-sizer",
        horizontalOrder: true,
        percentPosition: true,
      });

      if (typeof window.imagesLoaded === "function") {
        window.imagesLoaded(gallery).on("progress", () => masonry.layout());
      }
    };

    document.addEventListener("DOMContentLoaded", initGallery);
    window.addEventListener("load", initGallery, { once: true });
  })();
</script>

<style>
  .activity-gallery {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: start;
    gap: 1.5rem;
  }

  .activity-gallery.is-masonry {
    display: block;
    position: relative;
  }

  .gallery-column-sizer,
  .activity-gallery.is-masonry .gallery-card {
    width: calc((100% - 3rem) / 3);
  }

  .gallery-column-sizer,
  .gallery-gutter-sizer {
    display: none;
  }

  .activity-gallery.is-masonry .gallery-column-sizer,
  .activity-gallery.is-masonry .gallery-gutter-sizer {
    display: block;
  }

  .gallery-gutter-sizer {
    width: 1.5rem;
  }

  .gallery-card {
    background: transparent;
  }

  .gallery-card-inner {
    overflow: hidden;
    border: 1px solid var(--global-divider-color);
    border-radius: 0.65rem;
    background: var(--global-bg-color);
    box-shadow: 0 0.2rem 0.8rem rgba(0, 0, 0, 0.06);
    transition: transform 180ms ease, box-shadow 180ms ease;
  }

  .activity-gallery.is-masonry .gallery-card {
    margin-bottom: 1.5rem;
  }

  .gallery-card:hover .gallery-card-inner {
    transform: translateY(-0.2rem);
    box-shadow: 0 0.5rem 1.25rem rgba(0, 0, 0, 0.1);
  }

  .gallery-media {
    background: var(--global-code-bg-color);
  }

  .gallery-media figure,
  .gallery-media picture {
    display: block;
    width: 100%;
    margin: 0;
  }

  .gallery-media .gallery-image {
    display: block;
    width: 100%;
    height: auto;
  }

  .gallery-caption {
    padding: 0.9rem 1rem 1rem;
  }

  .gallery-meta {
    margin: 0 0 0.35rem;
    color: var(--global-theme-color);
    font-size: 0.82rem;
    font-weight: 600;
    letter-spacing: 0.01em;
  }

  .gallery-description {
    margin: 0;
    font-size: 0.82rem;
    line-height: 1.55;
  }

  .gallery-empty {
    padding: 2rem;
    border: 1px dashed var(--global-divider-color);
    border-radius: 0.65rem;
    color: var(--global-text-color-light);
    text-align: center;
  }

  @media (max-width: 991px) {
    .activity-gallery {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .gallery-column-sizer,
    .activity-gallery.is-masonry .gallery-card {
      width: calc((100% - 1.5rem) / 2);
    }
  }

  @media (max-width: 575px) {
    .activity-gallery {
      grid-template-columns: 1fr;
      gap: 1.1rem;
    }

    .gallery-column-sizer,
    .activity-gallery.is-masonry .gallery-card {
      width: 100%;
    }

    .gallery-gutter-sizer {
      width: 0;
    }

    .activity-gallery.is-masonry .gallery-card {
      margin-bottom: 1.1rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .gallery-card-inner {
      transition: none;
    }

    .gallery-card:hover .gallery-card-inner {
      transform: none;
    }
  }
</style>
