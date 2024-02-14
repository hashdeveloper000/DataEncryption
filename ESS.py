from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from ecies.utils import generate_eth_key
from ecies import encrypt, decrypt
import binascii, requests, os
from dotenv import load_dotenv

# Paths for saving private and public keys
PRVKEY_PATH = 'private_key.pem'
PUBKEY_PATH = 'public_key.pem'

app = FastAPI()
load_dotenv()

# Initialize keys
privKey = generate_eth_key()
privKeyHex = privKey.to_hex()
pubKeyHex = privKey.public_key.to_hex()

# Save keys to files
with open(PRVKEY_PATH, 'w') as priv_key_file:
    priv_key_file.write(privKeyHex)

with open(PUBKEY_PATH, 'w') as pub_key_file:
    pub_key_file.write(pubKeyHex)

def encrypt_file(public_key_hex, file_content, output_file_path):
    """Encrypts file using ECIES."""
    try:
        encrypted = encrypt(public_key_hex, file_content)
        with open(output_file_path, 'wb') as file:
            file.write(binascii.hexlify(encrypted))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Encryption failed")

def decrypt_file(private_key_hex, file_content, output_file_path):
    """Decrypts file using ECIES."""
    try:
        file_content.seek(0)
        encrypted_hex = file_content.read()
        encrypted = binascii.unhexlify(encrypted_hex)
        decrypted = decrypt(binascii.unhexlify(private_key_hex), encrypted)
        with open(output_file_path, 'wb') as file:
            file.write(decrypted)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Decryption failed")

def pin_to_IPFS(filename, jwt_token):
    # Define Pinata API endpoint for pinning files to IPFS
    url = "https://api.pinata.cloud/pinning/pinFileToIPFS"
    headers = {'Authorization': f'Bearer {jwt_token}'}

    # Construct the full file path using the current directory and the provided filename
    filepath = os.path.join(os.getcwd(), filename)

    # Send a POST request to Pinata API to pin the file to IPFS
    with open(filepath, 'rb') as file:
        response = requests.post(url, files={'file': file}, headers=headers)
        return response.json()

def get_pin_list(jwt_token):
    """Retrieves pin list from Pinata using Pinata API."""
    url = "https://api.pinata.cloud/data/pinList"
    headers = {'Authorization': f'Bearer {jwt_token}'}
    response = requests.get(url, headers=headers)
    return response.json()

# FastAPI routes

@app.get("/generate_keys")
async def generate_keys():
    """Generates Ethereum private and public keys."""
    return JSONResponse(content={"private_key": privKeyHex, "public_key": pubKeyHex})

@app.post("/encrypt")
async def encrypt_endpoint(public_key: str, file: UploadFile = File(...)):
    """Encrypts an uploaded file using the provided public key."""
    filename = f'{file.filename}'
    encrypted_filename = f'encrypted_{file.filename}'
    full_path = os.path.abspath(encrypted_filename)
    file_content = await file.read()
    encrypt_file(public_key, file_content, encrypted_filename)
    return {"encrypted_filename": encrypted_filename, "full_path": full_path}

@app.post("/decrypt")
async def decrypt_endpoint(private_key: str, file: UploadFile = File(...)):
    """Decrypts an uploaded file using the provided private key."""
    prefix_to_remove = 'encrypted_'
    decrypted_filename = f'decrypted_{file.filename[len(prefix_to_remove):]}'
    full_path = os.path.abspath(decrypted_filename)
    try:
        private_key_hex = private_key.removeprefix('0x')
        decrypt_file(private_key_hex, file.file, decrypted_filename)
        return {"decrypted_filename": decrypted_filename, "full_path": full_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Decryption failed")

@app.post("/upload")
async def pinata_upload(file: UploadFile = File(...)):
    """Uploads a file to Pinata and pins it to IPFS."""
    PINATA_JWT_TOKEN = os.getenv('JWT')
    FILE_PATH = file.filename
    return pin_to_IPFS(FILE_PATH, PINATA_JWT_TOKEN)

@app.get("/getInfo")
async def get_pinata_data():
    """Retrieves pin list information from Pinata."""
    PINATA_JWT_TOKEN = os.getenv('PINATA_JWT_TOKEN')
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
