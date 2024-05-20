/**
 * Removes all elements with the specified class name.
 */
function removeElementsByClass(className) {
  let elements = document.getElementsByClassName(className);
  while (elements.length > 0) {
    elements[0].parentNode.removeChild(elements[0]);
  }
}

/**
 * Creates a message div with the specified message and role.
 */
function createMessageDiv(message, role) {
  const messageDiv = document.createElement("div");
  messageDiv.className = "message";

  const image = createImageElement(
    "/static/img/mindsdb_label.svg",
    "MindsDB",
    "icon"
  );
  const formattedMessage = markdownToHtml(message);
  const p = createParagraphElement(formattedMessage);
  p.classList.add("message_content");

  if (role === "assistant" || role === "error" || role === "loading") {
    messageDiv.appendChild(image);
  }
  messageDiv.appendChild(p);
  messageDiv.classList.add(role);
  if (role === "loading") {
    addLoadingIndicator(p);
    messageDiv.classList.add("temp");
  }
  return messageDiv;
}

/**
 * Scrolls to the start of the last message.
 */
function scroll() {
  const containerElement = document.getElementById("chat_container");
  const lastChildHeight = containerElement.lastChild.scrollHeight + 20;
  window.scrollTo(0, containerElement.scrollHeight - lastChildHeight);
}

// Message Handling
let timeout;

/**
 * Sends a user query to the server.
 */
function sendQuery() {
  let message = document.getElementById("query").textContent.trim();
  if (!message || document.getElementById("send_button").disabled) return;

  loading(message);
  postMessageToServer(message);
}

/**
 * Displays a loading indicator and modifies the UI to reflect the sending state.
 */
function loading(message) {
  disableSendButton();
  const userMessageDiv = createMessageDiv(message, "user");
  document.getElementById("chat_container").appendChild(userMessageDiv);
  scroll();
  simulateLoadingPhase();
}

/**
 * Resets the send button to its default state after a message is sent.
 */
function resetInput() {
  clearTimeout(timeout);
  enableSendButton();
}

/**
 * Renders the most recent message received in the chat.
 */
function renderLastMessages(data) {
  const message = data[data.length - 1];
  const messageDiv = createMessageDiv(message.content, message.role);
  document.getElementById("chat_container").appendChild(messageDiv);
  scroll();
}

// Event Listeners

/**
 * Sets up event listeners for the chat interface.
 */
function setupEventListeners() {
  document.getElementById("query").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendQuery();
    }
  });
  document.getElementById("query").addEventListener("paste", (e) => {
    e.preventDefault();
    let text = e.clipboardData.getData("text/plain");
    document.execCommand("insertHTML", false, text);
  });

  setTimeout(function () {
    document.getElementById("query").focus();
  }, 100);
}

// Helper Functions

/**
 * Creates and returns an image element with the specified attributes.
 */
function createImageElement(src, alt, className) {
  const image = document.createElement("img");
  image.src = src;
  image.alt = alt;
  image.className = className;
  return image;
}

/**
 * Converts Markdown text to HTML.
 */
function markdownToHtml(text) {
  const md = markdownit({ html: false, linkify: true, typographer: true });
  return md.render(text);
}

/**
 * Creates and returns a paragraph element with the specified inner HTML.
 */
function createParagraphElement(htmlContent) {
  const p = document.createElement("p");
  p.innerHTML = htmlContent;
  return p;
}

/**
 * Adds a loading indicator to the provided paragraph element.
 */
function addLoadingIndicator(p) {
  const loadingDiv = document.createElement("div");
  loadingDiv.id = "wave";
  for (let i = 0; i < 3; i++) {
    let dot = document.createElement("span");
    dot.className = "dot";
    loadingDiv.appendChild(dot);
  }
  p.appendChild(loadingDiv);
}

/**
 * Disables the send button and shows a spinner.
 */
function disableSendButton() {
  document.getElementById("send_button").disabled = true;
  document.getElementById("send_button").innerHTML = "";
  const spinner = createImageElement("/static/img/spin_icon.svg", "", "spin");
  document.getElementById("send_button").appendChild(spinner);
  document.getElementById("query").textContent = "";
}

/**
 * Enables the send button and restores its default appearance.
 */
function enableSendButton() {
  document.getElementById("send_button").disabled = false;
  document.getElementById("send_button").innerHTML = "";
  const sendIcon = createImageElement("/static/img/send_icon.svg", "", "send");
  document.getElementById("send_button").appendChild(sendIcon);
}

/**
 * Simulates a loading phase by adding a temporary loading message after a short delay.
 */
function simulateLoadingPhase() {
  timeout = setTimeout(() => {
    let loadingMessageDiv = createMessageDiv("", "loading");
    document.getElementById("chat_container").appendChild(loadingMessageDiv);
    scroll();
  }, 800);
}

/**
 * Posts the user's message to the server and handles the response.
 */
function postMessageToServer(message) {
  const formData = new FormData();
  formData.append("message", message);
  fetch("/send", { method: "POST", body: formData })
    .then((response) => response.json())
    .then((data) => {
      resetInput();
      removeElementsByClass("temp");
      renderLastMessages(data);
      document.getElementById("query").focus();
    })
    .catch((error) => {
      console.error("Error:", error);
      resetInput();
    });
}

// Initialize the application
setupEventListeners();
