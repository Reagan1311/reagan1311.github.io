---
layout: page
title: recruiting
permalink: /recruiting/
description: Information for prospective students and research interns.
nav: true
nav_order: 4
---

<div class="recruiting-page">
  <section class="recruiting-intro">
    <p class="recruiting-kicker">Open Positions</p>
    <h2>招生与实习机会</h2>
    <p>欢迎对具身智能、机器人学习及多模态人工智能感兴趣的同学！</p>
  </section>

  <div class="recruiting-tracks">
    <section class="recruiting-track" aria-labelledby="recommended-admission">
      <h2 id="recommended-admission">保研 <span>直博 / 硕士</span></h2>
      <h3>要求</h3>
      <ul>
        <li>来信请注明对直博/学硕的接受程度，例如：“直博 &gt; 学硕”，或“仅接受直博/学硕”等。</li>
      </ul>
    </section>

    <section class="recruiting-track" aria-labelledby="regular-phd">
      <h2 id="regular-phd">普博</h2>
      <h3>要求</h3>
      <ul>
        <li>有科研项目经验/论文发表优先。</li>
      </ul>
    </section>

    <section class="recruiting-track" aria-labelledby="research-interns">
      <h2 id="research-interns">本研 / 实习生</h2>
      <p>本科、硕士、博士在读生或 Gap 期同学均可，支持线上或线下参与。</p>
      <h3>要求</h3>
      <ul>
        <li>主要面向长沙或周边高校</li>
        <li>代码能力好，学习能力强。</li>
        <li>参与时间为<strong> 6 个月以上</strong>，并确保实习期间有充足时间，没有其他同时进行的项目。</li>
        <li>如果是已有导师的硕士或博士在读生，请先征得导师同意后再发送邮件。</li>
      </ul>
    </section>

  </div>

  <section class="recruiting-notice" aria-labelledby="application-notes">
    <h2 id="application-notes">注意事项！</h2>
    <ol>
      <li>
        <strong>邮件标题：</strong><code>202X-保研/普博/实习申请-学校-姓名</code><br>
      </li>
      <li>
        主要招生具身智能方向的学生，请先了解实验室研究方向和近期论文
      </li>
      <li>
        <strong>请发送至 Gmail 邮箱：</strong>
        <span class="recruiting-email">ligen [AT] g.skku.edu</span>
      </li>
      <li>无法及时逐一回复邮件，如未收到回复，敬请谅解。</li>
    </ol>
  </section>
</div>

<style>
  .recruiting-page {
    --recruiting-soft-bg: color-mix(in srgb, var(--global-theme-color) 8%, var(--global-bg-color));
  }

  .recruiting-intro {
    margin-bottom: 2rem;
    padding: 1.5rem 1.65rem;
    border-left: 4px solid var(--global-theme-color);
    border-radius: 0.35rem 0.7rem 0.7rem 0.35rem;
    background: var(--recruiting-soft-bg);
  }

  .recruiting-kicker {
    margin: 0 0 0.25rem;
    color: var(--global-theme-color);
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .recruiting-intro h2 {
    margin: 0 0 0.75rem;
    font-size: 1.8rem;
    font-weight: 750;
  }

  .recruiting-intro p:last-child,
  .recruiting-track p:last-child {
    margin-bottom: 0;
  }

  .recruiting-page p,
  .recruiting-page li {
    line-height: 1.7;
  }

  .recruiting-tracks {
    display: grid;
    gap: 1.15rem;
  }

  .recruiting-track {
    padding: 1.25rem 1.4rem;
    border: 1px solid var(--global-divider-color);
    border-radius: 0.65rem;
    background: var(--global-bg-color);
    box-shadow: 0 0.15rem 0.65rem rgba(0, 0, 0, 0.05);
  }

  .recruiting-track > h2 {
    margin: 0 0 0.6rem;
    color: var(--global-theme-color);
    font-size: 1.35rem;
    font-weight: 700;
  }

  .recruiting-track > h2 span {
    color: var(--global-text-color-light);
    font-size: 0.9rem;
    font-weight: 500;
  }

  .recruiting-track h3 {
    margin: 1rem 0 0.35rem;
    font-size: 1rem;
    font-weight: 700;
  }

  .recruiting-track ul {
    margin: 0;
    padding-left: 1.4rem;
  }

  .recruiting-track li + li {
    margin-top: 0.3rem;
  }

  .recruiting-notice {
    margin-top: 2rem;
    padding: 1.4rem 1.5rem;
    border: 1px solid color-mix(in srgb, var(--global-theme-color) 35%, var(--global-divider-color));
    border-radius: 0.65rem;
    background: var(--recruiting-soft-bg);
  }

  .recruiting-notice h2 {
    margin: 0 0 0.9rem;
    font-size: 1.4rem;
    font-weight: 750;
  }

  .recruiting-notice ol {
    margin: 0;
    padding-left: 1.4rem;
  }

  .recruiting-notice li + li {
    margin-top: 0.75rem;
  }

  .recruiting-notice code,
  .recruiting-email {
    overflow-wrap: anywhere;
    font-family: var(--global-font-family-monospace);
    font-size: 0.9em;
  }

  .recruiting-email {
    color: var(--global-theme-color);
    font-weight: 700;
  }

  @media (max-width: 575px) {
    .recruiting-intro,
    .recruiting-track,
    .recruiting-notice {
      padding: 1.15rem;
    }

    .recruiting-track > h2 span {
      display: block;
      margin-top: 0.2rem;
    }
  }
</style>
