---
layout: default
title: OOAL
description: One-Shot Open Affordance Learning with Foundation Models (CVPR 2024)
img:
importance: 1
category: computer vision
permalink: /ooal/
---

[comment]: Title
<h2 align="center" class="font-weight-bold"> One-Shot Open Affordance Learning <br>with Foundation Models </h2>
<p style="text-align: center;" class="font-weight-normal"> CVPR 2024 </p>

[comment]: Authors
<p style="text-align: center; font-weight: normal">
<a href="http://reagan1311.github.io" style="color: #0069d1"> Gen Li</a><sup>1</sup>&emsp;

<a href="https://deqings.github.io/" style="color: #0069d1"> Deqing Sun</a><sup>2</sup>&emsp;

<a href="https://laurasevilla.me" style="color: #0069d1"> Laura Sevilla-Lara</a><sup>1</sup>&emsp;

<a href="http://varunjampani.github.io" style="color: #0069d1"> Varun Jampani</a><sup>3</sup>&emsp;

</p>
<p style="text-align: center; font-weight: normal"> <sup>1</sup>University of Edinburgh &emsp;   <sup>2</sup>Google Research &emsp; <sup>3</sup>Stability AI &emsp;  </p>

[comment]: Icons
<div class="column has-text-centered">
    <div class="publication-links">
 <!-- Arxiv PDF link -->
      <span class="link-block">
        <a href="https://openaccess.thecvf.com/content/CVPR2024/papers/Li_One-Shot_Open_Affordance_Learning_with_Foundation_Models_CVPR_2024_paper.pdf" target="_blank"
        class="external-link button is-normal is-rounded is-dark">
        <span class="icon">
          <i class="fas fa-file-pdf"></i>
        </span>
        <span>Paper</span>
        </a>
     </span>

<!-- Supplementary PDF link -->
  <span class="link-block">
  <a href="/assets/pdf/OOAL_supp.pdf" target="_blank"
  class="external-link button is-normal is-rounded is-dark">
  <span class="icon">
    <i class="fas fa-file-pdf"></i>
  </span>
  <span>Supp</span>
  </a>
  </span>

<!-- Video Link -->
<span class="link-block">
<a href="https://www.youtube.com/watch?v=PqBYFl3gmyY" target="_blank" class="external-link button is-normal is-rounded is-dark">
<span class="icon" style="text-decoration: none">
  <i class="fas fa-video"></i>
</span>
<span>Video</span>
</a>
</span>

<!-- Github link -->
  <span class="link-block">
    <a href="https://github.com/Reagan1311/OOAL" target="_blank"
    class="external-link button is-normal is-rounded is-dark">
    <span class="icon">
      <i class="fab fa-github"></i>
    </span>
    <span>Code</span>
  </a>
</span>

</div>
</div>



[comment]: Abstract
<h3> Abstract </h3>
We introduce One-shot Open Affordance Learning (OOAL), where a model is trained with just one example per base object category, but is expected to identify novel objects and affordances. While vision-language models excel at recognizing novel objects and scenes, they often struggle to understand finer levels of granularity such as affordances. To handle this issue, we conduct a comprehensive analysis of existing foundation models, to explore their inherent understanding of affordances and assess the potential for data-limited affordance learning. We then propose a vision-language framework with simple and effective designs that boost the alignment between visual features and affordance text embeddings. Experiments on two affordance segmentation benchmarks show that the proposed method outperforms state-of-the-art models with less than 1% of the full training data, and exhibits reasonable generalization capability on unseen objects and affordances. 

<center>
<figure>
    <div id="projectid">
       <img src="/assets/img/ooal/teaser.jpg" width="70%">
    </div>
    <figcaption style="font-size: 90%; margin-top: 12px; text-align: left; font-weight: 400">
         The pipeline of one-shot open affordance learning. It uses one image per base object for training, and can perform zeroshot inference on novel objects and affordances.
    </figcaption>
</figure>
</center>

<hr>
<h3> Framework </h3>
<center>
<figure>
    <div id="projectid">
       <img src="/assets/img/ooal/framework.jpg" width="100%">
    </div>
<figcaption style="font-size: 90%; margin-top: 12px; text-align: left; font-weight: 400">
		Proposed learning framework for OOAL. Our designs are highlighted in three color blocks, which are text prompt learning,
multi-layer feature fusion, and CLS-guided transformer decoder. [CLS] denotes the CLS token of the vision encoder.
    </figcaption>
</figure>
</center>

<hr>
[comment]: Video Summary
<h3> Video Summary </h3>
<center>
<div class="embed-responsive embed-responsive-16by9" style="width: 95%">
<iframe class="embed-responsive-item" src="https://www.youtube.com/embed/PqBYFl3gmyY" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
</div>
</center>

<hr>
[comment]: Citation
<h3> Citation </h3>
<pre style="background-color:#f0f0f0; color:black; padding:10px; padding-left:30px; border-radius:6px;">
@inproceedings{li:ooal:2024,
  title = {One-Shot Open Affordance Learning with Foundation Models},
  author = {Li, Gen and Sun, Deqing and Sevilla-Lara, Laura and Jampani, Varun},
  booktitle={Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition},
  year={2024}
}
</pre>
