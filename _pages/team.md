---
layout: page
title: team
permalink: /team/
description: Meet our current members and alumni.
nav: true
nav_order: 3
---

{% assign lab_photos = site.data.team.lab_photos %}
{% if lab_photos and lab_photos.size > 0 %}

  <div class="team-lab-photos" aria-label="Lab photos">
    {% for photo in lab_photos %}
      <div class="team-lab-photo">
        {% include figure.liquid
          path=photo.image
          alt=photo.alt
          class="team-lab-image"
          loading="lazy"
          sizes="(min-width: 992px) 30vw, (min-width: 576px) 45vw, 95vw"
        %}
        {% if photo.caption %}<p class="team-lab-caption">{{ photo.caption }}</p>{% endif %}
      </div>
    {% endfor %}
  </div>
{% endif %}

{% assign team_groups = site.data.team.groups %}
{% assign team_member_count = 0 %}

{% if team_groups %}

  <div class="team-directory">
    {% for group in team_groups %}
      {% if group.members and group.members.size > 0 %}
        {% assign team_member_count = team_member_count | plus: group.members.size %}
        <section class="team-group" aria-labelledby="team-{{ group.id }}">
          <h2 id="team-{{ group.id }}" class="team-group-title">{{ group.title }}</h2>
          <ul class="team-member-list">
            {% for member in group.members %}
              {% assign member_name = member.name | default: member %}
              <li>
                {% if member.website %}
                  <a href="{{ member.website }}" target="_blank" rel="noopener noreferrer">{{ member_name }}</a>
                {% elsif member.email %}
                  <a href="mailto:{{ member.email }}">{{ member_name }}</a>
                {% else %}
                  <span class="team-member-name">{{ member_name }}</span>
                {% endif %}
                {%- if member.description -%}, {{ member.description }}{%- endif -%}
                {%- if member.co_advisor -%}
                  , Co-advising with
                  {% if member.co_advisor.website %}
                    <a href="{{ member.co_advisor.website }}" target="_blank" rel="noopener noreferrer">{{ member.co_advisor.name }}</a>
                  {% else %}
                    {{ member.co_advisor.name }}
                  {% endif %}
                {%- endif -%}
                {%- if member.description or member.co_advisor -%}.{%- endif -%}
              </li>
            {% endfor %}
          </ul>
        </section>
      {% endif %}
    {% endfor %}
  </div>
{% endif %}

{% if team_member_count == 0 %}

  <p class="team-empty">Team information will be added soon.</p>
{% endif %}

<style>
  .team-lab-photos {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: start;
    gap: 1rem;
    margin-bottom: 2.75rem;
  }

  .team-lab-photo,
  .team-lab-photo > figure,
  .team-lab-photo picture {
    display: block;
    width: 100%;
    margin: 0;
  }

  .team-lab-photo {
    overflow: hidden;
    border: 1px solid var(--global-divider-color);
    border-radius: 0.55rem;
    background: var(--global-bg-color);
  }

  .team-lab-image {
    display: block;
    width: 100%;
    height: auto;
  }

  .team-lab-caption {
    margin: 0;
    padding: 0.55rem 0.7rem;
    color: var(--global-text-color-light);
    font-size: 0.78rem;
    line-height: 1.4;
  }

  .team-group + .team-group {
    margin-top: 2.6rem;
  }

  .team-group-title {
    margin: 0 0 1rem;
    font-size: 1.55rem;
    font-weight: 700;
  }

  .team-member-list {
    margin: 0;
    padding-left: 2rem;
  }

  .team-member-list li {
    margin: 0.28rem 0;
    padding-left: 0.15rem;
    font-size: 1rem;
    line-height: 1.65;
  }

  .team-member-list a,
  .team-member-name {
    font-weight: 500;
  }

  .team-empty {
    padding: 2rem;
    border: 1px dashed var(--global-divider-color);
    border-radius: 0.65rem;
    color: var(--global-text-color-light);
    text-align: center;
  }

  @media (max-width: 767px) {
    .team-lab-photos {
      grid-template-columns: 1fr;
    }

    .team-member-list {
      padding-left: 1.5rem;
    }
  }
</style>
