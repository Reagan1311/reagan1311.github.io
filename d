[1mdiff --git a/_bibliography/papers.bib b/_bibliography/papers.bib[m
[1mindex e359d43..a3ce8fe 100644[m
[1m--- a/_bibliography/papers.bib[m
[1m+++ b/_bibliography/papers.bib[m
[36m@@ -8,6 +8,7 @@[m
   selected={true},[m
   preview = "aff-grasp.png",[m
   year={2024},[m
[32m+[m[32m  arxiv = "2408.10123",[m
   website="https://reagan1311.github.io/affgrasp",[m
   abstract = {Affordance, defined as the potential actions that an object offers, is crucial for robotic manipulation tasks. A deep understanding of affordance can lead to more intelligent AI systems. For example, such knowledge directs an agent to grasp a knife by the handle for cutting and by the blade when passing it to someone. In this paper, we present a streamlined affordance learning system that encompasses data collection, effective model training, and robot deployment. First, we collect training data from egocentric videos in an automatic manner. Different from previous methods that focus only on the object graspable affordance and represent it as coarse heatmaps, we cover both graspable (e.g., object handles) and functional affordances (e.g., knife blades, hammer heads) and extract data with precise segmentation masks. We then propose an effective model, termed Geometry-guided Affordance Transformer (GKT), to train on the collected data. GKT integrates an innovative Depth Feature Injector (DFI) to incorporate 3D shape and geometric priors, enhancing the model's understanding of affordances. To enable affordance-oriented manipulation, we further introduce Aff-Grasp, a framework that combines GKT with a grasp generation model. For comprehensive evaluation, we create an affordance evaluation dataset with pixel-wise annotations, and design real-world tasks for robot experiments. The results show that GKT surpasses the state-of-the-art by 15.9% in mIoU, and Aff-Grasp achieves high success rates of 95.5% in affordance prediction and 77.1% in successful grasping among 179 trials, including evaluations with seen, unseen objects, and cluttered scenes},[m
 }[m
[1mdiff --git a/affgrasp/index.html b/affgrasp/index.html[m
[1mindex ad64201..d58a5ba 100644[m
[1m--- a/affgrasp/index.html[m
[1m+++ b/affgrasp/index.html[m
[36m@@ -116,7 +116,7 @@[m
 [m
             <!-- Arxiv Link. -->[m
             <span class="link-block">[m
[31m-              <a target="_blank" href="https://reagan1311.github.io/affgrasp"[m
[32m+[m[32m              <a target="_blank" href="https://arxiv.org/abs/2408.10123"[m
                  class="external-link button is-normal is-rounded is-dark">[m
                 <span class="icon">[m
                     <i class="fas fa-file"></i>[m
[36m@@ -350,10 +350,10 @@[m
 <section class="section" id="BibTeX">[m
   <div class="container is-max-widescreen content">[m
     <h2 class="title">BibTeX</h2>[m
[31m-    <pre><code>@inproceedings{li2024affgrasp,[m
[32m+[m[32m    <pre><code>@article{li2024affgrasp,[m
   title     = {Learning Precise Affordances from Egocentric Videos for Robotic Manipulation}, [m
   author    = {Li, Gen and Tsagkas, Nikolaos and Song, Jifei and Mon-Williams, Ruaridh and Vijayakumar, Sethu and Shao, Kun and Sevilla-Lara, Laura},[m
[31m-  booktitle = {arxiv},[m
[32m+[m[32m  journal   = {arxiv preprint arXiv:2408.10123},[m
   year      = {2024},[m
 }</code></pre>[m
   </div>[m
