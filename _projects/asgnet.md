---
layout: default
title: ASGNet
description: ASGNet for Few-Shot Segmentation (CVPR 2021)
img: 
importance: 1
category: computer vision
permalink: /asgnet/
---

[comment]: Title
<h2 align="center" class="font-weight-bold"> Adaptive Prototype Learning and Allocation for<br>Few-Shot Segmentation </h2>
<p style="text-align: center;" class="font-weight-normal"> CVPR 2021 </p>

[comment]: Authors
<p style="text-align: center; font-weight: normal">
<a href="http://reagan1311.github.io" style="color: #0069d1"> Gen Li</a><sup>1, 3</sup>&emsp;

<a href="http://varunjampani.github.io" style="color: #0069d1"> Varun Jampani</a><sup>2</sup>&emsp;

<a href="https://laurasevilla.me" style="color: #0069d1"> Laura Sevilla-Lara</a><sup>1</sup>&emsp;
&nbsp;
<a href="https://deqings.github.io/" style="color: #0069d1"> Deqing Sun</a><sup>2</sup>&emsp;
&nbsp;
<a href="https://scholar.google.com/citations?user=pnnDFUYAAAAJ&hl=en" style="color: #0069d1"> Jonghyun Kim</a><sup>3</sup>&emsp;
&nbsp;
<a href="https://dblp.org/pid/24/35.html" style="color: #0069d1"> Joongkyu Kim </a><sup>3</sup>
&nbsp;
</p>
<p style="text-align: center; font-weight: normal"> <sup>1</sup>University of Edinburgh &emsp;   <sup>2</sup>Google Research &emsp;   <sup>3</sup>Sungkyunkwan University</p>

[comment]: Icons
<div class="column has-text-centered">
<div class="publication-links">
     <!-- Arxiv PDF link -->
  <span class="link-block">
    <a href="https://arxiv.org/abs/2104.01893" target="_blank"
    class="external-link button is-normal is-rounded is-dark">
    <span class="icon" style="text-decoration: none">
      <i class="fas fa-file-pdf"></i>
    </span>    
    <span>Paper</span>
  </a>
</span>

<span class="link-block">
<a href="/assets/pdf/ASGNet_supp.pdf" target="_blank"
class="external-link button is-normal is-rounded is-dark">
<span class="icon">
<i class="fas fa-file-pdf"></i>
</span>
<span>Supp</span>
</a>
</span>

<!-- Github link -->
<span class="link-block">
<a href="https://github.com/Reagan1311/ASGNet" target="_blank" 
class="external-link button is-normal is-rounded is-dark">
<span class="icon" style="text-decoration: none">
  <i class="fab fa-github"></i>
</span>
<span>Code</span>
</a>
</span>

<span class="link-block">
<a href="https://www.youtube.com/watch?v=6TVfnLLRSZQ&ab_channel=GenLi" target="_blank" 
class="external-link button is-normal is-rounded is-dark">
<span class="icon" style="text-decoration: none">
  <i class="fas fa-video"></i>
</span>
<span>Video</span>
</a>
</span>

</div>
</div>

[comment]: Abstract
<h3> Abstract </h3>
Prototype learning is extensively used for few-shot segmentation. Typically, a single prototype is obtained from the support feature by averaging the global object information. However, using one prototype to represent all the information may lead to ambiguities. In this paper, we propose two novel modules, named superpixel-guided clustering (SGC) and guided prototype allocation (GPA), for multiple prototype extraction and allocation. Specifically, SGC is a parameter-free and training-free approach, which extracts more representative prototypes by aggregating similar feature vectors, while GPA is able to select matched prototypes to provide more accurate guidance. By integrating the SGC and GPA together, we propose the Adaptive Superpixelguided Network (ASGNet), which is a lightweight model and adapts to object scale and shape variation. In addition, our network can easily generalize to k-shot segmentation with substantial improvement and no additional computational cost. In particular, our evaluations on COCO demonstrate that ASGNet surpasses the state-of-the-art method by 5% in 5-shot segmentation.

<center>
<figure>
    <div id="projectid">
    <img src="/assets/img/publication_preview/ASGNet.png" width="600px">
    </div>
    <figcaption style="font-size: 90%; margin-top: 12px; text-align: left; font-weight: 400">
	Comparison between (a) single prototype learning and (b) proposed adaptive prototype learning and allocation.  We utilize superpixel-guided clustering to generate multiple prototypes and then allocate them pixel-wise to query feature.
    </figcaption>
</figure>
</center>

<hr>
[comment]: Video Summary
<h3> Video Summary </h3>
<center>
<div class="embed-responsive embed-responsive-16by9" style="width: 95%">
<iframe class="embed-responsive-item" src="https://www.youtube.com/embed/6TVfnLLRSZQ" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
</div>
</center>

<hr>
[comment]: Qualitative Results
<h3> Qualitative Results </h3>
<center>
<figure>
    <div id="projectid">
        <img src="/assets/img/asgnet/results.png" width="100%">
    </div>
    <figcaption style="font-size: 90%; margin-top: 12px; text-align: left; font-weight: 400">
	    Qualitative visualization of baseline (single prototype learning) and the proposed ASGNet.
    </figcaption>
</figure>
</center>

<hr>
[comment]: Citation
<h3> Citation </h3>
<pre style="background-color:#f0f0f0; color:black; padding:10px; padding-left:30px; border-radius:6px;">
@inproceedings{li:asgnet:2021,
  title={Adaptive prototype learning and allocation for few-shot segmentation},
  author={Li, Gen and Jampani, Varun and Sevilla-Lara, Laura and Sun, Deqing and Kim, Jonghyun and Kim, Joongkyu},
  booktitle={Proceedings of the IEEE/CVF conference on computer vision and pattern recognition},
  year={2021}
}
</pre>