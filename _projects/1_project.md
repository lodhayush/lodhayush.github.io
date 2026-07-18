---
layout: page
title: Transformer-Based Handwriting Recognition
description: Jointly using online (stroke) and offline (image) features for handwritten text recognition. Published at ACPR 2025.
img: # e.g. assets/img/handwriting_preview.jpg — add a figure from the paper
importance: 1
category: work
---

Handwriting recognition systems typically use either **online** features (pen
trajectories and stroke dynamics) or **offline** features (rendered images) —
each captures information the other misses.

This work builds a **transformer-based recognition system that fuses both
modalities jointly**, improving recognition over single-modality baselines.
The paper was published at **ACPR 2025** (Lecture Notes in Computer Science)
with collaborators from the Indian Statistical Institute, Kolkata.

**Links:** [Paper (DOI)](https://doi.org/10.1007/978-981-95-4395-3_18) ·
[arXiv](https://arxiv.org/abs/2506.20255) ·
[Code (HATChar-Classifier)](https://github.com/lodhayush/HATChar-Classifier)

<!-- EDIT: add result figures to assets/img/ and embed them here, e.g.:
<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/handwriting_results.jpg" title="results" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
-->
