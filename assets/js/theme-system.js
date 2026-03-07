(function applyThemeSystem() {
  const themeConfigNode = document.getElementById('site-theme-config');
  const uiConfigNode = document.getElementById('site-ui-config');

  let theme = {};
  let ui = {};

  try {
    theme = JSON.parse(themeConfigNode?.textContent || '{}') || {};
  } catch {
    theme = {};
  }

  try {
    ui = JSON.parse(uiConfigNode?.textContent || '{}') || {};
  } catch {
    ui = {};
  }

  const root = document.documentElement;

  const varMap = {
    '--primary-color': theme?.colors?.primary,
    '--primary-dark': theme?.colors?.primary_dark,
    '--secondary-color': theme?.colors?.secondary,
    '--accent-color': theme?.colors?.accent,
    '--text-dark': theme?.colors?.text_dark,
    '--text-light': theme?.colors?.text_light,
    '--white': theme?.colors?.bg_white,
    '--bg-light': theme?.colors?.bg_light,
    '--border-color': theme?.colors?.border,

    '--shadow': theme?.shadows?.small,
    '--shadow-lg': theme?.shadows?.large,

    '--font-family': theme?.typography?.font_family,
    '--font-family-heading': theme?.typography?.font_family_heading,
    '--line-height': theme?.typography?.line_height,
    '--font-size-base': theme?.typography?.font_size_base,
    '--font-size-h1': theme?.typography?.font_size_h1,
    '--font-size-h2': theme?.typography?.font_size_h2,
    '--font-size-h3': theme?.typography?.font_size_h3,
    '--font-size-h4': theme?.typography?.font_size_h4,
    '--font-size-small': theme?.typography?.font_size_small,

    '--container-max-width': theme?.layout?.container_max_width,
    '--section-padding': theme?.layout?.section_padding,
    '--card-padding': theme?.layout?.card_padding,

    '--radius-small': theme?.borders?.radius_small,
    '--radius-medium': theme?.borders?.radius_medium,
    '--radius-large': theme?.borders?.radius_large,
    '--radius-pill': theme?.borders?.radius_pill,

    '--btn-radius': theme?.buttons?.border_radius,
    '--btn-padding': theme?.buttons?.padding,
    '--btn-font-weight': theme?.buttons?.font_weight,

    '--navbar-padding': theme?.navbar?.padding,

    '--transition-fast': theme?.transitions?.speed_fast,
    '--transition-normal': theme?.transitions?.speed_normal,
    '--transition-slow': theme?.transitions?.speed_slow,
    '--transition-easing': theme?.transitions?.easing
  };

  Object.entries(varMap).forEach(([name, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      root.style.setProperty(name, String(value));
    }
  });

  const density = ui?.density || 'comfortable';
  const surface = ui?.surface || 'glass';
  root.setAttribute('data-ui-density', density);
  root.setAttribute('data-ui-surface', surface);

  const effects = ui?.effects || {};
  if (effects.motion === false) {
    root.classList.add('reduce-motion');
  }
  if (effects.orbs !== false) {
    root.classList.add('fx-orbs');
  }
  if (effects.grid !== false) {
    root.classList.add('fx-grid');
  }
})();
