/**
 * Site knowledge - describes what's where so the LLM can route requests intelligently.
 */

const SITE_KNOWLEDGE = `
## Site Structure Knowledge

This Jekyll site has the following file organization:

### Data Files (YAML content)
- **_data/site.yml** - Main site content:
  - Personal info: name, title, phone, email, location, social_links
  - Hero section: hero_heading, hero_subheading, hero_description, etc.
  - About text: about_description, about_highlights
  - Services: services array with title, description, features, icon
  - Projects: projects array with title, description, tags, link, image
  - Contact info: contact_* fields
  - Pages content: any page-specific content blocks

### Style Files (CSS)
- **assets/css/style.css** - All visual styling:
  - CSS variables in :root { } - colors, shadows, spacing
  - Color scheme: --primary-color, --primary-dark, --text-dark, --text-light, --bg-light, --border-color
  - Typography, layout, animations
  - Component styles

### Layout Files (HTML templates)
- **_layouts/default.html** - Base page layout (header, nav, footer)

### Page Files (HTML)
- **index.html** - Homepage structure and sections
- **services.html** - Services page
- **projects.html** - Projects/portfolio page
- **contact.html** - Contact page
- **book.html** - Booking page

## Request Routing Guide

When user mentions:
- "color", "theme", "style", "font", "spacing", "shadow" → assets/css/style.css
- "phone", "email", "name", "title", "services", "projects", "about" → _data/site.yml
- "navigation", "header", "footer", "menu" → _layouts/default.html
- "homepage", "hero", "landing" → index.html or _data/site.yml depending on structure vs content
- "button text", "heading text", "description" → _data/site.yml (content)
- "button appearance", "heading size" → assets/css/style.css (styling)

## Clarification Triggers

Ask for clarification when:
- Request is ambiguous between content vs style (e.g., "change the button" - color or text?)
- Multiple interpretations exist (e.g., "update contact" - which contact field?)
- Request lacks specifics (e.g., "make it look better" - what aspect?)
- Color/style request without specific values (e.g., "change the color" - to what?)
`;

/**
 * Get the site knowledge prompt section
 */
function getSiteKnowledge() {
  return SITE_KNOWLEDGE;
}

/**
 * Common clarifying questions and their triggers
 */
const CLARIFICATION_PATTERNS = [
  {
    triggers: ['color', 'theme', 'palette'],
    needsValue: true,
    question: 'What color or color scheme would you like? (e.g., "blue", "dark mode", "#0071e3")'
  },
  {
    triggers: ['change the button', 'update button'],
    ambiguous: true,
    question: 'Do you want to change the button text/label or its appearance (color, size)?'
  },
  {
    triggers: ['update contact', 'change contact'],
    ambiguous: true,
    question: 'Which contact field? (phone, email, address, or contact page text)'
  },
  {
    triggers: ['make it', 'look better', 'improve'],
    vague: true,
    question: 'What specific aspect would you like to improve? (colors, fonts, spacing, content, etc.)'
  }
];

module.exports = {
  getSiteKnowledge,
  CLARIFICATION_PATTERNS,
  SITE_KNOWLEDGE
};
