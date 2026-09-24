---
layout: page
title: Visitors
description: Visitor countries, referring websites and device types.
permalink: /visitors.html
lang: en
nav: false
visitors_details: true
---

{% if site.visitors.enabled or site.visitors.preview %}
{% include visitors.liquid %}
{% else %}

  <p>Visitor statistics are currently unavailable.</p>
{% endif %}
