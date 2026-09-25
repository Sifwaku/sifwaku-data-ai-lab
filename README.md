# Sifwaku Data & AI Lab

GitHub Pages-ready evidence layer for Gift Sifwaku.

## Recommended production setup
Use GitHub Pages for the public website and Vercel for the Gemini proxy. GitHub Pages cannot safely store a private API key in the browser and cannot run the `/api/gemini` function.

### 1) Deploy the static site to GitHub Pages
1. Create a public repository named `sifwaku-data-ai-lab` under the `sifwaku` GitHub account.
2. Upload the contents of this folder.
3. GitHub → Settings → Pages.
4. Deploy from `main` branch, root folder.
5. Publish at `https://sifwaku-data-ai-lab.vercel.app/`.

### 2) Deploy the Gemini proxy on Vercel
1. Import the same repository into Vercel.
2. Add the environment variable `GEMINI_API_KEY` in Vercel.
3. Deploy and copy the Vercel URL, for example `https://sifwaku-data-ai-lab.vercel.app`.
4. Replace the hosted frontend endpoint in [index.html](index.html) with `https://your-vercel-project.vercel.app/api/gemini`.
5. Push that change to GitHub Pages and test the AI from the public URL.

### 3) Frontend fallback
If no endpoint is configured, the site automatically falls back to the built-in local assistant responses so the website keeps working while the backend is being prepared.

### 4) Help Google find SifwakuLab
1. Open Google Search Console and add `https://sifwaku-data-ai-lab.vercel.app/` as a URL-prefix property.
2. Verify ownership using the GitHub Pages HTML file or DNS if you later use a custom domain.
3. Submit `https://sifwaku-data-ai-lab.vercel.app/sitemap.xml`.
4. Inspect and request indexing for the home page, `course5.html`, `course4.html` and `library.html`.
5. Use the same public name everywhere: `SifwakuLab` and `Gift Sifwaku` in the site title, portfolio, social profiles and project descriptions.

Google decides ranking and timing itself. Search Console submission makes the site discoverable; consistent public references and useful content help it rank for searches such as `SifwakuLab` and `Sifwaku Gift`.

## Evidence rule
Replace methodology placeholders with actual notebooks, source data, charts, code and verified results before presenting a project as completed evidence.

Never publish NRC/student numbers, home address, financial details or unnecessary certificate identifiers.
