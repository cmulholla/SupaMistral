import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
import pandas as pd
import numpy as np

# Initialize the tokenizer and model
#model_id = "mistralai/Mistral-7B-Instruct-v0.2"
model_id = "teknium/OpenHermes-2-Mistral-7B"
tokenizer = AutoTokenizer.from_pretrained(model_id)
precision = "fp4-"
path=f"N:\\AI\\text-generation-webui-main\\models\\teknium_OpenHermes-2-Mistral-7B\\"
#path=f"N:\\AI\\mistral-7B-instruct\\"

# if the model variable exists, delete it to free up memory before loading the new model
if 'model' in locals():
    model = None

if (precision == "fp16"):
    model = AutoModelForCausalLM.from_pretrained(path, torch_dtype=torch.float16).to("cuda")
elif (precision == "fp8"):
    model = AutoModelForCausalLM.from_pretrained(path, load_in_8bit=True, device_map='cuda')
elif (precision == "fp4"):
    model = AutoModelForCausalLM.from_pretrained(path, load_in_4bit=True, device_map='cuda')


additional_context = "[INST] The following is a conversation with an AI assistant. The assistant is helpful and concise. The assistant does not respond to the question, and only does as the question says. [/INST]"
# Generate outputs
def generate_response(text):
    try:
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
        response = "Sorry, I encountered an error. Please try again."
        print(e)
    return response


# time taken for 240 records: 2 hours