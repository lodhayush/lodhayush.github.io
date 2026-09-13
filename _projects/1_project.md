---
layout: page
title: Transformer-Based Handwriting Recognition
description: Early fusion of online stroke and offline image features
img: assets/img/handwriting_fusion.jpg
importance: 3
category: work
---

A **transformer-based handwriting recognition system** that jointly uses **online** (pen trajectory) and **offline** (rasterized image) features. Published at **ACPR 2025**.

### Problem

Handwriting carries complementary cues in the rasterized glyph and in the pen's trajectory, yet most recognition systems exploit only one modality — losing information the other captures.

{% include figure.liquid loading="eager" path="assets/img/handwriting_fusion.jpg" class="img-fluid rounded z-depth-1" caption="Input modalities for handwritten text recognition: (A) image-only, (B) stroke-only, (C) late fusion, and (D) early fusion of both — this work." %}

### Approach

- **Patch encoder** converts the grayscale crop into fixed-length visual tokens
- **Lightweight transformer** embeds the (x, y, pen) stroke sequence
- **Learnable latent queries** attend jointly to both token streams, yielding context-enhanced stroke embeddings that are pooled and decoded under a cross-entropy objective
- **Early fusion** in a shared latent space, before any high-level classification, so temporal and visual cues reinforce each other — producing stronger writer independence

{% include figure.liquid loading="eager" path="assets/img/handwriting_pipeline.jpg" class="img-fluid rounded z-depth-1" caption="The proposed pipeline: image and stroke encoders, cross-modal fusion via learnable latent queries, and a classification head." %}

### Results

- **State-of-the-art accuracy** on **IAMOn-DB** and **VNOn-DB**, exceeding previous bests by up to 1%
- Pipeline adapted with gesturification to the **ISI-Air** dataset

{% include figure.liquid loading="eager" path="assets/img/handwriting_results.jpg" class="img-fluid rounded z-depth-1" caption="Qualitative results on (A) IAM-OnDB and (B) VN-OnDB: baselines in red misrecognize the characters that our model, in green, recognizes correctly." %}

### Publication

Lodh, A., Chakraborty, R., Shivakumara, P., Pal, U. _A Transformer Based Handwriting Recognition System Jointly Using Online and Offline Features._ ACPR 2025, LNCS, pp. 250–264. [DOI](https://doi.org/10.1007/978-981-95-4395-3_18) · [arXiv](https://arxiv.org/abs/2506.20255) · [Code (HATChar-Classifier)](https://github.com/lodhayush/HATChar-Classifier)

Work done at the [Computer Vision and Pattern Recognition Unit](https://cvpru.isical.ac.in/), Indian Statistical Institute, Kolkata, advised by Prof. Umapada Pal.
