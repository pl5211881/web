if (!("IntersectionObserver" in window)) {
  document.querySelectorAll(".reveal").forEach((item) => item.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14 }
  );

  document.querySelectorAll(".reveal").forEach((item, index) => {
    item.style.transitionDelay = `${Math.min(index * 55, 260)}ms`;
    revealObserver.observe(item);
  });

  const sections = [...document.querySelectorAll("main section[id]")];
  const navLinks = [...document.querySelectorAll(".site-nav a")];

  const navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
          link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`);
        });
      });
    },
    { rootMargin: "-42% 0px -50% 0px", threshold: 0 }
  );

  sections.forEach((section) => navObserver.observe(section));
}

const cursorOrb = document.querySelector(".cursor-orb");

if (cursorOrb && window.matchMedia("(pointer: fine)").matches) {
  window.addEventListener("pointermove", (event) => {
    cursorOrb.style.left = `${event.clientX}px`;
    cursorOrb.style.top = `${event.clientY}px`;
  });

  document.querySelectorAll(".project-card").forEach((card) => {
    card.addEventListener("pointerenter", () => cursorOrb.classList.add("is-visible"));
    card.addEventListener("pointerleave", () => cursorOrb.classList.remove("is-visible"));
  });
}
