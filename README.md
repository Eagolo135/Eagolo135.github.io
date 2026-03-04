# AI Consultant Jekyll Site

A clean, responsive GitHub Pages Jekyll site for an AI consultant business.

## Features

- **Single Source of Truth**: All site content managed through `_data/site.yml`
- **Responsive Design**: Mobile-first design that works on all devices
- **Clean Typography**: Professional, readable design with modern aesthetics
- **5 Pages**: Home, Services, Projects, Contact, and Book a Call

## Structure

```
.
├── _data/
│   └── site.yml          # Single source of truth for all content
├── _layouts/
│   └── default.html      # Main layout with navbar and footer
├── assets/
│   └── css/
│       └── style.css     # All styles and responsive design
├── index.html            # Home page with hero section
├── services.html         # Services page
├── projects.html         # Projects page
├── contact.html          # Contact page
├── book.html             # Book a call page
└── _config.yml           # Jekyll configuration
```

## Customization

### Updating Site Content

All content is stored in `_data/site.yml`. Simply edit this file to update:

- Site name, title, and tagline
- About section
- Services list
- Projects portfolio
- Contact information
- Social media links
- Booking link

### Changing Colors

Edit CSS variables in `assets/css/style.css`:

```css
:root {
    --primary-color: #2563eb;
    --primary-dark: #1e40af;
    --text-dark: #1f2937;
    --text-light: #6b7280;
    --bg-light: #f9fafb;
}
```

## Local Development

1. Install Jekyll:
   ```bash
   gem install jekyll bundler
   ```

2. Create a Gemfile:
   ```ruby
   source "https://rubygems.org"
   gem "jekyll"
   gem "webrick"
   ```

3. Install dependencies:
   ```bash
   bundle install
   ```

4. Run locally:
   ```bash
   bundle exec jekyll serve
   ```

5. Visit `http://localhost:4000` in your browser

## Deployment to GitHub Pages

1. Create a new repository named `yourusername.github.io`
2. Push this code to the repository
3. Go to Settings → Pages
4. Select the branch to deploy (usually `main`)
5. Your site will be live at `https://yourusername.github.io`

## Update the Site Through an LLM (GitHub + AI)

This repo includes an optional GitHub Action that lets you request site changes in plain language.

### How it works

- You open or comment on a GitHub Issue labeled `ai-edit`
- The workflow sends your request + current site files to an LLM
- The LLM proposes updates to allowed files only
- A Pull Request is opened automatically for review

### One-time setup

1. In your GitHub repository, go to **Settings → Secrets and variables → Actions**
2. Add a repository secret named `OPENAI_API_KEY`
3. (Optional) Add repository variable `OPENAI_MODEL` (default is `gpt-5-mini`)
4. Ensure GitHub Actions are enabled

### Usage

1. Create a new issue using the **AI Site Update Request** template
2. Add label `ai-edit` (the template does this automatically)
3. Describe what you want changed
4. Wait for the workflow to open a PR
5. Review and merge

To refine changes, comment on the same issue (or add a comment starting with `/ai`) and the workflow will open/update a fresh PR run.

### Safety boundaries

The automation only edits existing content files in this site:

- `index.html`, `services.html`, `projects.html`, `contact.html`, `book.html`
- `_data/site.yml`
- `_layouts/default.html`
- `assets/css/style.css`
- `_config.yml`

It will not modify workflow files, scripts, or arbitrary repository paths.

## Local CLI: site-agent (Ollama)

Use the local `site-agent` CLI to update site content from natural language without GitHub UI steps.

### Setup

1. Install dependencies from the project root:

```bash
npm install
```

2. Create a `.env` file in the project root with:

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
OLLAMA_URL=http://localhost:11434
SITE_AGENT_CONTENT_FILE=_data/site.yml
```

3. Run chat mode:

```bash
npm run chat
```

If `.env` is missing, the tool will show:

`Missing .env configuration. Create a .env file with OPENAI_API_KEY and required settings.`

System environment variables override `.env` values when both are present.

### What it does

- Reads your request from command line text
- Calls OpenAI API by default (or Ollama if `SITE_AGENT_PROVIDER=ollama`)
- Forces strict JSON patch output (`changes` + `commit_message`)
- Applies patch operations (`set`, `append`, optional `remove`) to allowed YAML files only
- Always validates YAML parsing
- Runs `bundle exec jekyll build` when `bundle` exists
- If `bundle` is unavailable, warns and continues with YAML-only validation
- If build fails, asks the LLM for a fix patch and retries (max 3 attempts)
- If validation passes, commits and pushes to `main`
- On failure, auto-restores files to clean state

### Hard safety boundaries

- Only edits configured content files (`_data/site.yml` by default if present, else `site.yml`)
- Aborts if files outside allowed content file(s) are modified
- Does not delete files or modify GitHub Actions workflows

### Install

Install the local dependency once:

```powershell
cd .\tools\site-agent
npm install
cd ..\..
```

### Run it

PowerShell:

```powershell
.\site-agent.ps1 "Change my hero headline to AI Solutions That Drive Revenue and publish"
```

CMD:

```cmd
site-agent.cmd "Add one new service about AI automation audits with a short description"
```

### Configuration (optional)

- `OPENAI_API_KEY` (required for OpenAI provider)
- `SITE_AGENT_PROVIDER` (default: `openai`, alternative: `ollama`)
- `OPENAI_MODEL` (default: `gpt-5-mini`)
- `SITE_AGENT_MODEL` (optional override model name)
- `OLLAMA_URL` (default: `http://localhost:11434`, `/api/generate` is appended automatically)
- `SITE_AGENT_OLLAMA_URL` (optional direct override for full Ollama generate endpoint)
- `SITE_AGENT_CONTENT_FILE` (default: `_data/site.yml`)
- `SITE_AGENT_THEME_FILE` (optional second editable file)
- `SITE_AGENT_BUILD_CMD` (default: `bundle exec jekyll build`)

Example:

```powershell
$env:OPENAI_API_KEY = "sk-..."
.\site-agent.ps1 "Refresh the about section copy to be more concise and results-focused"
```

## Pages Overview

### Home Page
- Hero section with call-to-action buttons
- About section
- Services preview (first 3 services)
- Featured projects (first 3 projects)
- CTA section for booking

### Services Page
- Full list of all services
- Service descriptions with icons
- CTA to book or contact

### Projects Page
- Complete portfolio of projects
- Tech stack tags
- Project links (demo/GitHub)
- CTA for consultation

### Contact Page
- Email and phone information
- Social media links
- Quick booking option
- Response time expectations

### Book Page
- Booking link integration (Calendly/similar)
- Consultation details
- FAQ section
- Alternative contact options

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

Free to use and modify for personal or commercial projects.
