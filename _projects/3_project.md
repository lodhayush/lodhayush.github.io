---
layout: page
title: From Chunks to Graphs
description: Training-free multimodal late interaction for document understanding — structure-aware subgraph retrieval instead of chunk-based RAG. Published at ICDAR 2026.
img: # e.g. assets/img/chunks_to_graphs_preview.jpg — add a figure from the paper
importance: 3
category: work
---

Retrieval-augmented generation over document images usually splits pages into
flat **text chunks**, discarding the layout and cross-region structure that
carries much of a document's meaning.

**From Chunks to Graphs** is a **training-free multimodal retrieval framework**
that replaces chunk-based selection with **structure-aware subgraph retrieval**
over Doc2Graph representations of each document, improving factual consistency
on document VQA over text-RAG baselines.

The work was developed during a research internship at the
[Computer Vision Center](https://www.cvc.uab.es/) (UAB, Barcelona) with
Dr. Sanket Biswas and Dr. Josep Lladós, co-advised by Dr. Nisha Singh Chauhan
(NIT Delhi), and published at **ICDAR 2026** (Lecture Notes in Computer Science).

**Links:** [Paper (DOI)](https://doi.org/10.1007/978-3-032-36039-7_35)
