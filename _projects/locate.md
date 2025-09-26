---
layout: default
title: LOCATE
description: LOCATE for Weakly Supervised Affordance Grounding (CVPR 2023)
img:
importance: 1
category: computer vision
permalink: /locate/
---

[comment]: Title
<h2 align="center" class="font-weight-bold"> LOCATE: Localize and Transfer Object Parts for Weakly Supervised Affordance Grounding </h2>
<p style="text-align: center;" class="font-weight-normal"> CVPR 2023 </p>

[comment]: Authors
<p style="text-align: center; font-weight: normal">
<a href="http://reagan1311.github.io" style="color: #0069d1"> Gen Li</a><sup>1</sup>&emsp;

<a href="http://varunjampani.github.io" style="color: #0069d1"> Varun Jampani</a><sup>2</sup>&emsp;

<a href="https://deqings.github.io/" style="color: #0069d1"> Deqing Sun</a><sup>2</sup>&emsp;

<a href="https://laurasevilla.me" style="color: #0069d1"> Laura Sevilla-Lara</a><sup>1</sup>&emsp;

</p>
<p style="text-align: center; font-weight: normal"> <sup>1</sup>University of Edinburgh &emsp;   <sup>2</sup>Google Research &emsp;  </p>

[comment]: Icons
<div class="column has-text-centered">
    <div class="publication-links">
 <!-- Arxiv PDF link -->
      <span class="link-block">
        <a href="https://arxiv.org/abs/2303.09665" target="_blank"
        class="external-link button is-normal is-rounded is-dark">
        <span class="icon">
          <i class="fas fa-file-pdf"></i>
        </span>
        <span>Paper</span>
        </a>
     </span>

<!-- Supplementary PDF link -->
  <span class="link-block">
  <a href="/assets/pdf/LOCATE_supp.pdf" target="_blank"
  class="external-link button is-normal is-rounded is-dark">
  <span class="icon">
    <i class="fas fa-file-pdf"></i>
  </span>
  <span>Supp</span>
  </a>
  </span>

<!-- Github link -->
  <span class="link-block">
    <a href="https://github.com/Reagan1311/LOCATE" target="_blank"
    class="external-link button is-normal is-rounded is-dark">
    <span class="icon">
      <i class="fab fa-github"></i>
    </span>
    <span>Code</span>
  </a>
</span>

<!-- Video Link -->
<span class="link-block">
<a href="https://www.youtube.com/watch?v=RLHansdFxII" target="_blank" class="external-link button is-normal is-rounded is-dark">
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
Humans excel at acquiring knowledge through observation. 
For example, we can learn to use new tools by watching demonstrations. This skill is fundamental for intelligent systems to interact with the world. A key step to acquire this skill is to identify what part of the object affords each action, which is called affordance grounding. 
In this paper, we address this problem and propose a framework called LOCATE that can identify matching object parts across images, to transfer knowledge from images where an object is being used (exocentric images used for learning), to images where the object is inactive (egocentric ones used to test). 
To this end, we first find interaction areas and extract their feature embeddings.
Then we learn to aggregate the embeddings into compact prototypes (human, object part, and background), and select the one representing the object part.
Finally, we use the selected prototype to guide affordance grounding. 
We do this in a weakly supervised manner, learning only from image-level affordance and object labels.
Extensive experiments demonstrate that our approach outperforms state-of-the-art methods by a large margin on both seen and unseen objects. 

<center>
<figure>
    <div id="projectid">
       <img src="/assets/img/locate/problem_setting.gif" width="100%">
    </div>
    <figcaption style="font-size: 90%; margin-top: 12px; text-align: left; font-weight: 400">
        The problem setting of the Weakly Supervised Affordance Grounding task.
    </figcaption>
</figure>
</center>

<hr>
<h3> Pipeline </h3>
<center>
<figure>
    <div id="projectid">
       <img src="/assets/img/locate/pipeline.png" width="100%">
    </div>
<figcaption style="font-size: 90%; margin-top: 12px; text-align: left; font-weight: 400">
		Overview of the proposed LOCATE framework. It achieves part-level knowledge transfer in three steps: 1) locating interaction
regions with ψ<sub>cam</sub>, 2) object-part embedding selection with PartSelect, and 3) part-level knowledge transfer with
L<sub>cos</sub>. At test time, only the egocentric branch is maintained.
    </figcaption>
</figure>
</center>

<hr>
[comment]: Video Summary
<h3> Video Summary </h3>
<center>
<div class="embed-responsive embed-responsive-16by9" style="width: 95%">
<iframe class="embed-responsive-item" src="https://www.youtube.com/embed/RLHansdFxII" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
</div>
</center>

<hr>
[comment]: Qualitative Results
<h3> Qualitative Results </h3>
<center>
<figure>
    <div id="projectid">
        <img src="/assets/img/locate/results.png" width="100%">
    </div>
    <figcaption style="font-size: 90%; margin-top: 12px; text-align: left; font-weight: 400">
	    Qualitative comparison between our approach and state-of-the-art affordance grounding methods (<a href="https://arxiv.org/abs/1812.04558">Hotspots [41]</a>, <a href="https://arxiv.org/abs/2203.09905">Cross-view-AG [36]</a>, 
and <a href="https://arxiv.org/abs/2208.13196">Cross-view-AG+ [35]</a>). For the unseen setting, the displayed objects are not in the training set. For example, the model learns
where a motorcycle can be ridden in training, and locates rideable area for the bicycle at test time.
    </figcaption>
</figure>
</center>

<hr>
[comment]: Citation
<h3> Citation </h3>
<pre style="background-color:#f0f0f0; color:black; padding:10px; padding-left:30px; border-radius:6px;">
@inproceedings{li:locate:2023,
  title = {LOCATE: Localize and Transfer Object Parts for Weakly Supervised Affordance Grounding},
  author = {Li, Gen and Jampani, Varun and Sun, Deqing and Sevilla-Lara, Laura},
  booktitle={Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition},
  year={2023}
}
</pre>

<!-- <p style="color:black; background-color:gray">
</p> -->