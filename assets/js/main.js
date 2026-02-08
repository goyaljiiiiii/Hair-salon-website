const navToggle = document.querySelector(".nav-toggle");
const navList = document.querySelector("nav ul");

if (navToggle && navList) {
    navToggle.addEventListener("click", () => {
        const isOpen = navList.classList.toggle("is-open");
        navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    navList.addEventListener("click", (event) => {
        if (event.target.tagName === "A" && navList.classList.contains("is-open")) {
            navList.classList.remove("is-open");
            navToggle.setAttribute("aria-expanded", "false");
        }
    });
}
