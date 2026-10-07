"""Minimal training scaffold for the Meso4 architecture.

Expected directory structure:
  data/train/real/*.jpg
  data/train/fake/*.jpg
  data/val/real/*.jpg
  data/val/fake/*.jpg

This is intentionally separate from the web API. Train on a properly licensed
and representative dataset, then copy the resulting checkpoint to
backend/weights/deepfake_meso4.pth.
"""
from pathlib import Path
import torch
from torch import nn, optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
from main import Meso4, DEVICE

ROOT = Path(__file__).parent / 'data'
T = transforms.Compose([
    transforms.Resize((224,224)),
    transforms.RandomHorizontalFlip(),
    transforms.ToTensor(),
    transforms.Normalize([.485,.456,.406],[.229,.224,.225]),
])
train = datasets.ImageFolder(ROOT/'train', transform=T)
loader = DataLoader(train, batch_size=32, shuffle=True, num_workers=2)
model = Meso4().to(DEVICE)
opt = optim.AdamW(model.parameters(), lr=2e-4)
loss_fn = nn.BCEWithLogitsLoss()
for epoch in range(10):
    model.train(); total=0
    for x,y in loader:
        x,y=x.to(DEVICE),y.float().to(DEVICE)
        opt.zero_grad(); logits=model(x).squeeze(1); loss=loss_fn(logits,y); loss.backward(); opt.step(); total += loss.item()
    print(f'epoch {epoch+1}: loss={total/len(loader):.4f}')
Path('weights').mkdir(exist_ok=True)
torch.save(model.state_dict(), 'weights/deepfake_meso4.pth')
print('saved weights/deepfake_meso4.pth')
