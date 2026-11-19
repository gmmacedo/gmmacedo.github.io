(() => {
  const toc = document.querySelector(".site-article-toc");
  if (!toc) return;

  const sections = Array.from(toc.querySelectorAll('a[href^="#"]'), (link) => ({
    link,
    heading: document.getElementById(decodeURIComponent(link.hash.slice(1))),
  })).filter((section) => section.heading);
  if (!sections.length) return;

  let activeLink;
  let scheduled = false;

  function update() {
    scheduled = false;
    const threshold = Math.min(160, window.innerHeight * 0.2);
    let active = sections[0];
    for (const section of sections) {
      if (section.heading.getBoundingClientRect().top > threshold) break;
      active = section;
    }
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) {
      active = sections[sections.length - 1];
    }
    if (active.link === activeLink) return;

    activeLink?.removeAttribute("aria-current");
    activeLink = active.link;
    activeLink.setAttribute("aria-current", "location");

    // Keep the active entry visible inside the desktop's scrollable TOC.
    if (getComputedStyle(toc).position === "sticky") {
      const bounds = toc.getBoundingClientRect();
      const linkBounds = activeLink.getBoundingClientRect();
      if (linkBounds.top < bounds.top) toc.scrollTop += linkBounds.top - bounds.top;
      if (linkBounds.bottom > bounds.bottom) toc.scrollTop += linkBounds.bottom - bounds.bottom;
    }
  }

  function scheduleUpdate() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  }

  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);
  window.addEventListener("hashchange", scheduleUpdate);
  window.addEventListener("pageshow", scheduleUpdate);
  new ResizeObserver(scheduleUpdate).observe(document.querySelector(".site-prose"));
  update();
})();
