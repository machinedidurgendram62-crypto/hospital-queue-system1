function getToken() {
  fetch("/token", { method: "POST" })
    .then(res => res.json())
    .then(data => {
      document.getElementById("myToken").innerText =
        "Your Token Number: " + data.token;
    });
}

function callNext() {
  fetch("/next", { method: "POST" })
    .then(res => res.json())
    .then(updateDisplay);
}

function resetQueue() {
  fetch("/reset", { method: "POST" })
    .then(res => res.json())
    .then(updateDisplay);
}

function updateDisplay(data) {
  if (document.getElementById("currentDisplay")) {
    document.getElementById("currentDisplay").innerText =
      "Now Serving Token: " + data.current;
  }
}

// Auto refresh current token every 2 seconds
setInterval(() => {
  fetch("/status")
    .then(res => res.json())
    .then(updateDisplay);
}, 2000);