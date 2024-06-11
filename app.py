import os
from dotenv import load_dotenv
from flask import Flask, render_template, request, redirect, url_for
from mindsdb_sdk.utils.mind import create_mind
from openai import OpenAI
import json
import logging
import time

# Configure logging to ignore Werkzeug's default logging messages
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)
ts = str(int(time.time()))

# Load environment variables from a .env file
load_dotenv()

# Get the MindsDB API Key from the environment variables
mindsdb_api_key = os.getenv('MINDSDB_API_KEY')

#define base url
base_url = os.getenv('MINDSDB_API_URL', "https://llm.mdb.ai")
if base_url.endswith("/"):
    base_url = base_url[:-1]

#Get database connections details from environment variables
database_user = os.getenv('DATABASE_USER')
database_password = os.getenv('DATABASE_PASSWORD')
database_host = os.getenv('DATABASE_HOST')
database_port = os.getenv('DATABASE_PORT')
database_database = os.getenv('DATABASE_DATABASE')
database_schema = os.getenv('DATABASE_SCHEMA')


# If the MindsDB API Key is not found, print an error message and exit
if not mindsdb_api_key:
    print("Please create a .env file and add your MindsDB API Key")
    exit()

if not database_user or not database_password or not database_host or not database_port or not database_database or not database_schema:
    print("Please create a .env file and add your Database connection details")
    exit()

# Create a Flask application instance
app = Flask(__name__, static_folder='static', template_folder='templates')

# Create an instance of the OpenAI client with the MindsDB API Key and endpoint
client = OpenAI(
   api_key=mindsdb_api_key,
   base_url=base_url
)

# Mind arguments
model = 'gpt-4'  # This is the model used by MindsDB text to SQL, and is not limited by what our inference endpoints support.
connection_args = {
    'user': database_user,
    'password': database_password,
    'host': database_host,
    'port': database_port,
    'database': database_database,
    'schema': database_schema
}
data_source = 'postgres'
description = 'House Sales'
mind_name = 'my_house_data_mind_'+ts
print("Creating mind, please wait...")
# Create a mind
mind = create_mind(
    name = mind_name,
    base_url=base_url,
    api_key=mindsdb_api_key,
    model=model,
    data_source_connection_args=connection_args,
    data_source_type=data_source,
    description=description
)
print(f"Mind successfully created: {mind_name}")

# Define the route for the home page
@app.route('/')
def index():
    return render_template('index.html')  # Render the index.html template

# Define the route for the completions
@app.route('/llm')
def llm():
    return render_template('llm.html')  # Render the index.html template

# Define the route for sending a message
@app.route('/send', methods=['POST'])
def send():
    message = request.form['message']  # Get the message from the form
    res = [] 
    try:
        # Create the message object
        new_message = {"role": "user", "content": message}
        # Send the message to the API and get the response
        response = client.chat.completions.create(
            # The model provided must be the name of the mind.
            model=mind_name,
            messages=[new_message],
            stream=False
        )

        print("Got response:")
        print(response)
        if not response.choices[0].message.content:
            res.append({
                "role": "error", 
                "content": "Something went wrong please try again later.", 
                "model": response.model,
                "usage": {
                    "completion_tokens": response.usage.completion_tokens, 
                    "prompt_tokens": response.usage.prompt_tokens, 
                    "total_tokens": response.usage.total_tokens
                }
            })
        else:
            # Append the assistant's response to the res list
            res.append({
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
        # Handle different types of errors and append error messages to the res list
        print(e)
        if e.code == 400:
            res.append({"role": "error", "content": "Model not found. Please use one of our supported models https://docs.mdb.ai/docs/models"})
        if e.code == 401:
            res.append({"role": "error", "content": "Invalid MindsDB API Key, please verify your API key and update your .env file."})
        if e.code == 429:
            res.append({"role": "error", "content": "You have reached your message limit of 10 requests per minute per IP and, at most, 4 requests per IP in a 10-second period.  Please refer to the documentation for more details or contact us to raise your request limit."})
        elif e.code == 500:
            res.append({"role": "error", "content": "Internal system error. Please try again later."})

    # Return the updated res list
    return res  

@app.route('/send_llm', methods=['POST'])
def send_llm():
    message = request.form['message']  # Get the message from the form
    history = request.form.get('history') or False  # Get the history from the form
    model = request.form.get('model') or "gpt-3.5-turbo"  # Default to "gpt-3.5-turbo" if no model is provided
    print("Completing request using model: "+model)
    res = [] 
    try:
        # Create the message object
        new_message = [{"role": "user", "content": message}]
        if history and model != 'dbrx' and model != 'firefunction-v1' and model != 'firellava-13b' and model != 'hermes-2-pro':
            new_message = json.loads(history)
        print(new_message)
        # Send the message to the API and get the response
        response = client.chat.completions.create(
            model=model,   # This model is limited by what our inference endpoints support (only gpt-3.5-turbo for now).
            messages=new_message,
            stream=False
        )
        print("Got response:")
        print(response)
        
        # Append the assistant's response to the res list
        res.append({
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
        # Handle different types of errors and append error messages to the res list
        print(e)
        if e.code == 400:
            res.append({"role": "error", "content": "Model not found. Please use one of our supported models https://docs.mdb.ai/docs/models"})
        if e.code == 401:
            res.append({"role": "error", "content": "Invalid MindsDB API Key, please verify your API key and update your .env file."})
        if e.code == 429:
            res.append({"role": "error", "content": "You have reached your message limit of 10 requests per minute per IP and, at most, 4 requests per IP in a 10-second period.  Please refer to the documentation for more details or contact us to raise your request limit."})
        elif e.code == 500:
            res.append({"role": "error", "content": "Internal system error. Please try again later."})

    # Return the updated res list
    return res  

@app.route('/models', methods=['POST'])
def models():
    response = client.models.list()
    data = []
    for model in response:
        data.append(model.id)
    return data

# Run the Flask application
if __name__ == '__main__':
    print("App Running on 127.0.0.1:8000")
    app.run(port=8000, debug=False)

