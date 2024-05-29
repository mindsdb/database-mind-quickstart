from openai import OpenAI
from mindsdb_sdk.utils.openai import make_data_tool


# Connect to MindsDB LiteLLM proxy.
client = OpenAI(
    api_key='ee3f25b51dda641838b74717d9ad88b5c5eb6e31d6e7d8a217e32673a589e700',
    base_url='https://ai.dev.mindsdb.com'
)

# Connect example DB to MindsDB.
connection_args = {
    'user': 'demo_user',
    'password': 'demo_password',
    'host': 'samples.mindsdb.com',
    'port': '5432',
    'database': 'demo',
    'schema': 'demo_data'
}

postgres_tool = make_data_tool(
    # This is the model used by MindsDB text to SQL, and is not limited by what our inference endpoints support.
    'gpt-4',
    'postgres',
    'House sales',
    connection_args
)

# Actually pass in our tool to get a SQL completion.
completion = client.chat.completions.create(
  # This model is limited by what our inference endpoints support (only gpt-3.5-turbo for now).
  model='gpt-3.5-turbo',
  messages=[
    {'role': 'user', 'content': 'How many 2 bedroom houses sold in 2008?'}
  ],
  tools=[postgres_tool],
  tool_choice='required',
  stream=False
)

print(completion)