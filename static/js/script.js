const IS_LLM = window.location.href.includes('/llm');
let history;
if(IS_LLM){
  history = localStorage.getItem('history');
  try{
  history = JSON.parse(history)
  }catch(err){
    history = [];
  }
  renderStoredConversation(history);
}

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
function createMessageDiv(message, role, data) {
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
  if(role ==='assistant' && data['usage']){
    const container = document.createElement("div");
    container.appendChild(messageDiv);
    const infoDiv = document.createElement("div");
    infoDiv.className = "request_stats";
    let html = `Model: <span id="model">${data['model']}</span> | Prompt: <span id="prompt_tokens">${data['usage']['prompt_tokens']}</span> | Completion: <span id="completion_tokens">${data['usage']['completion_tokens']}</span> | Total: <span id="total_tokens">${data['usage']['total_tokens']}</span>`;
    infoDiv.innerHTML = html;
    container.appendChild(infoDiv);
    return container
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
let loadingTimeout1;
let loadingTimeout2;

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

}

/**
 * Resets the input field and enables the send button.
 */
function resetInput() {
  clearTimeout(timeout);
  clearTimeout(loadingTimeout1);
  clearTimeout(loadingTimeout2);
  enableSendButton();
}

function renderStoredConversation(history){
  for (let i = 0; i < history.length; i++) {
    renderLastMessages([history[i]])
  }
}

/**
 * Renders the last message from the server response.
 * @param {Array} data - The server response data containing message objects.
 */
function renderLastMessages(data) {
  const message = data[data.length - 1];
  const messageDiv = createMessageDiv(message.content, message.role, message);
  document.getElementById("chat_container").appendChild(messageDiv);
  scroll();
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
  if (IS_LLM) {
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
  if (!IS_LLM) {
    let randomTime = Math.floor(Math.random() * (13 - 5 + 1)) + 5; 
    loadingTimeout1 = setTimeout(() => {
      const message = getRandomLoadingMessage(queriesMessages);
      createLogMessage(message);
      scroll();
    }, randomTime * 1000);
    randomTime = randomTime + Math.floor(Math.random() * (13 - 5 + 1)) + 5; 
    loadingTimeout2 = setTimeout(() => {
      const message = getRandomLoadingMessage(executionMessages);
      createLogMessage(message);
      scroll();
    }, randomTime * 1000);
  }
}

/**
 * Sends the user's message to the server.
 * @param {string} message - The user's message.
 */
function postMessageToServer(message) {
  const formData = new FormData();
  formData.append("message", message);
  let endpoint = '/send';

  if (IS_LLM) {
    let model = document.getElementById("model_select").value;
    formData.append("model", model);
    endpoint = '/send_llm';
    history.push({"role": "user", "content": message});
    localStorage.setItem('history',JSON.stringify(history));
    formData.append("history", JSON.stringify(history));
  }

  fetch(endpoint, { method: "POST", body: formData })
    .then((response) => response.json())
    .then((data) => {
      if(data[0] && 'role' in data[0] && data[0]['role']!='error'){
        history.push({"role": "assistant", "content": data[0]['content'], "model": data[0]['model'], "usage": data[0]['usage']});
        localStorage.setItem('history',JSON.stringify(history));
      }
      resetInput();
      removeElementsByClass("temp");
      renderLastMessages(data);
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

function resetConversation(){
  history = [];
  const div = document.createElement("div");
  div.className = "new_session";
  div.innerHTML = `<div class="line"></div>New session started<div class="line"></div>`;
  document.getElementById("chat_container").innerHTML = '';
  document.getElementById("chat_container").appendChild(div);
}

/**
 * Returns a random loading message.
 * @returns {string} A random loading message.
 */
function getRandomLoadingMessage(array) {
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}

// Initialize the application.
setupEventListeners();
