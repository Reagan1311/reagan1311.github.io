---
layout: publication
permalink: /publications/
title: publications
description: publications
years: [2025, 2024, 2023, 2021, 2020, 2019]
nav: true
nav_order: 1
---
<!-- _pages/publications.md -->

<p>An up-to-date list is available on <a href="https://scholar.google.com/citations?user=Rfh4mm0AAAAJ&hl" target="_blank" rel="noopener noreferrer">Google Scholar</a>.</p>

<div class="publications">

{%- for y in page.years %}
  <h2 class="year">{{y}}</h2>
  {% bibliography -f papers -q @*[year={{y}}]* %}
{% endfor %}

</div>
