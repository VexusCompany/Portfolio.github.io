# VEXUS SEO Handoff

## Deploy These Files

Upload these files with the rest of the site:

- `index.html`
- `robots.txt`
- `sitemap.xml`
- `llms.txt`
- `brand-entity.json`
- `_redirects` if the host is Netlify
- `.htaccess` if the host is Apache/cPanel
- `web.config` if the host is IIS

If you deploy with Node hosting, also upload:

- `server.js`
- `package.json`
- `package-lock.json`

## Google Setup

### 1. Add the property in Google Search Console

- Add a `Domain property` for `vex-us.com`
- Verify ownership using the DNS TXT record that Google gives you

### 2. Submit the sitemap

Submit this exact URL in Search Console:

- `https://vex-us.com/sitemap.xml`

### 3. Request indexing for priority URLs

Use URL Inspection and request indexing for:

- `https://vex-us.com/en/`
- `https://vex-us.com/ar/`
- `https://vex-us.com/en/about/`
- `https://vex-us.com/ar/about/`
- `https://vex-us.com/en/contact/`
- `https://vex-us.com/ar/contact/`
- `https://vex-us.com/en/services/software-development-agency/`
- `https://vex-us.com/ar/services/software-development-agency/`
- `https://vex-us.com/en/brand/vexus-official/`
- `https://vex-us.com/ar/brand/vexus-official/`

### 4. Monitor after submission

Check these reports in Search Console:

- `Sitemaps`
- `Page indexing`
- `URL Inspection`
- `Enhancements` if Google starts reporting rich result items

## Technical Status

These points are already prepared in the project:

- Clean canonical URLs for English and Arabic routes
- `hreflang` for `en`, `ar`, and `x-default`
- Crawlable `robots.txt`
- Live `sitemap.xml`
- Organization, WebSite, WebPage, Breadcrumb, FAQ, and Service schema
- Official entity references in `llms.txt` and `brand-entity.json`
- Clean route URLs replacing old parameter-based references

## Priority URLs For Google

Focus Search Console inspection on these first:

- Homepage
- About
- Contact
- Main software service page
- Main branded official page

After those are indexed, inspect the remaining service and brand pages in batches.

## Notes

- If you change titles, descriptions, routes, or add pages, regenerate or update `sitemap.xml`
- Keep `robots.txt` and `sitemap.xml` at the domain root
- Do not submit old parameter URLs like `?lang=` or `?page=` to Google
