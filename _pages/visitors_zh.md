---
layout: page
title: 访客统计
description: 查看访客的国家、来源网站与设备类型，以及累计访问次数。
permalink: /zh/visitors.html
lang: zh-CN
nav: false
visitors_details: true
---

{% if site.visitors.enabled or site.visitors.preview %}
{% include visitors.liquid %}
{% else %}

  <p>访客统计暂不可用。</p>
{% endif %}
