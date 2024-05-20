import os
from dotenv import load_dotenv
from flask import Flask, render_template, request, redirect, url_for
import mindsdb_sdk
from openai import OpenAI
import json
import logging

# Configure logging to ignore Werkzeug's default logging messages
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

# Load environment variables from a .env file
load_dotenv()

# Get the MindsDB API Key from the environment variables
mindsdb_api_key = os.getenv('MINDSDB_API_KEY')

# If the MindsDB API Key is not found, print an error message and exit
if not mindsdb_api_key:
    print("Please create a .env file and add your MindsDB API Key")
    exit()

# Create a Flask application instance
app = Flask(__name__, static_folder='static', template_folder='templates')

# Initialize an empty list to hold the chat messages
chat = []

# Create an instance of the OpenAI client with the MindsDB API Key and endpoint
client = OpenAI(
   api_key=mindsdb_api_key,
   base_url="https://llm.mdb.ai"  # Set MindsDB inference endpoint as the base URL
)

# Define the route for the home page
@app.route('/')
def index():
    global chat
    chat = []  # Reset the chat messages
    return render_template('index.html')  # Render the index.html template

# Define the route for sending a message
@app.route('/send', methods=['POST'])
def send():
    global chat
    message = request.form['message']  # Get the message from the form
    model = request.form.get('model') or "codellama-70b"  # Default to "codellama-70b" if no model is provided
    try:
        # Append the user's message to the chat list
        new_message = {"role": "user", "content": message}
        chat.append(new_message)
        print("Sending to API:")
        print(chat)
        
        # Send the chat messages to the API and get the response
        response = client.chat.completions.create(
            model=model,
            messages=chat,
        )
        print("Got response:")
        print(response)
        
        # Append the assistant's response to the chat list
        chat.append({
            "role": "assistant", 
            "content": response.choices[0].message.content, 
            "model": response.model,
            "usage": {
                "completion_tokens": response.usage.completion_tokens, 
                "prompt_tokens": response.usage.prompt_tokens, 
                "total_tokens": response.usage.total_tokens
            }
        })
    except Exception as e:
        # Handle different types of errors and append error messages to the chat list
        print(e)
        if e.code == 400:
            chat.append({"role": "error", "content": "Model not found. Please use one of our supported models https://docs.mdb.ai/docs/models"})
        if e.code == 401:
            chat.append({"role": "error", "content": "Invalid MindsDB API Key, please verify your API key and update your .env file."})
        if e.code == 429:
            chat.append({"role": "error", "content": "You have reached your message limit! Please try again later."})
        elif e.code == 500:
            chat.append({"role": "error", "content": "Internal system error. Please try again later."})

    # Return the updated chat list
    return chat  

# Run the Flask application
if __name__ == '__main__':
    app.run(port=8000, debug=True)