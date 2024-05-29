const IS_COMPLETION = window.location.href.includes('/completion');

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
let loadingTimeout
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
  clearTimeout(loadingTimeout);
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

function renderCompletionInfo(data){
  const message = data[data.length - 1];
  document.getElementById("prompt_tokens").innerHTML = `${message['usage']['prompt_tokens']} tokens`;
  document.getElementById("completion_tokens").innerHTML = `${message['usage']['completion_tokens']} tokens`;
  document.getElementById("total_tokens").innerHTML = `${message['usage']['total_tokens']} tokens`;
  document.getElementById("request_stats").style.visibility = "visible";
}

function createLogMessage(message){
  const p = createParagraphElement(message);
  p.classList.add("log");
  document.getElementById("chat_container").appendChild(p);
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
  if(IS_COMPLETION){
    getModels();
  }
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
  try{
    const md = markdownit({ html: false, linkify: true, typographer: true });
    return md.render(text);
  }catch(err){
    return text;
  }
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

  if(!IS_COMPLETION){
    let randomTime = Math.floor(Math.random() * 5) + 15;
    loadingTimeout = setInterval(()=>{
      const message = getRandomLoadingMessage();
      createLogMessage(message);
      scroll();
    },randomTime*1000);
  }
}

/**
 * Posts the user's message to the server and handles the response.
 */
function postMessageToServer(message, model) {
  const formData = new FormData();
  formData.append("message", message);
  let endpoint = '/send';

  if(IS_COMPLETION){
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
      console.log("Content: ",data[0]['content']);
      console.log("Model: ",data[0]['model']);
      console.log("Usage: ",data[0]['usage']);
      document.getElementById("query").focus();
    })
    .catch((error) => {
      console.error("Error:", error);
      resetInput();
    });
}

function getModels() {
  fetch("/models", { method: "POST" })
    .then((response) => response.json())
    .then((data) => {
      let select = document.getElementById("model_select");
      select.innerHTML = "";
      for(let i in data){
        let option = document.createElement("option");
        if(data[i]=="text-embedding-ada-002") continue;
        option.value = data[i];
        option.innerHTML = data[i];
        select.appendChild(option);
      }
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

// Initialize the application
setupEventListeners();

function getRandomLoadingMessage(){
  const list = [
    "Converting your questions into SQL for maximum efficiency. Query execution imminent.",
    "Please stand by as I manipulate your inquiries into SQL commands. Query execution in progress.",
    "Converting your curiosity into SQL scripts. Brace yourself for the query execution.",
    "Querying your questions like a seasoned professional. SQL transformation complete, initiating query execution.",
    "Translating your inquiries into SQL language. Query execution approaching at a rapid pace.",
    "Converting your questions into SQL with precision and finesse. Ready for query execution.",
    "Your questions have been successfully transformed into SQL commands. Query execution about to commence.",
    "Analyzing and converting your inquiries into SQL queries. Prepare for query execution.",
    "Converting your questions into SQL code for optimal processing. Query execution imminent.",
    "Your questions have been successfully converted into SQL. Get ready for the epic query execution.",
  ];
  const randomIndex = Math.floor(Math.random() * list.length);
  return list[randomIndex];
}