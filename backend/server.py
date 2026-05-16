from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo import MongoClient, ASCENDING
from pymongo.errors import DuplicateKeyError
from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from datetime import datetime
from bson import ObjectId
from bson.errors import InvalidId
import os
from dotenv import load_dotenv
import logging
import re

load_dotenv()

app = FastAPI()
logger = logging.getLogger("dr_decoracoes")
logging.basicConfig(level=logging.INFO)
API_KEY = os.getenv("API_KEY", "").strip()
STATUS_VALIDOS = {"orçamento", "pendente", "realizado", "cancelado"}
STATUS_PAGAMENTO_VALIDOS = {"pendente", "parcial", "pago"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/")
client = None
db = None
DB_NAME = os.getenv("DB_NAME", "dr_decoracoes")
try:
    client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=2000)
    client.admin.command("ping")
    db = client[DB_NAME]
    logger.info("MongoDB conectado com sucesso no banco %s", DB_NAME)
except Exception as exc:
    logger.error("Falha ao conectar no MongoDB: %s", exc)

# Collections
produtos_collection = db["produtos"] if db is not None else None
eventos_collection = db["eventos"] if db is not None else None

# Criar índice único para código do produto
if produtos_collection is not None:
    try:
        produtos_collection.create_index([("codigo", ASCENDING)], unique=True)
    except Exception as exc:
        logger.error("Falha ao criar índice em produtos: %s", exc)

@app.middleware("http")
async def api_key_middleware(request: Request, call_next):
    if API_KEY and request.url.path.startswith("/api") and request.url.path != "/api/health":
        provided_key = request.headers.get("x-api-key")
        if provided_key != API_KEY:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": {"error": "Acesso não autorizado"}},
            )
    return await call_next(request)

def _db_disponivel() -> bool:
    return produtos_collection is not None and eventos_collection is not None

def _http_error(status_code: int, message: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"error": message})

def _parse_object_id(value: str, field_name: str = "id") -> ObjectId:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        raise _http_error(400, f"{field_name} inválido")

def _parse_iso_datetime(value: str, field_name: str) -> datetime:
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise _http_error(400, f"{field_name} inválido")

def _next_product_code() -> str:
    ultimo_produto = produtos_collection.find_one({}, sort=[("codigo", -1)])
    if ultimo_produto and ultimo_produto.get("codigo"):
        match = re.search(r"(\d+)$", ultimo_produto["codigo"])
        if match:
            return f"PROD{int(match.group(1)) + 1:04d}"
    return "PROD0001"

def _validate_produto_payload(produto: "Produto") -> None:
    if not produto.nome.strip():
        raise _http_error(400, "Nome é obrigatório")
    if not produto.categoria.strip():
        raise _http_error(400, "Categoria é obrigatória")
    if produto.valorUnitario <= 0:
        raise _http_error(400, "Valor unitário deve ser maior que zero")
    if produto.quantidadeEstoque < 0:
        raise _http_error(400, "Estoque não pode ser negativo")

def _validate_evento_payload(evento: "Evento") -> None:
    if not evento.cliente.strip():
        raise _http_error(400, "Cliente é obrigatório")
    if not evento.telefone.strip():
        raise _http_error(400, "Telefone é obrigatório")
    if not evento.local.strip():
        raise _http_error(400, "Local é obrigatório")
    inicio = _parse_iso_datetime(evento.dataHoraInicio, "dataHoraInicio")
    fim = _parse_iso_datetime(evento.dataHoraFim, "dataHoraFim")
    if fim <= inicio:
        raise _http_error(400, "A data final deve ser maior que a data inicial")
    if evento.valorFrete < 0:
        raise _http_error(400, "Valor do frete não pode ser negativo")
    if evento.valorOrganizacao < 0:
        raise _http_error(400, "Valor de organização não pode ser negativo")
    if evento.status not in STATUS_VALIDOS:
        raise _http_error(400, "Status inválido")
    for item in evento.itens:
        if item.quantidade <= 0:
            raise _http_error(400, "Todos os itens devem ter quantidade maior que zero")
        if item.valorUnitario < 0 or item.valorTotal < 0:
            raise _http_error(400, "Valores dos itens não podem ser negativos")

# ============= MODELS =============

class Produto(BaseModel):
    codigo: str = ""
    nome: str
    categoria: str
    valorUnitario: float
    quantidadeEstoque: int
    observacoes: Optional[str] = ""
    foto: Optional[str] = ""

class ProdutoResponse(Produto):
    id: str

class ItemEvento(BaseModel):
    produtoId: str
    codigoProduto: str
    nomeProduto: str
    quantidade: int
    valorUnitario: float
    valorTotal: float

class Evento(BaseModel):
    cliente: str
    telefone: str
    dataHoraInicio: str  # ISO format
    dataHoraFim: str     # ISO format
    local: str
    valorFrete: float
    valorOrganizacao: float = 0.0
    outrosValores: List[Dict[str, Any]] = Field(default_factory=list)
    status: str = "orçamento"  # orçamento, pendente, realizado, cancelado
    observacoes: Optional[str] = ""
    formaPagamento: Optional[str] = ""
    itens: List[ItemEvento] = Field(default_factory=list)
    totalProdutos: float = 0.0
    totalGeral: float = 0.0

class EventoResponse(Evento):
    id: str

class DisponibilidadeRequest(BaseModel):
    dataHoraInicio: str
    dataHoraFim: str
    eventoIdExcluir: Optional[str] = None  # Para edição

class StatusUpdateRequest(BaseModel):
    status: str

class PagamentoUpdateRequest(BaseModel):
    statusPagamento: str
    valorPago: float = 0.0

# ============= HELPER FUNCTIONS =============

def produto_helper(produto) -> dict:
    return {
        "id": str(produto["_id"]),
        "codigo": produto["codigo"],
        "nome": produto["nome"],
        "categoria": produto["categoria"],
        "valorUnitario": produto["valorUnitario"],
        "quantidadeEstoque": produto["quantidadeEstoque"],
        "observacoes": produto.get("observacoes", ""),
        "foto": produto.get("foto", "")
    }

def evento_helper(evento) -> dict:
    outros_valores = evento.get("outrosValores", [])
    outros_total = sum(float(item.get("valor", 0)) for item in outros_valores)
    valor_frete = float(evento.get("valorFrete", 0.0))
    valor_organizacao = float(evento.get("valorOrganizacao", 0.0))
    total_produtos = float(evento.get("totalProdutos", 0.0))
    total_geral = float(evento.get("totalGeral", total_produtos + valor_organizacao + valor_frete + outros_total))
    despesas_totais = valor_frete + outros_total
    lucro_evento = total_geral - despesas_totais
    return {
        "id": str(evento["_id"]),
        "cliente": evento["cliente"],
        "telefone": evento["telefone"],
        "dataHoraInicio": evento["dataHoraInicio"],
        "dataHoraFim": evento["dataHoraFim"],
        "local": evento["local"],
        "valorFrete": valor_frete,
        "valorOrganizacao": valor_organizacao,
        "outrosValores": outros_valores,
        "status": evento["status"],
        "observacoes": evento.get("observacoes", ""),
        "itens": evento.get("itens", []),
        "totalProdutos": total_produtos,
        "totalGeral": total_geral,
        "despesasTotais": despesas_totais,
        "lucroEvento": lucro_evento,
        "receitaTotal": total_geral,
        "statusPagamento": evento.get("statusPagamento", "pendente"),
        "formaPagamento": evento.get("formaPagamento", ""),
        "valorPago": float(evento.get("valorPago", 0.0)),
    }

def verificar_disponibilidade_produto(produto_id: str, quantidade: int, data_inicio: str, data_fim: str, evento_id_excluir: str = None) -> bool:
    """Verifica se há estoque disponível do produto no período especificado"""
    # Buscar produto
    produto = produtos_collection.find_one({"_id": _parse_object_id(produto_id, "produtoId")})
    if not produto:
        return False
    
    estoque_total = produto["quantidadeEstoque"]
    
    # Buscar eventos que usam este produto e têm conflito de horário
    # Só considera eventos com status pendente ou realizado
    query = {
        "itens.produtoId": produto_id,
        "status": {"$in": ["pendente", "realizado"]},
        "$or": [
            # Evento começa durante o período
            {"dataHoraInicio": {"$gte": data_inicio, "$lt": data_fim}},
            # Evento termina durante o período
            {"dataHoraFim": {"$gt": data_inicio, "$lte": data_fim}},
            # Evento engloba todo o período
            {"dataHoraInicio": {"$lte": data_inicio}, "dataHoraFim": {"$gte": data_fim}}
        ]
    }
    
    # Excluir o próprio evento se estiver editando
    if evento_id_excluir:
        query["_id"] = {"$ne": _parse_object_id(evento_id_excluir, "eventoIdExcluir")}
    
    eventos_conflitantes = list(eventos_collection.find(query))
    
    # Calcular quantidade já reservada
    quantidade_reservada = 0
    for evento in eventos_conflitantes:
        for item in evento.get("itens", []):
            if item["produtoId"] == produto_id:
                quantidade_reservada += item["quantidade"]
    
    # Verificar se há estoque disponível
    estoque_disponivel = estoque_total - quantidade_reservada
    return estoque_disponivel >= quantidade

# ============= PING =============

@app.get("/api/ping")
async def ping():
    return {"pong": True, "db": _db_disponivel()}

# ============= PRODUTOS ROUTES =============

@app.get("/api/produtos")
async def listar_produtos(busca: Optional[str] = None, limit: int = 100):
    if not _db_disponivel():
        raise _http_error(503, "Banco de dados indisponível")
    try:
        query = {}
        if busca:
            busca_escapada = re.escape(busca)
            query["$or"] = [
                {"codigo": {"$regex": busca_escapada, "$options": "i"}},
                {"nome": {"$regex": busca_escapada, "$options": "i"}},
                {"categoria": {"$regex": busca_escapada, "$options": "i"}}
            ]
        
        produtos = list(produtos_collection.find(query).sort("nome", ASCENDING).limit(limit))
        return {"items": [produto_helper(p) for p in produtos]}
    except Exception as e:
        raise _http_error(500, str(e))

@app.get("/api/produtos/{produto_id}")
async def obter_produto(produto_id: str):
    if not _db_disponivel():
        raise _http_error(503, "Banco de dados indisponível")
    try:
        produto = produtos_collection.find_one({"_id": _parse_object_id(produto_id, "produto_id")})
        if not produto:
            raise _http_error(404, "Produto não encontrado")
        return produto_helper(produto)
    except HTTPException:
        raise
    except Exception as e:
        raise _http_error(500, str(e))

@app.post("/api/produtos", status_code=status.HTTP_201_CREATED)
async def criar_produto(produto: Produto):
    if not _db_disponivel():
        raise _http_error(503, "Banco de dados indisponível")
    try:
        _validate_produto_payload(produto)
        produto_dict = produto.model_dump()
        for _ in range(3):
            produto_dict["codigo"] = _next_product_code()
            try:
                result = produtos_collection.insert_one(produto_dict)
                produto_dict["_id"] = result.inserted_id
                return produto_helper(produto_dict)
            except DuplicateKeyError:
                continue
        raise _http_error(409, "Não foi possível gerar um código único para o produto")
    except HTTPException:
        raise
    except DuplicateKeyError:
        raise _http_error(409, "Código do produto já existe")
    except Exception as e:
        raise _http_error(500, str(e))

@app.put("/api/produtos/{produto_id}")
async def atualizar_produto(produto_id: str, produto: Produto):
    if not _db_disponivel():
        raise _http_error(503, "Banco de dados indisponível")
    try:
        produto_object_id = _parse_object_id(produto_id, "produto_id")
        _validate_produto_payload(produto)
        # Verificar se produto existe
        produto_existente = produtos_collection.find_one({"_id": produto_object_id})
        if not produto_existente:
            raise _http_error(404, "Produto não encontrado")
        produto_dict = produto.model_dump()
        produto_dict["codigo"] = produto_existente["codigo"]
        produtos_collection.update_one({"_id": produto_object_id}, {"$set": produto_dict})
        produto_dict["_id"] = produto_object_id
        return produto_helper(produto_dict)
    except HTTPException:
        raise
    except DuplicateKeyError:
        raise _http_error(409, "Código do produto já existe")
    except Exception as e:
        raise _http_error(500, str(e))

@app.delete("/api/produtos/{produto_id}")
async def deletar_produto(produto_id: str):
    if not _db_disponivel():
        raise _http_error(503, "Banco de dados indisponível")
    try:
        produto_object_id = _parse_object_id(produto_id, "produto_id")
        # Verificar se produto está sendo usado em algum evento
        evento_com_produto = eventos_collection.find_one({"itens.produtoId": produto_id})
        if evento_com_produto:
            raise _http_error(400, "Produto está sendo usado em eventos e não pode ser deletado")

        result = produtos_collection.delete_one({"_id": produto_object_id})
        if result.deleted_count == 0:
            raise _http_error(404, "Produto não encontrado")
        return {"message": "Produto deletado com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        raise _http_error(500, str(e))

# ============= EVENTOS ROUTES =============

@app.get("/api/eventos")
async def listar_eventos(
    status_filter: Optional[str] = None,
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    limit: int = 100
):
    if not _db_disponivel():
        raise _http_error(503, "Banco de dados indisponível")
    try:
        query = {}

        if status_filter:
            if status_filter not in STATUS_VALIDOS:
                raise _http_error(400, "Status inválido")
            query["status"] = status_filter

        if data_inicio and data_fim:
            _parse_iso_datetime(data_inicio, "data_inicio")
            _parse_iso_datetime(data_fim, "data_fim")
            query["dataHoraInicio"] = {"$gte": data_inicio, "$lte": data_fim}
        
        eventos = list(eventos_collection.find(query).sort("dataHoraInicio", ASCENDING).limit(limit))
        return {"items": [evento_helper(e) for e in eventos]}
    except Exception as e:
        raise _http_error(500, str(e))

@app.get("/api/eventos/dashboard")
async def dashboard_eventos():
    if not _db_disponivel():
        raise _http_error(503, "Banco de dados indisponível")
    try:
        # Total de eventos não realizados
        total_nao_realizados = eventos_collection.count_documents({
            "status": {"$in": ["orçamento", "pendente"]}
        })
        
        # Próximos 3 eventos
        agora = datetime.now().isoformat()
        proximos_eventos = list(
            eventos_collection.find({
                "status": {"$in": ["orçamento", "pendente"]},
                "dataHoraInicio": {"$gte": agora}
            })
            .sort("dataHoraInicio", ASCENDING)
            .limit(3)
        )
        
        return {
            "totalNaoRealizados": total_nao_realizados,
            "proximosEventos": [evento_helper(e) for e in proximos_eventos]
        }
    except Exception as e:
        raise _http_error(500, str(e))

@app.get("/api/eventos/{evento_id}")
async def obter_evento(evento_id: str):
    if not _db_disponivel():
        raise _http_error(503, "Banco de dados indisponível")
    try:
        evento = eventos_collection.find_one({"_id": _parse_object_id(evento_id, "evento_id")})
        if not evento:
            raise _http_error(404, "Evento não encontrado")
        return evento_helper(evento)
    except HTTPException:
        raise
    except Exception as e:
        raise _http_error(500, str(e))

@app.post("/api/eventos", status_code=status.HTTP_201_CREATED)
async def criar_evento(evento: Evento):
    if not _db_disponivel():
        raise _http_error(503, "Banco de dados indisponível")
    try:
        _validate_evento_payload(evento)
        evento_dict = evento.model_dump()

        outros_total = sum(float(item.get("valor", 0)) for item in evento_dict.get("outrosValores", []))
        total_produtos = sum(item["valorTotal"] for item in evento_dict["itens"])
        total_geral = total_produtos + evento_dict["valorFrete"] + evento_dict["valorOrganizacao"] + outros_total

        evento_dict["totalProdutos"] = total_produtos
        evento_dict["totalGeral"] = total_geral
        evento_dict["status"] = "orçamento"  # Sempre começa como orçamento
        
        result = eventos_collection.insert_one(evento_dict)
        evento_dict["_id"] = result.inserted_id
        return evento_helper(evento_dict)
    except Exception as e:
        raise _http_error(500, str(e))

@app.put("/api/eventos/{evento_id}")
async def atualizar_evento(evento_id: str, evento: Evento):
    if not _db_disponivel():
        raise _http_error(503, "Banco de dados indisponível")
    try:
        evento_object_id = _parse_object_id(evento_id, "evento_id")
        _validate_evento_payload(evento)
        # Verificar se evento existe
        evento_existente = eventos_collection.find_one({"_id": evento_object_id})
        if not evento_existente:
            raise _http_error(404, "Evento não encontrado")

        evento_dict = evento.model_dump()

        outros_total = sum(float(item.get("valor", 0)) for item in evento_dict.get("outrosValores", []))
        total_produtos = sum(item["valorTotal"] for item in evento_dict["itens"])
        total_geral = total_produtos + evento_dict["valorFrete"] + evento_dict["valorOrganizacao"] + outros_total

        evento_dict["totalProdutos"] = total_produtos
        evento_dict["totalGeral"] = total_geral

        eventos_collection.update_one({"_id": evento_object_id}, {"$set": evento_dict})
        evento_dict["_id"] = evento_object_id
        return evento_helper(evento_dict)
    except HTTPException:
        raise
    except Exception as e:
        raise _http_error(500, str(e))

@app.put("/api/eventos/{evento_id}/status")
async def atualizar_status_evento(evento_id: str, novo_status: StatusUpdateRequest):
    if not _db_disponivel():
        raise _http_error(503, "Banco de dados indisponível")
    try:
        evento_object_id = _parse_object_id(evento_id, "evento_id")
        status_valor = novo_status.status
        if status_valor not in STATUS_VALIDOS:
            raise _http_error(400, "Status inválido")

        evento = eventos_collection.find_one({"_id": evento_object_id})
        if not evento:
            raise _http_error(404, "Evento não encontrado")

        eventos_collection.update_one(
            {"_id": evento_object_id},
            {"$set": {"status": status_valor}}
        )

        evento["status"] = status_valor
        return evento_helper(evento)
    except HTTPException:
        raise
    except Exception as e:
        raise _http_error(500, str(e))

@app.put("/api/eventos/{evento_id}/pagamento")
async def atualizar_pagamento_evento(evento_id: str, req: PagamentoUpdateRequest):
    if not _db_disponivel():
        raise _http_error(503, "Banco de dados indisponível")
    try:
        if req.statusPagamento not in STATUS_PAGAMENTO_VALIDOS:
            raise _http_error(400, "Status de pagamento inválido")
        evento_object_id = _parse_object_id(evento_id, "evento_id")
        evento = eventos_collection.find_one({"_id": evento_object_id})
        if not evento:
            raise _http_error(404, "Evento não encontrado")
        update_fields = {"statusPagamento": req.statusPagamento, "valorPago": req.valorPago}
        eventos_collection.update_one(
            {"_id": evento_object_id},
            {"$set": update_fields}
        )
        evento.update(update_fields)
        return evento_helper(evento)
    except HTTPException:
        raise
    except Exception as e:
        raise _http_error(500, str(e))

@app.delete("/api/eventos/{evento_id}")
async def deletar_evento(evento_id: str):
    if not _db_disponivel():
        raise _http_error(503, "MongoDB indisponível")
    try:
        result = eventos_collection.delete_one({"_id": _parse_object_id(evento_id, "evento_id")})
        if result.deleted_count == 0:
            raise _http_error(404, "Evento não encontrado")
        return {"message": "Evento deletado com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        raise _http_error(500, str(e))

@app.post("/api/eventos/disponibilidade")
async def verificar_disponibilidade(request: DisponibilidadeRequest):
    """Retorna lista de produtos com disponibilidade no período - otimizado"""
    if not _db_disponivel():
        raise _http_error(503, "Banco de dados indisponível")
    try:
        inicio = _parse_iso_datetime(request.dataHoraInicio, "dataHoraInicio")
        fim = _parse_iso_datetime(request.dataHoraFim, "dataHoraFim")
        if fim <= inicio:
            raise _http_error(400, "A data final deve ser maior que a data inicial")

        # Pipeline de agregação para calcular disponibilidade de todos os produtos de uma vez
        pipeline = [
            # Match eventos que conflitam com o período
            {
                "$match": {
                    "status": {"$in": ["pendente", "realizado"]},
                    "$or": [
                        {"dataHoraInicio": {"$gte": request.dataHoraInicio, "$lt": request.dataHoraFim}},
                        {"dataHoraFim": {"$gt": request.dataHoraInicio, "$lte": request.dataHoraFim}},
                        {"dataHoraInicio": {"$lte": request.dataHoraInicio}, "dataHoraFim": {"$gte": request.dataHoraFim}}
                    ]
                }
            },
            # Excluir evento se estiver editando
            *([{"$match": {"_id": {"$ne": _parse_object_id(request.eventoIdExcluir, "eventoIdExcluir")}}}] if request.eventoIdExcluir else []),
            # Descompactar array de itens
            {"$unwind": "$itens"},
            # Agrupar por produto e somar quantidades
            {
                "$group": {
                    "_id": "$itens.produtoId",
                    "quantidadeReservada": {"$sum": "$itens.quantidade"}
                }
            }
        ]
        
        # Executar agregação
        reservas = {doc["_id"]: doc["quantidadeReservada"] for doc in eventos_collection.aggregate(pipeline)}
        
        # Buscar todos os produtos
        produtos = list(produtos_collection.find({}))
        produtos_disponiveis = []
        
        for produto in produtos:
            produto_id = str(produto["_id"])
            estoque_total = produto["quantidadeEstoque"]
            quantidade_reservada = reservas.get(produto_id, 0)
            estoque_disponivel = estoque_total - quantidade_reservada
            
            produtos_disponiveis.append({
                **produto_helper(produto),
                "estoqueDisponivel": estoque_disponivel
            })
        
        return {"items": produtos_disponiveis}
    except Exception as e:
        raise _http_error(500, str(e))

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "D&R Decorações API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
