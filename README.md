# Database Mind DEMO

This project is a demo designed to help developers get started with building applications that utilize large language models (LLMs) and data from a database. Feel free to take this code, clone it, and make it your own. We can't wait to see the amazing applications you build!

## Installation:
To run this project, you'll need Python 3 installed on your system. 

Clone this repository to your local machine using: 

``` git clone git@github.com:mindsdb/mdb-text2sql-example.git ```

``` cd mdb-text2sql-example/ ```

Create a virtual environment, execute the following command: 

``` python3 -m venv .venv ``` 

Activate the virtual environment by running: 

``` source .venv/bin/activate ``` 

Install dependencies using pip: 

``` pip3 install -r requirements.txt ``` 

## Configuration:

Go to https://mdb.ai/ register and login for generating a MindsDB API key.

Create and .env file and add your MindsDB API KEY:

``` MINDSDB_API_KEY=your_api_key ```

Add your database credentials to the .env file:

``` DATABASE_USER=database_user
DATABASE_PASSWORD=database_password
DATABASE_HOST=database_host
DATABASE_PORT=database_port
DATABASE_DATABASE=database_name
DATABASE_SCHEMA=database_schema
```

## Running:
To run the project, execute the following command: 
``` python3 app.py ```

## Usage:
In your browser go to 
``` http://localhost:8000/ ```

