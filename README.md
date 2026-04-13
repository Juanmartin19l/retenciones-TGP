# Retenciones

Sistema de carga de comprobantes de transferencias bancarias de bancos de Argentina.

## Stack

- **Frontend**: React + Vite + TypeScript
- **Backend**: FastAPI (Python 3.11+)

## Flujo

```
[Imagen] → [API OCR] → [Texto] → [API LLM] → [Datos curados] → [Formulario]
```

1. Usuario sube imagen del comprobante
2. Backend envía a API de OCR
3. Texto extraído se envía a API de LLM para curado
4. Frontend recibe datos curados y pre-popula campos editables
5. Usuario puede corregir y guardar

## Setup

### Backend

```bash
cd apps/backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -e .

# Variables de entorno (crear .env)
# OCR_API_URL=http://tu-api-ocr
# LLM_API_URL=http://tu-api-llm

uvicorn apps.backend.main:app --reload --port 8000
```

### Frontend

```bash
cd apps/frontend
npm install
npm run dev
```

## APIs Internas

El sistema consume APIs de la red interna:

- **OCR**: Extracción de texto de imagen
- **LLM**: Curado y estructuración de datos OCR

## Variables de Entorno (Backend)

| Variable | Descripción |
|----------|-------------|
| `OCR_API_URL` | URL de la API de OCR |
| `LLM_API_URL` | URL de la API de LLM |
