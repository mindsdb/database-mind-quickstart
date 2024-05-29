const IS_COMPLETION = window.location.href.includes('/completion');

// Removes all elements with the specified class name from the DOM.
function removeElementsByClass(className) {
  let elements = document.getElementsByClassName(className);
  while (elements.length > 0) {
    elements[0].parentNode.removeChild(elements[0]);
  }
}

/**
 * Creates an HTML div element representing a chat message.
 * @param {string} message - The content of the message.
 * @param {string} role - The role of the sender (e.g., "user", "assistant", "error", "loading").
 * @returns {HTMLDivElement} The created message div element.
 */
function createMessageDiv(message, role) {
  // Create the main message div element.
  const messageDiv = document.createElement("div");
  messageDiv.className = "message";

  // Create the MindsDB icon element.
  const image = createImageElement(
    "/static/img/mindsdb_label.svg",
    "MindsDB",
    "icon"
  );

  // Convert markdown to HTML for the message content.
  const formattedMessage = markdownToHtml(message);

  // Create the paragraph element for the message content.
  const p = createParagraphElement(formattedMessage);
  p.classList.add("message_content");

  // Add the MindsDB icon for assistant, error, and loading messages.
  if (role === "assistant" || role === "error" || role === "loading") {
    messageDiv.appendChild(image);
  }

  // Add the message content to the message div.
  messageDiv.appendChild(p);

  // Add the role as a class to the message div.
  messageDiv.classList.add(role);

  // Add loading indicator for loading messages.
  if (role === "loading") {
    addLoadingIndicator(p);
    messageDiv.classList.add("temp"); // Add a temporary class for easy removal.
  }

  return messageDiv;
}

/**
 * Scrolls the chat container to the bottom.
 */
function scroll() {
  const containerElement = document.getElementById("chat_container");
  // Calculate the scroll position to accommodate the last message.
  const lastChildHeight = containerElement.lastChild.scrollHeight + 20;
  window.scrollTo(0, containerElement.scrollHeight - lastChildHeight);
}

// Initialize timeout variables.
let timeout;
let loadingTimeout;

/**
 * Sends the user's query to the server.
 */
function sendQuery() {
  // Get the user's query from the input field.
  let message = document.getElementById("query").textContent.trim();

  // Return if the message is empty or the send button is disabled.
  if (!message || document.getElementById("send_button").disabled) return;

  // Initiate the loading phase.
  loading(message);

  // Send the message to the server.
  postMessageToServer(message);
}

/**
 * Handles the loading phase before the server response.
 * @param {string} message - The user's query.
 */
function loading(message) {
  // Disable the send button to prevent multiple submissions.
  disableSendButton();

  // Create a user message div and append it to the chat container.
  const userMessageDiv = createMessageDiv(message, "user");
  document.getElementById("chat_container").appendChild(userMessageDiv);

  // Scroll to the bottom to show the user's message.
  scroll();

  // Simulate the loading phase with a delay and loading messages.
  simulateLoadingPhase();

  document.getElementById("request_stats").style.visibility = "hidden";

}

/**
 * Resets the input field and enables the send button.
 */
function resetInput() {
  clearTimeout(timeout);
  clearTimeout(loadingTimeout);
  last_list = 'execution';
  enableSendButton();
}

/**
 * Renders the last message from the server response.
 * @param {Array} data - The server response data containing message objects.
 */
function renderLastMessages(data) {
  const message = data[data.length - 1];
  const messageDiv = createMessageDiv(message.content, message.role);
  document.getElementById("chat_container").appendChild(messageDiv);
  scroll();
}

/**
 * Renders completion information like token usage from the server response.
 * @param {Array} data - The server response data containing message objects.
 */
function renderCompletionInfo(data) {
  const message = data[data.length - 1];
  document.getElementById("prompt_tokens").innerHTML = `${message['usage']['prompt_tokens']} tokens`;
  document.getElementById("completion_tokens").innerHTML = `${message['usage']['completion_tokens']} tokens`;
  document.getElementById("total_tokens").innerHTML = `${message['usage']['total_tokens']} tokens`;
  document.getElementById("request_stats").style.visibility = "visible";
}

/**
 * Creates a log message in the chat container.
 * @param {string} message - The log message.
 */
function createLogMessage(message) {
  const p = createParagraphElement(message);
  p.classList.add("log");
  document.getElementById("chat_container").appendChild(p);
}

/**
 * Sets up event listeners for user interactions.
 */
function setupEventListeners() {
  // Send message when Enter is pressed (without Shift).
  document.getElementById("query").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendQuery();
    }
  });

  // Handle pasting text into the input field.
  document.getElementById("query").addEventListener("paste", (e) => {
    e.preventDefault();
    let text = e.clipboardData.getData("text/plain");
    document.execCommand("insertHTML", false, text);
  });

  // Focus on the input field after a short delay.
  setTimeout(function () {
    document.getElementById("query").focus();
  }, 100);

  // Get available models if on the completion page.
  if (IS_COMPLETION) {
    getModels();
  }
}

/**
 * Creates an HTML image element.
 * @param {string} src - The source URL of the image.
 * @param {string} alt - The alternative text for the image.
 * @param {string} className - The CSS class name for the image.
 * @returns {HTMLImageElement} The created image element.
 */
function createImageElement(src, alt, className) {
  const image = document.createElement("img");
  image.src = src;
  image.alt = alt;
  image.className = className;
  return image;
}

/**
 * Converts markdown text to HTML using markdown-it library.
 * @param {string} text - The markdown text to convert.
 * @returns {string} The converted HTML string.
 */
function markdownToHtml(text) {
  try {
    const md = markdownit({ html: false, linkify: true, typographer: true });
    return md.render(text);
  } catch (err) {
    return text; // Return the original text if markdown conversion fails.
  }
}

/**
 * Creates an HTML paragraph element with the given content.
 * @param {string} htmlContent - The HTML content for the paragraph.
 * @returns {HTMLParagraphElement} The created paragraph element.
 */
function createParagraphElement(htmlContent) {
  const p = document.createElement("p");
  p.innerHTML = htmlContent;
  return p;
}

/**
 * Adds a loading indicator to the given paragraph element.
 * @param {HTMLParagraphElement} p - The paragraph element to add the loading indicator to.
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
 * Disables the send button and replaces it with a loading spinner.
 */
function disableSendButton() {
  document.getElementById("send_button").disabled = true;
  document.getElementById("send_button").innerHTML = "";
  const spinner = createImageElement("/static/img/spin_icon.svg", "", "spin");
  document.getElementById("send_button").appendChild(spinner);
  document.getElementById("query").textContent = "";
}

/**
 * Enables the send button and sets its icon.
 */
function enableSendButton() {
  document.getElementById("send_button").disabled = false;
  document.getElementById("send_button").innerHTML = "";
  const sendIcon = createImageElement("/static/img/send_icon.svg", "", "send");
  document.getElementById("send_button").appendChild(sendIcon);
}

/**
 * Simulates the loading phase with a delay and loading messages.
 */
function simulateLoadingPhase() {
  timeout = setTimeout(() => {
    let loadingMessageDiv = createMessageDiv("", "loading");
    document.getElementById("chat_container").appendChild(loadingMessageDiv);
    scroll();
  }, 800);
  // Only display loading messages if not on the completion page.
  if (!IS_COMPLETION) {
    let randomTime = Math.floor(Math.random() * 5) + 8;
    console.log(randomTime)
    loadingTimeout = setInterval(() => {
      const message = getRandomLoadingMessage();
      createLogMessage(message);
      scroll();
    }, randomTime * 1000);
  }
}

/**
 * Sends the user's message to the server.
 * @param {string} message - The user's message.
 * @param {string} [model] - The selected model (for completion requests).
 */
function postMessageToServer(message, model) {
  const formData = new FormData();
  formData.append("message", message);
  let endpoint = '/send';

  if (IS_COMPLETION) {
    let model = document.getElementById("model_select").value;
    formData.append("model", model);
    endpoint = '/send_completion';
  }

  fetch(endpoint, { method: "POST", body: formData })
    .then((response) => response.json())
    .then((data) => {
      resetInput();
      removeElementsByClass("temp");
      renderLastMessages(data);
      renderCompletionInfo(data);
      console.log('========')
      console.log("Content: ", data[0]['content']);
      console.log("Model: ", data[0]['model']);
      console.log("Usage: ", data[0]['usage']);
      document.getElementById("query").focus();
    })
    .catch((error) => {
      console.error("Error:", error);
      resetInput();
    });
}

/**
 * Fetches the available models from the server and populates the model select element.
 */
function getModels() {
  fetch("/models", { method: "POST" })
    .then((response) => response.json())
    .then((data) => {
      let select = document.getElementById("model_select");
      select.innerHTML = "";
      for (let i in data) {
        // Skip the "text-embedding-ada-002" model.
        if (data[i] == "text-embedding-ada-002") continue;
        let option = document.createElement("option");
        option.value = data[i];
        option.innerHTML = data[i];
        select.appendChild(option);
      }
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

let last_list = 'execution';

/**
 * Returns a random loading message.
 * @returns {string} A random loading message.
 */
function getRandomLoadingMessage() {
    if(last_list == 'execution'){
        const randomIndex = Math.floor(Math.random() * queriesMessages.length);
        last_list = 'queries'
        return queriesMessages[randomIndex];
    }else{
        const randomIndex = Math.floor(Math.random() * executionMessages.length);
        last_list = 'execution'
        return executionMessages[randomIndex];
    }

}

// Initialize the application.
setupEventListeners();
