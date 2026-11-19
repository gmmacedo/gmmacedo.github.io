(() => {
  const viewer = document.querySelector("#image-viewer");
  if (!viewer?.showModal) return;

  const stage = viewer.querySelector(".image-viewer-stage");
  const image = stage.querySelector("img");
  const caption = viewer.querySelector(".image-viewer-caption");
  const zoomIn = viewer.querySelector("[data-zoom-in]");
  const zoomOut = viewer.querySelector("[data-zoom-out]");
  const openLabel = viewer.dataset.openLabel;
  const maxZoom = 8;
  let scale = 1;
  let x = 0;
  let y = 0;
  let drag;
  let trigger;
  let pressedOutside = false;

  function render() {
    const limitX = Math.max(0, (image.offsetWidth * scale - stage.clientWidth) / 2);
    const limitY = Math.max(0, (image.offsetHeight * scale - stage.clientHeight) / 2);
    x = Math.max(-limitX, Math.min(limitX, x));
    y = Math.max(-limitY, Math.min(limitY, y));
    image.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    stage.classList.toggle("can-pan", limitX > 0 || limitY > 0);
    zoomOut.disabled = scale <= 1;
    zoomIn.disabled = scale >= maxZoom;
  }

  function zoom(factor, pointX = 0, pointY = 0) {
    const next = Math.max(1, Math.min(maxZoom, scale * factor));
    const ratio = next / scale;
    x = pointX + (x - pointX) * ratio;
    y = pointY + (y - pointY) * ratio;
    scale = next;
    render();
  }

  function open(source, button) {
    trigger = button;
    scale = 1;
    x = 0;
    y = 0;
    image.alt = source.alt;
    caption.textContent = source.dataset.imageViewerCaption ??
      source.closest("figure")?.querySelector("figcaption")?.textContent.trim() ?? "";
    caption.hidden = !caption.textContent;
    image.src = source.dataset.imageViewerSource || source.currentSrc || source.src;
    viewer.showModal();
    render();
  }

  for (const source of document.querySelectorAll(".content img, img[data-image-viewer-source]")) {
    if (source.closest("button")) continue;

    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-label", source.alt ? `${openLabel} — ${source.alt}` : openLabel);
    button.title = openLabel;
    button.addEventListener("click", () => open(source, button));

    const icon = document.createElement("span");
    icon.className = "image-zoom-icon";
    icon.setAttribute("aria-hidden", "true");

    const link = source.closest("a");
    if (link) {
      button.className = "image-zoom-button image-zoom-button-icon";
      link.after(button);
    } else {
      button.className = "image-zoom-button image-zoom-button-inline";
      source.before(button);
      button.append(source);
    }
    button.append(icon);
  }

  viewer.querySelector("[data-close]").addEventListener("click", () => viewer.close());
  zoomIn.addEventListener("click", () => zoom(1.5));
  zoomOut.addEventListener("click", () => zoom(1 / 1.5));
  image.addEventListener("load", render);
  new ResizeObserver(render).observe(stage);

  const isOutside = (target) => !target.closest("img, button, .image-viewer-caption");
  viewer.addEventListener("pointerdown", (event) => {
    pressedOutside = isOutside(event.target);
  });
  viewer.addEventListener("click", (event) => {
    if (pressedOutside && isOutside(event.target)) viewer.close();
    pressedOutside = false;
  });

  image.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || drag || !stage.classList.contains("can-pan")) return;
    image.setPointerCapture(event.pointerId);
    drag = { id: event.pointerId, x: event.clientX - x, y: event.clientY - y };
    stage.classList.add("is-panning");
  });
  image.addEventListener("pointermove", (event) => {
    if (drag?.id !== event.pointerId) return;
    x = event.clientX - drag.x;
    y = event.clientY - drag.y;
    render();
  });
  image.addEventListener("lostpointercapture", (event) => {
    if (drag?.id !== event.pointerId) return;
    drag = undefined;
    stage.classList.remove("is-panning");
  });

  stage.addEventListener("wheel", (event) => {
    event.preventDefault();
    const rect = stage.getBoundingClientRect();
    zoom(Math.exp(-event.deltaY * 0.002),
      event.clientX - rect.left - rect.width / 2,
      event.clientY - rect.top - rect.height / 2);
  }, { passive: false });

  viewer.addEventListener("keydown", (event) => {
    const step = 48;
    switch (event.key) {
      case "+":
      case "=": zoom(1.5); break;
      case "-": zoom(1 / 1.5); break;
      case "ArrowLeft": x += step; break;
      case "ArrowRight": x -= step; break;
      case "ArrowUp": y += step; break;
      case "ArrowDown": y -= step; break;
      default: return;
    }
    event.preventDefault();
    render();
  });

  viewer.addEventListener("close", () => {
    image.removeAttribute("src");
    caption.textContent = "";
    caption.hidden = true;
    drag = undefined;
    pressedOutside = false;
    stage.classList.remove("is-panning");
    trigger?.focus({ preventScroll: true });
    trigger = undefined;
  });
})();
