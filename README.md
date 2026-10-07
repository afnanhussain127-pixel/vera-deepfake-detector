# VERA — AI Deepfake Detection Website

A React + Vite + TypeScript + Tailwind + Motion frontend and FastAPI/PyTorch backend inspired by the supplied research paper and the supplied Swiss-grid Ledger UI brief.

## 1. Frontend
```bash
npm install
npm run dev
```
Open http://localhost:5173.

Optional API URL:
```bash
VITE_API_URL=http://localhost:8000 npm run dev
```

## 2. Backend
Use Python 3.11 recommended.
```bash
cd backend
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## 3. Real model weights
The API deliberately refuses to invent a prediction if no trained checkpoint exists.
Place the trained PyTorch checkpoint at:
`backend/weights/deepfake_meso4.pth`

or set:
`MODEL_PATH=/path/to/checkpoint.pth`

The checkpoint must match the Meso4 architecture in `backend/main.py`. If your research model uses a different preprocessing pipeline, face detector, transfer-learning backbone, or checkpoint structure, adapt `Meso4` and `preprocess` to the exact training code before claiming benchmark performance.

## 4. Training scaffold
For a local proof of concept, arrange:
```
backend/data/train/real/*.jpg
backend/data/train/fake/*.jpg
```
then run `python train.py`. For research/publication use, train and evaluate on properly licensed datasets with train/validation/test separation and report precision, recall, F1, ROC-AUC, confusion matrix and cross-dataset results.

## Important
The supplied paper reports 94.3%–98.3% on its evaluated benchmark data but about 53% on Perchance AI-generated media, so the UI intentionally avoids presenting benchmark accuracy as a guarantee for an arbitrary uploaded image.
