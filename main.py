from pathlib import Path
import io
import os
from typing import Optional

import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from torchvision import transforms

APP_DIR = Path(__file__).resolve().parent
MODEL_PATH = Path(os.getenv('MODEL_PATH', APP_DIR / 'weights' / 'deepfake_meso4.pth'))
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

class Meso4(nn.Module):
    """MesoNet-style CNN scaffold matching the paper's MesoNet-4 direction.
    The actual trained checkpoint must be supplied at MODEL_PATH for real predictions.
    """
    def __init__(self):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(3, 8, 3, padding=1), nn.BatchNorm2d(8), nn.LeakyReLU(.1), nn.MaxPool2d(2),
            nn.Conv2d(8, 16, 5, padding=2), nn.BatchNorm2d(16), nn.LeakyReLU(.1), nn.MaxPool2d(2),
            nn.Conv2d(16, 16, 5, padding=2), nn.BatchNorm2d(16), nn.LeakyReLU(.1), nn.MaxPool2d(2),
            nn.Conv2d(16, 16, 5, padding=2), nn.BatchNorm2d(16), nn.LeakyReLU(.1), nn.MaxPool2d(2),
        )
        self.classifier = nn.Sequential(nn.Flatten(), nn.Linear(16 * 14 * 14, 16), nn.LeakyReLU(.1), nn.Linear(16, 1))

    def forward(self, x):
        return self.classifier(self.features(x))

model: Optional[Meso4] = None
if MODEL_PATH.exists():
    model = Meso4().to(DEVICE)
    checkpoint = torch.load(MODEL_PATH, map_location=DEVICE)
    if isinstance(checkpoint, dict) and 'state_dict' in checkpoint:
        checkpoint = checkpoint['state_dict']
    model.load_state_dict(checkpoint)
    model.eval()

preprocess = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

app = FastAPI(title='VERA Deepfake Detection API', version='1.0.0')
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_methods=['*'], allow_headers=['*'])

@app.get('/health')
def health():
    return {'status': 'ok', 'model_loaded': model is not None, 'device': str(DEVICE), 'model_path': str(MODEL_PATH)}

@app.post('/predict')
async def predict(file: UploadFile = File(...)):
    if model is None:
        raise HTTPException(status_code=503, detail='Trained model weights are not installed. Put the trained checkpoint at backend/weights/deepfake_meso4.pth or set MODEL_PATH.')
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail='Only image files are accepted.')
    raw = await file.read()
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail='Image is larger than 10 MB.')
    try:
        image = Image.open(io.BytesIO(raw)).convert('RGB')
    except Exception:
        raise HTTPException(status_code=400, detail='Could not read the image.')
    tensor = preprocess(image).unsqueeze(0).to(DEVICE)
    with torch.inference_mode():
        probability_fake = torch.sigmoid(model(tensor)).item()
    label = 'DEEPFAKE' if probability_fake >= 0.5 else 'GENUINE'
    confidence = probability_fake if label == 'DEEPFAKE' else 1 - probability_fake
    return {'label': label, 'confidence': round(float(confidence), 4), 'filename': file.filename or 'image'}
