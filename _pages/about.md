---
layout: about
title: About
permalink: /
subtitle: >
  Master's Student · <a href="https://nitdelhi.ac.in/">NIT Delhi</a> ·
  Advised by <a href="https://faculty.nitdelhi.ac.in/NishaSinghChauhan/profile">Dr. Nisha Singh Chauhan</a>

profile:
  align: right
  image: prof_pic.jpg
  image_circular: true # small circular avatar (styled in _sass/_components.scss)
  more_info: >
    <p>New Delhi, India</p>
    <p><a href="mailto:ayushlodh26@gmail.com">ayushlodh26@gmail.com</a></p>

news: true
announcements:
  enabled: true
  scrollable: true # adds a scrollbar if there are more than 3 news items
  limit: 5 # leave blank to include all the news in the `_data/news.yml` file
selected_papers: true # shows papers marked selected={true} in _bibliography/papers.bib
social: true # shows the social icons defined in _data/socials.yml at the bottom
chart:
  echarts: true # needed for the "Research at a Glance" charts below
---

I am a Master's student in the [Department of Computer Science & Engineering](https://nitdelhi.ac.in/) at **National Institute of Technology Delhi**, working under the supervision of [Dr. Nisha Singh Chauhan](https://faculty.nitdelhi.ac.in/NishaSinghChauhan/profile).

My research interests lie in **computer vision**, **deep learning**, and **pattern recognition**, with a particular focus on **handwriting recognition** and **document understanding**. My recent work includes:

- **Transformer-based handwriting recognition** — a system that jointly leverages online (stroke) and offline (image) features, published at ACPR 2025.
- **NoTeS-Bank** — a benchmark for neural transcription and search over handwritten scientific notes, evaluating vision-language models on evidence-based and open-domain VQA.
- **From Chunks to Graphs** — a training-free multimodal retrieval framework that replaces chunk-based RAG with structure-aware subgraph retrieval over document graphs, developed during a research internship at the [Computer Vision Center](https://www.cvc.uab.es/) (UAB, Barcelona).

I have collaborated with the [Computer Vision and Pattern Recognition Unit (CVPRU)](https://cvpru.isical.ac.in/) at the [Indian Statistical Institute, Kolkata](https://www.isical.ac.in/), working with [Prof. Umapada Pal](https://www.isical.ac.in/~umapada/)'s group on handwriting recognition and document analysis, and contributed to the **ICDAR 2025 Handwritten Notes Understanding Challenge**.

<h2><a href="{{ '/news/' | relative_url }}" style="color: inherit">News</a></h2>

{% include news.liquid limit=true %}

---

## Research at a Glance

<div class="row mt-3">
  <div class="col-sm-6" markdown="1">

**Publication Venues**

```echarts
{
  "tooltip": { "trigger": "item", "formatter": "{b}: {c} ({d}%)" },
  "legend": {
    "orient": "vertical",
    "right": "0%",
    "top": "center"
  },
  "series": [
    {
      "type": "pie",
      "radius": ["35%", "60%"],
      "center": ["35%", "50%"],
      "avoidLabelOverlap": true,
      "itemStyle": { "borderRadius": 6, "borderColor": "#fff", "borderWidth": 2 },
      "label": { "show": false },
      "emphasis": {
        "label": { "show": true, "fontSize": 13, "fontWeight": "bold" }
      },
      "data": [
        { "value": 1, "name": "ACPR (LNCS)", "itemStyle": { "color": "#4f8ef7" } },
        { "value": 1, "name": "ICDAR (LNCS)", "itemStyle": { "color": "#5cc88a" } },
        { "value": 1, "name": "arXiv preprints", "itemStyle": { "color": "#f7a64f" } }
      ]
    }
  ]
}
```

  </div>
  <div class="col-sm-6" markdown="1">

**Research Skills**

```echarts
{
  "tooltip": {},
  "radar": {
    "indicator": [
      { "name": "Computer Vision", "max": 10 },
      { "name": "Deep Learning", "max": 10 },
      { "name": "Handwriting Recognition", "max": 10 },
      { "name": "Document Understanding", "max": 10 },
      { "name": "Multimodal / VQA", "max": 10 }
    ],
    "radius": "65%"
  },
  "series": [
    {
      "type": "radar",
      "data": [
        {
          "value": [8, 8, 9, 8, 7],
          "name": "Expertise",
          "areaStyle": { "opacity": 0.3 },
          "lineStyle": { "color": "#4f8ef7", "width": 2 },
          "itemStyle": { "color": "#4f8ef7" }
        }
      ]
    }
  ]
}
```

  </div>
</div>
