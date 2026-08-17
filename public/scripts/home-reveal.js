'use strict';
/**
 * home-reveal.js — Domain content reveal panel
 *
 * Watches the engine's data-stage attribute (set every frame by setStage()
 * in home-game.js, sourced from stageAt(x) in home-journey.js).
 * When the character walks into a domain segment, the panel populates
 * and reveals content with a staggered CSS animation:
 *   0 ms   → domain heading
 *   150 ms → description
 *   300 ms → skill chips
 *   450 ms → project card 1
 *   625 ms → project card 2   (175 ms apart)
 *   800 ms → project card 3
 *   …
 * Once a segment is revealed it stays visible on backtrack (no re-hide).
 */
(function () {
  var DOMAIN_KEYS = ['ai-ml', 'fullstack', 'iot-embedded', 'open-source', 'hackathons'];

  var SKILLS_MAP = {
    'ai-ml':        ['NumPy', 'Pandas', 'scikit-learn', 'TensorFlow/Keras', 'LangChain', 'Ollama', 'RAG Systems', 'Signal Processing', 'Python'],
    'fullstack':    ['Node.js', 'Express.js', 'MongoDB', 'Firebase', 'PostgreSQL'],
    'iot-embedded': ['Git/GitHub', 'Raspberry Pi', 'ESP32', 'Jupyter Notebook', 'Embedded C'],
    'open-source':  ['Python', 'Java', 'C/C++', 'JavaScript'],
    'hackathons':   ['React', 'Python', 'Gemini API', 'Flask', 'Rapid Prototyping'],
  };

  function dedup(arr) {
    var seen = {};
    return arr.filter(function (x) { return seen[x] ? false : (seen[x] = true); });
  }

  function init() {
    var root = document.querySelector('[data-home-game]');
    if (!root) return;

    var panel = document.getElementById('domain-reveal-panel');
    if (!panel) return;

    /* ── Read config ─────────────────────────────────────────────── */
    var config = {};
    try {
      var raw = document.getElementById('portfolio-config-data');
      if (raw) config = JSON.parse(raw.textContent || '{}');
    } catch (e) { /* config stays empty */ }

    var domainPaths = config.domainPaths   || [];
    var allProjects = config.featuredProjects || [];

    /* Build per-domain data bundle */
    var lookup = {};
    domainPaths.forEach(function (dp) {
      lookup[dp.id] = {
        label:       dp.label,
        description: dp.description,
        skills:      dedup(SKILLS_MAP[dp.id] || []).slice(0, 8),
        projects:    allProjects.filter(function (p) {
          return Array.isArray(p.tags) && p.tags.indexOf(dp.id) !== -1;
        }),
      };
    });

    /* ── Panel child refs ────────────────────────────────────────── */
    var headingEl  = panel.querySelector('.drp-heading');
    var descEl     = panel.querySelector('.drp-desc');
    var chipsEl    = panel.querySelector('.drp-chips');
    var projsEl    = panel.querySelector('.drp-projects');

    /* ── State ───────────────────────────────────────────────────── */
    var revealed    = {};   // key → true after first show
    var currentKey  = null;
    var hideTimer   = null;

    /* ── Build & show panel for a domain key ─────────────────────── */
    function buildPanel(key) {
      var d = lookup[key];
      if (!d) { hidePanel(); return; }

      /* Clear pending hide */
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      panel.removeAttribute('data-hiding');
      panel.hidden = true;

      /* Populate heading + description */
      headingEl.textContent = d.label;
      descEl.textContent    = d.description;

      /* Skill chips */
      chipsEl.innerHTML = '';
      d.skills.forEach(function (s) {
        var chip = document.createElement('span');
        chip.className   = 'skill-chip';
        chip.textContent = s;
        chipsEl.appendChild(chip);
      });

      /* Project cards */
      projsEl.innerHTML = '';
      d.projects.forEach(function (proj, idx) {
        var card  = document.createElement('div');
        card.className = 'drp-project';
        /* CSS custom property drives the per-card animation delay */
        card.style.setProperty('--card-delay', (450 + idx * 175) + 'ms');

        var title = document.createElement('strong');
        title.className   = 'drp-project__title';
        title.textContent = proj.title;

        var sub = document.createElement('span');
        sub.className   = 'drp-project__sub';
        sub.textContent = proj.subtitle;

        var desc = document.createElement('p');
        desc.className   = 'drp-project__desc';
        desc.textContent = proj.description;

        var tech = document.createElement('div');
        tech.className = 'drp-project__tech';
        (proj.tech || []).slice(0, 5).forEach(function (t) {
          var tag = document.createElement('span');
          tag.className   = 'tech-tag';
          tag.textContent = t;
          tech.appendChild(tag);
        });

        card.appendChild(title);
        card.appendChild(sub);
        card.appendChild(desc);
        card.appendChild(tech);

        if (proj.links && proj.links.github) {
          var link = document.createElement('a');
          link.href        = proj.links.github;
          link.target      = '_blank';
          link.rel         = 'noopener noreferrer';
          link.className   = 'drp-project__link';
          link.textContent = '↗ GitHub';
          card.appendChild(link);
        }

        projsEl.appendChild(card);
      });

      /* Animate on first reveal; instant swap on revisit */
      if (!revealed[key]) {
        revealed[key] = true;
        panel.removeAttribute('data-settled');
        panel.removeAttribute('data-animate');
        /* Force reflow so animation restarts cleanly */
        void panel.offsetWidth;
        panel.setAttribute('data-animate', '');
      } else {
        panel.removeAttribute('data-animate');
        panel.setAttribute('data-settled', '');
      }
    }

    /* ── Hide with slide-out transition ─────────────────────────── */
    function hidePanel() {
      if (panel.hidden) return;
      panel.setAttribute('data-hiding', '');
      hideTimer = setTimeout(function () {
        panel.hidden = true;
        panel.removeAttribute('data-hiding');
        hideTimer = null;
      }, 300);
    }

    /* ── React to stage change ───────────────────────────────────── */
    function onStageChange(newStage) {
      if (newStage === currentKey) return;
      currentKey = newStage;

      /* Non-domain transition zone (brink, fall-taupe, launch, hub…) */
      if (DOMAIN_KEYS.indexOf(newStage) === -1) {
        hidePanel();
        return;
      }

      buildPanel(newStage);
    }

    /* ── MutationObserver on data-stage ─────────────────────────── */
    var stageObserver = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        if (mutations[i].attributeName === 'data-stage') {
          onStageChange(root.getAttribute('data-stage') || '');
          break;
        }
      }
    });
    stageObserver.observe(root, { attributes: true, attributeFilter: ['data-stage'] });

    /* ── Hide when Act II opens / show when returning ────────────── */
    var linksObserver = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var attr = mutations[i].attributeName;
        if (attr === 'data-links' || attr === 'data-atlas') {
          var atlasOpen = root.getAttribute('data-links') === 'open'
                       || root.getAttribute('data-atlas') === 'active'
                       || root.getAttribute('data-atlas') === 'entering';
          if (atlasOpen) {
            hidePanel();
          } else if (currentKey && DOMAIN_KEYS.indexOf(currentKey) !== -1) {
            /* Returned from Act II — restore without re-animating */
            buildPanel(currentKey);
          }
          break;
        }
      }
    });
    linksObserver.observe(root, { attributes: true, attributeFilter: ['data-links', 'data-atlas'] });

    /* ── Seed with current stage if game already started ─────────── */
    var initial = root.getAttribute('data-stage') || '';
    if (initial) {
      currentKey = initial;
      if (DOMAIN_KEYS.indexOf(initial) !== -1) buildPanel(initial);
    }
  }

  /* Wait for DOM (scripts are deferred but this file is too) */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
