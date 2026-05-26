<div align="center">

# ISS Mission Control

**Real-time International Space Station tracker with 3D globe visualization.**

[![GitHub](https://img.shields.io/badge/Source_Code-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/RivaldiDev/iss-mission-control)

[Overview](#overview) · [Features](#features) · [Getting Started](#getting-started) · [Architecture](#architecture)

</div>

---

## Overview

Live ISS position tracker fetching real-time coordinates from the Open Notify API. Features a Three.js 3D wireframe globe with orbit trail, crew roster, and scroll-driven animations.

Built with vanilla JavaScript, Vite, and Tailwind CSS 4.

## Features

| Area | What it does |
| --- | --- |
| **Live Tracking** | ISS position updated every 5 seconds with smooth lerp interpolation. |
| **3D Globe** | Interactive Three.js wireframe Earth with ISS marker, orbit trail, and grid lines. Drag to rotate. |
| **Crew Roster** | Real-time crew list from Open Notify API with featured card layout. |
| **Orbital Stats** | Speed (27,600 km/h), altitude (408 km), orbit period (92 min), crew count. |
| **Scroll Animations** | Motion One: staggered entrances, scroll-triggered reveals, parallax, progress bar. |
| **Impeccable Design** | Editorial layout, OKLCH color system, tinted neutrals, no anti-patterns. |
| **Responsive** | Mobile-first grid with varied stat/card layouts. |

## Getting Started

```bash
git clone https://github.com/RivaldiDev/iss-mission-control.git
cd iss-mission-control
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Architecture

```
src/
├── api.js              # ISS position + crew data fetchers
├── globe.js            # Three.js wireframe globe + ISS marker
├── main.js             # Alpine.js store + Motion One animations
└── style.css           # Tailwind v4 + OKLCH theme (terracotta + olive-sage)
```

---

<div align="center">

![MIT License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**Built by [RivaldiDev](https://github.com/RivaldiDev)**

</div>
