---
layout: page
title: ICDAR 2025 HNU Challenge
description: Handwritten Notes Understanding competition benchmark
importance: 4
category: work
chart:
  echarts: true
---

The **ICDAR 2025 Handwritten Notes Understanding (HNU) Challenge** is a competition benchmark for evidence-based question answering over real-world handwritten scientific notes.

### Motivation

Handwritten scientific documents — with complex visual structures, diverse modalities, and domain-specific shorthand — remain a largely unmet challenge for OCR-based and template-driven document AI.

### Benchmark

- A test set of **1,000 curated question–answer pairs** grounded in over 2,000 real academic note images
- Spans STEM domains: mathematics, differential equations, physics, chemistry, computer science, and engineering
- A multi-phase evaluation protocol that scores grounded reasoning, not just answer correctness — models must localize the exact visual evidence (boxed formulas, diagrams, text fragments) supporting their answers
- Hosted on the Robust Reading Challenge (RRC) portal: 16 registered teams, 6 valid submissions

### Results

Final leaderboard (Evidence-Based VQA) — even the best systems score low ANLS\*, underscoring how hard the task is:

| Rank | Team — Model           | ANLS\* | Global Acc (%) |
| ---- | ---------------------- | ------ | -------------- |
| 1    | Qwen VL 2.5 (Baseline) | 0.4468 | 47.75          |
| 2    | Winden — Ovis + ICL    | 0.4365 | 21.78          |
| 3    | Vestige — Kimi + CoT   | 0.4143 | 22.68          |
| 4    | Kalman — InternVL 3    | 0.3380 | 25.87          |
| 5    | Castor — Molmo VL      | 0.2109 | 12.19          |

```echarts
{
  "tooltip": { "trigger": "axis" },
  "grid": { "left": "3%", "right": "4%", "bottom": "3%", "containLabel": true },
  "xAxis": { "type": "category", "data": ["Qwen VL2.5", "Winden", "Vestige", "Kalman", "Castor", "Newtron"] },
  "yAxis": { "type": "value", "name": "ANLS*" },
  "series": [
    {
      "type": "bar",
      "data": [0.4468, 0.4365, 0.4143, 0.338, 0.2109, 0.0611],
      "barMaxWidth": 45,
      "itemStyle": { "color": "#4f8ef7", "borderRadius": [4, 4, 0, 0] },
      "label": { "show": true, "position": "top" }
    }
  ]
}
```

### Publication

Pal, A., Biswas, S., Das, A., Lodh, A. et al. _ICDAR 2025 Handwritten Notes Understanding Challenge._ ICDAR 2025, LNCS, pp. 553–567. [DOI](https://doi.org/10.1007/978-3-032-04630-7_32)

Work done at Habitat Lens Private Limited; the companion benchmark is [NoTeS-Bank]({{ '/projects/2_project/' | relative_url }}).
