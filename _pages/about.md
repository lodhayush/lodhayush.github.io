---
layout: about
title: About
permalink: /
subtitle: >
  Master's Student · <a href="https://nitdelhi.ac.in/">NIT Delhi</a> ·
  Advised by <a href="https://faculty.nitdelhi.ac.in/NishaSinghChauhan/profile">Dr. Nisha Singh Chauhan</a>

news: true
announcements:
  enabled: true
  scrollable: true # adds a scrollbar if there are more than 3 news items
  limit: 5 # leave blank to include all the news in the `_data/news.yml` file
selected_papers: true # shows papers marked selected={true} in _bibliography/papers.bib
social: false # the social icons live in the sidebar
chart:
  echarts: true # needed for the "Research at a Glance" charts below (timeline data: _plugins/pub-stats.rb)
---

I am a Master's student in the [Department of Computer Science & Engineering](https://cse.nitdelhi.ac.in/) at **National Institute of Technology Delhi**, working under the supervision of [Dr. Nisha Singh Chauhan](https://faculty.nitdelhi.ac.in/NishaSinghChauhan/profile).

My research spans **computer vision**, **deep learning**, and **pattern recognition**, with a particular focus on **handwriting recognition** and **document understanding**. My recent work includes:

- **From Chunks to Graphs** — a training-free multimodal retrieval framework that replaces chunk-based RAG with structure-aware subgraph retrieval over document graphs, developed during a research internship at the [Computer Vision Center](https://www.cvc.uab.es/) (UAB, Barcelona) and published at ICDAR 2026.
- **NoTeS-Bank** — a benchmark evaluating vision-language models on unstructured academic and scientific handwritten notes through evidence-based and open-domain VQA, published at ECML PKDD 2026.
- **Transformer-based handwriting recognition** — a system that jointly leverages online (stroke) and offline (image) features, published at ACPR 2025.

I have collaborated with the [Computer Vision and Pattern Recognition Unit (CVPRU)](https://cvpru.isical.ac.in/) at the [Indian Statistical Institute, Kolkata](https://www.isical.ac.in/), working with [Prof. Umapada Pal](https://www.isical.ac.in/~umapada/)'s group on handwriting recognition and document analysis, and contributed to the **ICDAR 2025 Handwritten Notes Understanding Challenge**.

<h2><a href="{{ '/news/' | relative_url }}" style="color: inherit">News</a></h2>

{% include news.liquid limit=true %}

---

## Research at a Glance

<div class="row mt-3">
  <div class="col-sm-6" markdown="1">

**Publication Timeline**

```echarts
{
  "tooltip": { "trigger": "axis" },
  "grid": { "left": "5%", "right": "5%", "bottom": "10%", "containLabel": true },
  "xAxis": {
    "type": "category",
    "data": [{% for y in site.data.pub_stats.years %}"{{ y.year }}"{% unless forloop.last %}, {% endunless %}{% endfor %}],
    "axisLabel": { "color": "#666" }
  },
  "yAxis": {
    "type": "value",
    "name": "Papers",
    "minInterval": 1,
    "axisLabel": { "color": "#666" }
  },
  "series": [
    {
      "name": "Publications",
      "type": "bar",
      "barMaxWidth": 40,
      "data": [{% for y in site.data.pub_stats.years %}{{ y.count }}{% unless forloop.last %}, {% endunless %}{% endfor %}],
      "itemStyle": {
        "color": {
          "type": "linear",
          "x": 0, "y": 0, "x2": 0, "y2": 1,
          "colorStops": [
            { "offset": 0, "color": "#b93a14" },
            { "offset": 1, "color": "#e8a33d" }
          ]
        },
        "borderRadius": [4, 4, 0, 0]
      },
      "label": { "show": true, "position": "top" }
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
      { "name": "Computer\nVision", "max": 10 },
      { "name": "Deep\nLearning", "max": 10 },
      { "name": "Handwriting\nRecognition", "max": 10 },
      { "name": "Document\nUnderstanding", "max": 10 },
      { "name": "Multimodal\nVQA", "max": 10 }
    ],
    "radius": "52%",
    "axisNameGap": 8,
    "axisName": { "fontSize": 11, "lineHeight": 13 }
  },
  "series": [
    {
      "type": "radar",
      "data": [
        {
          "value": [8, 8, 9, 8, 7],
          "name": "Expertise",
          "areaStyle": { "opacity": 0.3 },
          "lineStyle": { "color": "#b93a14", "width": 2 },
          "itemStyle": { "color": "#b93a14" }
        }
      ]
    }
  ]
}
```

  </div>
</div>

<div class="row mt-2">
  <div class="col-sm-12" markdown="1">

**Publication Venues**

```echarts
{
  "tooltip": { "trigger": "item", "formatter": "{b}: {c} ({d}%)" },
  "legend": {
    "orient": "vertical",
    "right": "5%",
    "top": "center"
  },
  "series": [
    {
      "type": "pie",
      "radius": ["35%", "60%"],
      "center": ["38%", "50%"],
      "avoidLabelOverlap": true,
      "itemStyle": { "borderRadius": 6, "borderColor": "#fff", "borderWidth": 2 },
      "label": { "show": false },
      "emphasis": {
        "label": { "show": true, "fontSize": 13, "fontWeight": "bold" }
      },
      "data": [
        { "value": 2, "name": "ICDAR (LNCS)", "itemStyle": { "color": "#3b3486" } },
        { "value": 1, "name": "ECML PKDD (LNCS)", "itemStyle": { "color": "#e8a33d" } },
        { "value": 1, "name": "ACPR (LNCS)", "itemStyle": { "color": "#b93a14" } }
      ]
    }
  ]
}
```

  </div>
</div>
