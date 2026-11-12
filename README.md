# N-Ops — Website

Marketing site for N-Ops, the open-source infrastructure control plane. Built with [Astro](https://astro.build).

## Structure

```
src/
├── pages/index.astro       page content (hero through CTA)
├── layouts/BaseLayout.astro  head, nav, footer, closing script
├── components/             Seo, Header, Footer, IconSprite
├── styles/global.css       site stylesheet
└── scripts/site.js         nav, canvas fields, architecture scroll, FAQ
public/                     favicon, robots.txt
```

## Commands

| Command           | Action                                  |
| :----------------- | :--------------------------------------- |
| `npm install`       | Install dependencies                     |
| `npm run dev`        | Start dev server at `localhost:4321`     |
| `npm run build`       | Build production site to `./dist/`       |
| `npm run preview`      | Preview the production build locally     |

`astro.config.mjs` sets `site` to `https://nops.app` for canonical URLs and the sitemap — update it if that domain changes.

## License

Licensed under the [GNU GPL v3.0](LICENSE).
