/**
 * Site knowledge - describes what's where so the LLM can route requests intelligently.
 */

const SITE_KNOWLEDGE = `
## Site Structure Knowledge

This Jekyll site has the following file organization:

### Data Files (YAML content)
- **_data/site.yml** - Main site content AND visual theme:
  - Personal info: name, title, phone, email, location, social_links
  - Hero section: hero_heading, hero_subheading, hero_description, etc.
  - About text: about_description, about_highlights
  - Services: services array with title, description, features, icon
  - Projects: projects array with title, description, tags, link, image
  - Contact info: contact_* fields
  
### THEME SYSTEM (_data/site.yml → theme section)
ALL visual styling is now configurable via YAML:

**Colors** (theme.colors.*):
- primary, primary_dark - brand colors
- secondary, accent - supporting colors
- text_dark, text_light - text colors
- bg_white, bg_light - backgrounds
- border - border color

**Typography** (theme.typography.*):
- font_family, font_family_heading
- font_size_base, font_size_h1-h4, font_size_small
- line_height

**Layout** (theme.layout.*):
- container_max_width, section_padding, card_padding

**Borders** (theme.borders.*):
- radius_small, radius_medium, radius_large, radius_pill

**Buttons** (theme.buttons.*):
- border_radius, padding, font_weight

**Shadows** (theme.shadows.*):
- small, large

**Transitions** (theme.transitions.*):
- speed_fast, speed_normal, speed_slow, easing

### Layout Files (HTML templates)
- **_layouts/default.html** - Base page layout (header, nav, footer)

### Page Files (HTML)
- **index.html** - Homepage structure
- **services.html**, **projects.html**, **contact.html**, **book.html**

## Request Routing Guide

When user mentions:
- "color", "theme", "palette", "dark", "light" → theme.colors.*
- "font", "typography", "text size" → theme.typography.*
- "rounded", "corners", "radius" → theme.borders.* or theme.buttons.border_radius
- "shadow" → theme.shadows.*
- "spacing", "padding", "width" → theme.layout.*
- "button style" → theme.buttons.*
- "phone", "email", "services", "projects" → root YAML fields (not theme)
- "navigation", "header", "footer" → _layouts/default.html (HTML structure only)
- "makeover", "redesign", "rework", "modernize", "advanced UI" → full multi-file design overhaul (theme + CSS + layout/page structure)

## Redesign Autonomy
For makeover/redesign requests, proactively:
- Apply cohesive visual direction across colors, typography, spacing, and component styling
- Introduce advanced effects (gradients, layered shadows, soft glows, depth) when appropriate
- Improve page hierarchy and structure for better UX
- Add supportive imagery patterns (hero visuals, section visuals, decorative backgrounds)
- Make responsive-friendly decisions without requiring per-detail user instructions

## Clarification Triggers

Ask for clarification when:
- Color request without specific value (e.g., "change the color" - to what?)
- Multiple colors mentioned without specifying which (primary vs secondary)
- Vague requests like "make it look better"

Do NOT over-ask for clarification on redesign/makeover requests; assume user wants high-creativity execution.
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
    question: 'Do you want to change the button text/label or its appearance (color, size, rounded)?'
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
  SITE_KNOWLEDGE
};
