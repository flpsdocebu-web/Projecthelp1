const destinations = {
  helps: "/login/",
  itrack: "#",
};

const notice = document.querySelector(".notice");
let noticeTimer;

document.querySelectorAll("[data-program]").forEach((card) => {
  const destination = destinations[card.dataset.program];
  card.href = destination;

  card.addEventListener("click", (event) => {
    if (destination !== "#") return;

    event.preventDefault();
    window.clearTimeout(noticeTimer);
    notice.hidden = false;
    noticeTimer = window.setTimeout(() => {
      notice.hidden = true;
    }, 3000);
  });
});
