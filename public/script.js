function getToken() {
  fetch("/token", { method: "POST" })
    .then(res => res.json())
    .then(data => {
      document.getElementById("myToken").innerText = data.tokenNumber;
      document.getElementById("queuePosition").innerText = data.queuePosition;
      document.getElementById("waitingTime").innerText =
        data.estimatedWaitingTime + " minutes";
    });
}

function loadStatus() {
  fetch("/status")
    .then(res => res.json())
    .then(data => {
      document.getElementById("currentDisplay").innerText =
        data.currentToken;
    });
}

setInterval(loadStatus, 3000);
loadStatus();