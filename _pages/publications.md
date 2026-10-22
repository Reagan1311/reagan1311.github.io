---
layout: page
permalink: /publications/
title: publications
description:
nav: false
nav_order: 2
---

<!-- _pages/publications.md -->

<!-- Bibsearch Feature -->

Please refer to <a href="https://scholar.google.com/citations?user=Rfh4mm0AAAAJ" target="_blank" rel="noopener noreferrer">Google Scholar</a> for the full publication list.

{% include bib_search.liquid %}

<link rel="stylesheet" href="{{ '/assets/css/scholar-badge.css' | relative_url | bust_file_cache }}">

<div class="publications">

{% bibliography %}

</div>
