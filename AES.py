from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import FileResponse
from starlette.requests import Request
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
import requests
import os
from dotenv import load_dotenv

app = FastAPI()

# Load environment variable from .env file
load_dotenv()

def encrypt_aes(plaintext, key):
    # Initialize AES cipher in EAX mode
    cipher = AES.new(key, AES.MODE_EAX)
    # Encrypt and get nonce, tag, and ciphertext
    ciphertext, tag = cipher.encrypt_and_digest(plaintext)
    return cipher.nonce, tag, ciphertext

def decrypt_aes(nonce, tag, ciphertext, key):
    # Initialize AES cipher in EAX mode with provided nonce
    cipher = AES.new(key, AES.MODE_EAX, nonce=nonce)
    # Decrypt the ciphertext using the provided tag
    decrypted_data = cipher.decrypt_and_verify(ciphertext, tag)
    return decrypted_data

def pin_to_IPFS(filepath, jwt_token):
    # Define Pinata API endpoint for pinning files to IPFS
    url = "https://api.pinata.cloud/pinning/pinFileToIPFS"
    headers = {'Authorization': f'Bearer {jwt_token}'}

    # Send a POST request to Pinata API to pin the file to IPFS
    with open(filepath, 'rb') as file:
        response = requests.post(url, files={'file': file}, headers=headers)
        return response.json()

def get_pin_list(jwt_token):
    # Define Pinata API endpoint for retrieving pin list
    url = "https://api.pinata.cloud/data/pinList"
    headers = {'Authorization': f'Bearer {jwt_token}'}

    # Send a GET request to Pinata API to get the pin list
    response = requests.get(url, headers=headers)
    return response.json()

@app.post("/encrypt")
async def encrypt(file: UploadFile = File(...)):
    # Generate a random AES key
    key_aes = get_random_bytes(16)

    # Read the content of the uploaded file
    with file.file as file_content:
        plaintext = file_content.read()

    # Encrypt the file content
    nonce, tag, ciphertext = encrypt_aes(plaintext, key_aes)

    # Save the encrypted file with a new filename
    encrypted_filename = file.filename + ".enc"
    full_path = os.path.abspath(encrypted_filename)
    with open(encrypted_filename, 'wb') as encrypted_file:
        [encrypted_file.write(x) for x in (nonce, tag, ciphertext)]

    # Return the key, encrypted filename, and full path
    return {"key": key_aes.hex(), "encrypted_filename": encrypted_filename, "full_path": full_path}

@app.post("/decrypt")
async def decrypt(key: str, file: UploadFile = File(...)):
    # Convert the hex key to bytes
    key_aes = bytes.fromhex(key)

    # Read the content of the encrypted file
    with file.file as file_content:
        nonce, tag, ciphertext = [file_content.read(x) for x in (16, 16, -1)]

    try:
        # Decrypt the file content
        decrypted_data = decrypt_aes(nonce, tag, ciphertext, key_aes)
    except ValueError as e:
        # Handle decryption errors
        raise HTTPException(status_code=400, detail=str(e))

    # Save the decrypted file with a new filename
    decrypted_filename = file.filename[:-4] + "_decrypted"
    with open(decrypted_filename, 'wb') as decrypted_file:
        decrypted_file.write(decrypted_data)

    # Return the decrypted filename
    return FileResponse(decrypted_filename)

@app.post("/upload")
async def pinata_upload(file: UploadFile = File(...)):
    # Get Pinata JWT token from environment variables
    PINATA_JWT_TOKEN = os.getenv('PINATA_JWT_TOKEN')
    FILE_PATH = file.filename

    # Upload the file to Pinata and return the response
    return pin_to_IPFS(FILE_PATH, PINATA_JWT_TOKEN)

@app.get("/getInfo")
async def get_pinata_data():
    # Get Pinata JWT token from environment variables
    PINATA_JWT_TOKEN = os.getenv('PINATA_JWT_TOKEN')

    # Retrieve pin list from Pinata and return the response
    return get_pin_list(PINATA_JWT_TOKEN)


@app.get("/download/{filename}")
async def download_file(filename: str):
    file_path = os.path.join("/opt/render/project/src", filename)

    # Check if the file exists
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    # Return the file as a response
    return FileResponse(file_path, media_type='application/octet-stream',
                        headers={'Content-Disposition': f'attachment; filename={filename}'})
