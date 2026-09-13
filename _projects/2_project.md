---
layout: page
title: NoTeS-Bank
description: Benchmarking vision-language models on handwritten scientific notes
importance: 2
category: work
chart:
  echarts: true
---

**NoTeS-Bank** is an evaluation benchmark for **vision-language models** on complex, handwritten academic and scientific notes — mathematical equations, diagrams, and scientific notation that break OCR-based document AI. Published at **ECML PKDD 2026**.

### Problem

Existing Document VQA benchmarks focus on printed or structured handwritten text, limiting generalization to real-world note-taking with unstructured, multimodal content.

### Benchmark

- **Evidence-Based VQA** — retrieve localized answers with bounding-box evidence
- **Open-Domain VQA** — classify the domain, then retrieve relevant documents and answers
- Demands vision–language fusion, retrieval, and multimodal reasoning rather than OCR alone
- Evaluated with ANLS\*, IoU, NDCG@5, MRR, and Recall@K across state-of-the-art VLMs

### Results

Evidence-Based VQA — even the strongest VLMs trail far behind the human baseline, exposing a large reasoning gap (ANLS\* = answer accuracy):

| Model              | ANLS\*    | Local Acc | Global Acc |
| ------------------ | --------- | --------- | ---------- |
| Qwen-2.5-VL (open) | 28.21     | 11.83     | 4.86       |
| Gemini 2.5 Pro     | 24.49     | 0.20      | —          |
| GPT-4.5            | 21.65     | 13.40     | 7.19       |
| GPT-4o             | 17.88     | 12.00     | 9.00       |
| **Human baseline** | **61.11** | **83.0**  | **79.0**   |

```echarts
{
  "tooltip": { "trigger": "axis" },
  "grid": { "left": "3%", "right": "4%", "bottom": "3%", "containLabel": true },
  "xAxis": { "type": "category", "data": ["Qwen2.5-VL", "Gemini2.5Pro", "GPT-4.5", "GPT-4o", "Human"] },
  "yAxis": { "type": "value", "name": "ANLS* (answer accuracy)" },
  "series": [
    {
      "type": "bar",
      "data": [
        { "value": 28.21, "itemStyle": { "color": "#4f8ef7" } },
        { "value": 24.49, "itemStyle": { "color": "#4f8ef7" } },
        { "value": 21.65, "itemStyle": { "color": "#4f8ef7" } },
        { "value": 17.88, "itemStyle": { "color": "#4f8ef7" } },
        { "value": 61.11, "itemStyle": { "color": "#5cc88a" } }
      ],
      "barMaxWidth": 50,
      "itemStyle": { "borderRadius": [4, 4, 0, 0] },
      "label": { "show": true, "position": "top" }
    }
  ]
}
```

### Publication

Das, A., Biswas, S., Chattopadhyay, S., Lodh, A. et al. _NoTeS-Bank: Benchmarking Vision-Language Models on Unstructured Academic and Scientific Note-Taking._ ECML PKDD 2026, LNCS, pp. 700–718. [DOI](https://doi.org/10.1007/978-3-032-37676-3_40) · [arXiv](https://arxiv.org/abs/2504.09249)

Work done at Habitat Lens Private Limited with Alloy Das; the companion [Handwritten Notes Understanding Challenge]({{ '/projects/4_project/' | relative_url }}) ran at ICDAR 2025.
