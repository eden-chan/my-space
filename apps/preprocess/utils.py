import json
import re
from pprint import pprint
from openai import OpenAI

COLLECTION_NAME="PreprocessedPdf"
DATABASE_NAME = "paper"


# Extract structured data from natural language
client = OpenAI()
def get_embedding(text):
    response = client.embeddings.create(
    input="Your text string goes here",
    model="text-embedding-3-small"
    )
    embedding = response.data[0].embedding
    return embedding


# https://github.com/anthropics/anthropic-cookbook/blob/main/misc/how_to_enable_json_mode.ipynb
def extract_json(response):
    json_start = response.index("{")
    json_end = response.rfind("}")
    return json.loads(response[json_start:json_end + 1])


ANTHROPIC_JSON_PREFILL =  {
            "role": "assistant",
            "content": "Here is the JSON requested:\n{"
        }

def extract_between_tags(tag: str, string: str, strip: bool = False) -> list[str]:
    ext_list = re.findall(f"<{tag}>(.+?)</{tag}>", string, re.DOTALL)
    if strip:
        ext_list = [e.strip() for e in ext_list]
    return ext_list
