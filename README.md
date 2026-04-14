# Retenciones TGP

Sistema de carga de comprobantes de transferencias bancarias de bancos de Argentina.

## Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS v4

## Flujo

```
[Imagen] → [API OCR] → [Texto] → [Regex] → [Datos extraídos] → [Formulario] → [Usuario completa] → [Guardar]
```

1. Usuario sube imagen del comprobante (PDF o imagen)
2. Frontend envía a API de OCR (interna)
3. Texto extraído se procesa con expresiones regulares
4. Frontend recibe datos extraídos y pre-popula campos editables
5. Usuario completa datos faltantes (CUIT destino, Tipo, Nº OP SAFyC)
6. Usuario puede corregir y guardar

## Campos del Formulario

### Extraídos del OCR (automático)
- **Fecha de transferencia**
- **Importe transferido**
- **Banco origen**
- **Nº de referencia / Comprobante**
- **CBU destino** (guardado internamente, no se muestra)

### Ingresados por el usuario
- **CUIT / CUIL del destino** — Se validará con API externa
- **Tipo** — Selector: Gasto, Sueldo, Otro
- **Nº OP SAFyC** — Número de operación SAFyC

## Setup

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Variables de Entorno

Crear un archivo `.env` en `frontend/` basado en `.env.example`:

```bash
VITE_OCR_API_URL=<URL de la API OCR>
```

## API OCR

El sistema consume una API OCR de la red interna:

- **Endpoint**: `POST /api/v1/ocr/upload`
- **Formato**: `multipart/form-data` con campo `files`
- **Extensiones soportadas**: png, jpg, jpeg, bmp, gif, pdf

## Pendiente

- [ ] API para validar CUIT/CUIL del destino
- [ ] Listado de CBUs válidos para verificar cuenta destino
- [ ] Backend FastAPI para persistencia
