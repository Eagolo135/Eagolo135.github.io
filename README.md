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
