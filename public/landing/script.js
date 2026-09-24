const destinations = {
  helps: "/login1/",
  itrack: "https://itrack.sdocebuprovince.com/",
};

const notice = document.querySelector(".notice");
const noticeMessage = document.querySelector(".notice-message");
const installButton = document.querySelector(".install-app-button");
let noticeTimer;
let installPrompt;

const showNotice = (message) => {
  window.clearTimeout(noticeTimer);
  noticeMessage.textContent = message;
  notice.hidden = false;
  noticeTimer = window.setTimeout(() => { notice.hidden = true; }, 6500);
};

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
});

window.addEventListener("appinstalled", () => {
  installPrompt = undefined;
  installButton.hidden = true;
  showNotice("Project HELPS was installed successfully.");
});

installButton.addEventListener("click", async () => {
  if (window.matchMedia("(display-mode: standalone)").matches) {
    showNotice("Project HELPS is already open as an installed app.");
    return;
  }
  if (installPrompt) {
    await installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = undefined;
    return;
  }
  const agent = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(agent)) {
    showNotice("On iPhone or iPad: open this website in Safari, tap Share, then tap Add to Home Screen.");
  } else if (/android/.test(agent)) {
    showNotice("On Android: open the browser menu, then tap Install app or Add to Home screen.");
  } else if (agent.includes("mac")) {
    showNotice("On Mac: open in Safari, choose Share, then Add to Dock.");
  } else {
    showNotice("On Windows: open the browser menu, choose Apps, then Install this site as an app. Afterward, pin it to the taskbar.");
  }
});

document.querySelectorAll("[data-program]").forEach((card) => {
  const destination = destinations[card.dataset.program];
  card.href = destination;
  card.target = "_top";

  card.addEventListener("click", (event) => {
    if (destination !== "#") return;

    event.preventDefault();
    showNotice("Destination link is ready to be added.");
  });
});
