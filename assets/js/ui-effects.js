(function initUiEffects() {
  const root = document.documentElement;
  const reduceMotion = root.classList.contains('reduce-motion');

  const revealNodes = document.querySelectorAll('.reveal');
  if (revealNodes.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    revealNodes.forEach((node) => observer.observe(node));
  }

  if (!reduceMotion) {
    const tiltNodes = document.querySelectorAll('[data-tilt]');
    tiltNodes.forEach((node) => {
      node.addEventListener('mousemove', (event) => {
        const rect = node.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        const rotateY = (x - 0.5) * 8;
        const rotateX = (0.5 - y) * 8;
        node.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
      });

      node.addEventListener('mouseleave', () => {
        node.style.transform = '';
      });
    });

    const parallaxImage = document.querySelector('[data-parallax]');
    if (parallaxImage) {
      window.addEventListener('scroll', () => {
        const y = Math.min(window.scrollY * 0.06, 28);
        parallaxImage.style.transform = `translateY(${y}px)`;
      });
    }
  }
})();
