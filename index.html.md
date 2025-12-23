---
page-layout: custom
pagetitle: Emil Hvitfeldt - Home
---

```{=html}
<!-- remove home buttom on home page -->
<script>
document.querySelector(".navbar-nav > li > a > span").remove();
</script>
```

::: {.main}

::: {.left}
# Emil Hvitfeldt

## Software Engineer at Posit PBC
  
I’m a Software Engineer at [Posit PBC](https://posit.co/). Proud co-author of [Supervised Machine Learning for Text Analysis in R](https://smltar.com/) with [Julia Silge](https://juliasilge.com/). My interests include developing tools for natural language processing, machine learning using tidymodels, education, and the use of colors in data visualizations.
:::

::: {.right}
![](home.webp)
:::

:::

```{=html}
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <style>
      html,
      body {
        margin: 0;
        padding: 0;
      }

      /* Fixed-height strip */
      #flow-container {
        position: relative;
        width: 100%;
        height: 200px;
        overflow: hidden;
        pointer-events: none;
      }

      .floater {
        position: absolute;
        left: -80px; /* start off-screen on the left */
        width: var(--size, 40px);
        height: var(--size, 40px);

        animation-name: float-right;
        animation-timing-function: linear;
        animation-fill-mode: forwards;

        will-change: transform;
      }

      .floater svg {
        width: 100%;
        height: 100%;
        display: block;
      }

      @keyframes float-right {
        from {
          transform: translateX(0) translateY(0) rotate(0deg);
        }
        to {
          transform: translateX(120vw) translateY(var(--drift, 0px))
            rotate(360deg);
        }
      }

      .floater {
        pointer-events: none; /* default: not clickable */
      }

      .floater.clickable {
        pointer-events: auto;
        cursor: default; /* or just remove the cursor line entirely */
      }
    </style>
  </head>
  <body>
    <div id="flow-container"></div>

    <script>
      const container = document.getElementById("flow-container");

      //  bigger = fewer shapes
      const SPAWN_INTERVAL_MS = 1000;

      const palette = [
        "#CBDED3",
        "#8BA49A",
        "#D2C49E",
        "#3B6255",
        "#E2DFDA",
      ];

      // Inline SVGs (use currentColor so CSS color applies)
      const svgs = [
        {
          html: () => `
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="38" fill="currentColor"/>
      </svg>
    `,
          clickable: false,
        },
        {
          html: () => `
      <svg viewBox="0 0 100 100">
        <rect x="18" y="18" width="64" height="64" rx="10" fill="currentColor"/>
      </svg>
    `,
          clickable: false,
        },
        {
          html: () => `
      <svg viewBox="0 0 100 100">
        <path d="M50 16 L86 84 H14 Z" fill="currentColor"/>
      </svg>
    `,
          clickable: false,
        },
        {
          html: () => `
      <svg viewBox="0 0 100 100">
        <path d="M50 10 L88 50 L50 90 L12 50 Z" fill="currentColor"/>
      </svg>
    `,
          clickable: false,
        },
        {
          // ⭐ CLICKABLE STAR
          html: () => `
      <svg viewBox="0 0 100 100">
        <path d="M50 12 L61 38 L89 41 L68 59 L74 87 L50 72 L26 87 L32 59 L11 41 L39 38 Z"
              fill="currentColor"/>
      </svg>
    `,
          clickable: true,
        },
      ];

      function runif(min, max) {
        return min + Math.random() * (max - min);
      }

      function sample(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
      }

      function spawnFloater() {
        const el = document.createElement("div");
        el.className = "floater";

        const containerHeight = container.clientHeight;

        // size
        const size = runif(16, 56);
        el.style.setProperty("--size", size + "px");

        // vertical drift
        const drift = runif(-40, 40);
        el.style.setProperty("--drift", drift.toFixed(0) + "px");

        // safe vertical placement (no clipping)
        const maxDrift = Math.abs(drift);
        const minTop = maxDrift;
        const maxTop = containerHeight - size - maxDrift;
        el.style.top = runif(minTop, Math.max(minTop, maxTop)) + "px";

        // animation timing (starts from the left)
        const duration = runif(15, 30);
        el.style.animationDuration = duration + "s";
        el.style.animationDelay = "0s";

        // color from palette
        el.style.color = sample(palette);

        // pick shape
        const shape = sample(svgs);
        el.innerHTML = shape.html();

        // make only certain shapes clickable
        if (shape.clickable) {
          el.classList.add("clickable");
          el.addEventListener("click", (e) => {
            e.stopPropagation();
            window.location.href = "projects.html";
          });
        }

        container.appendChild(el);
        el.addEventListener("animationend", () => el.remove());
      }

      setInterval(spawnFloater, SPAWN_INTERVAL_MS);
    </script>
  </body>
</html>
```