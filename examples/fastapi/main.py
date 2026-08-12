"""Ejemplo de integración con FastAPI."""
from fastapi import FastAPI
from qa_architect_sdk import QaArchitectMiddleware

app = FastAPI(title="Mi API con QA Arquitecto")

app.add_middleware(
    QaArchitectMiddleware,
    project_root="/ruta/a/mi/proyecto",
    server_endpoint="http://localhost:9000",
    write_to_file=True,
    send_to_server=True,
)


@app.post("/api/usuarios/crear")
async def crear_usuario(body: dict):
    # Tu lógica normal aquí
    return {"status": "ok", "id": 1}
