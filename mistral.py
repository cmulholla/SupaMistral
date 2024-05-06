import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
import pandas as pd
import numpy as np
import argparse

# Set up the argument parser
parser = argparse.ArgumentParser(description="Generate responses using Mistral")
parser.add_argument("--additional-context", type=str, help="Additional context to add to the start of the conversation")
parser.add_argument("--input-text", type=str, help="The text to generate a response to")
parser.add_argument("--precision", type=str, help="The precision to use (fp16, fp8, fp4)")
args = parser.parse_args()

# Initialize the tokenizer and model
#model_id = "mistralai/Mistral-7B-Instruct-v0.2"
model_id = "teknium/OpenHermes-2-Mistral-7B"

print("Loading Tokenizer...")
tokenizer = AutoTokenizer.from_pretrained(model_id)
precision = args.precision
path="/mnt/n/AI/text-generation-webui-main/models/teknium_OpenHermes-2-Mistral-7B/"
#path=f"N:\\AI\\mistral-7B-instruct\\"

print("Loading model...")
print("Precision: ", precision)

if (precision == "fp16"):
    model = AutoModelForCausalLM.from_pretrained(path, torch_dtype=torch.float16).to("cuda")
elif (precision == "fp8"):
    model = AutoModelForCausalLM.from_pretrained(path, load_in_8bit=True, device_map='cuda')
elif (precision == "fp4"):
    model = AutoModelForCausalLM.from_pretrained(path, load_in_4bit=True, device_map='cuda')


additional_context = args.additional_context
#"[INST] The following is a conversation with an AI assistant. The assistant is helpful and concise. The assistant does not respond to the question, and only does as the question says. [/INST]"
# Generate outputs
def generate_response(text):
    try:
        print("Generating response...")
        # Append a prompt to the user's input
        inputs = tokenizer(text, return_tensors="pt").to("cuda")
        outputs = model.generate(**inputs, max_new_tokens=512, do_sample=True, use_cache=True, top_k=40, top_p=0.1, temperature=0.7, repetition_penalty=1.2, num_return_sequences=1, pad_token_id=tokenizer.eos_token_id, eos_token_id=tokenizer.eos_token_id, bos_token_id=tokenizer.bos_token_id)
        responseIn = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        #text = responseIn + "\n[INST] Please generate another sentence. [/INST]"
        #inputs = tokenizer(text, return_tensors="pt").to("cuda")
        #outputs = model.generate(**inputs, max_new_tokens=512, do_sample=True, use_cache=True, top_k=40, top_p=0.1, temperature=0.7, repetition_penalty=1.2, num_return_sequences=1, pad_token_id=tokenizer.eos_token_id, eos_token_id=tokenizer.eos_token_id, bos_token_id=tokenizer.bos_token_id)
        #responseIn = tokenizer.decode(outputs[0], skip_special_tokens=True)

        # Remove the prompt from the start of the response
        response = responseIn[len(text):]
    except Exception as e:
        response = "py: ERR"
        print(e)
    return response

# Generate a response to the input text
input_text = args.input_text
response = generate_response(input_text)
print(response)



# time taken for 240 records: 2 hours