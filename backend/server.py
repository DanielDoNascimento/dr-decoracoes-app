from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient, ASCENDING
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from bson import ObjectId
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URL)
DB_NAME = os.getenv("DB_NAME", "dr_decoracoes")
db = client[DB_NAME]

# Collections
produtos_collection = db["produtos"]
eventos_collection = db["eventos"]

# Criar índice único para código do produto
produtos_collection.create_index([("codigo", ASCENDING)], unique=True)

# ============= MODELS =============

class Produto(BaseModel):
    codigo: str
    nome: str
    categoria: str
    valorUnitario: float
    quantidadeEstoque: int
    observacoes: Optional[str] = ""

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
    status: str = "orçamento"  # orçamento, pendente, realizado, cancelado
    observacoes: Optional[str] = ""
    itens: List[ItemEvento] = []
    totalProdutos: float = 0.0
    totalGeral: float = 0.0

class EventoResponse(Evento):
    id: str

class DisponibilidadeRequest(BaseModel):
    dataHoraInicio: str
    dataHoraFim: str
    eventoIdExcluir: Optional[str] = None  # Para edição

# ============= HELPER FUNCTIONS =============

def produto_helper(produto) -> dict:
    return {
        "id": str(produto["_id"]),
        "codigo": produto["codigo"],
        "nome": produto["nome"],
        "categoria": produto["categoria"],
        "valorUnitario": produto["valorUnitario"],
        "quantidadeEstoque": produto["quantidadeEstoque"],
        "observacoes": produto.get("observacoes", "")
    }

def evento_helper(evento) -> dict:
    return {
        "id": str(evento["_id"]),
        "cliente": evento["cliente"],
        "telefone": evento["telefone"],
        "dataHoraInicio": evento["dataHoraInicio"],
        "dataHoraFim": evento["dataHoraFim"],
        "local": evento["local"],
        "valorFrete": evento["valorFrete"],
        "valorOrganizacao": evento.get("valorOrganizacao", 0.0),
        "status": evento["status"],
        "observacoes": evento.get("observacoes", ""),
        "itens": evento.get("itens", []),
        "totalProdutos": evento.get("totalProdutos", 0.0),
        "totalGeral": evento.get("totalGeral", 0.0)
    }

def verificar_disponibilidade_produto(produto_id: str, quantidade: int, data_inicio: str, data_fim: str, evento_id_excluir: str = None) -> bool:
    """Verifica se há estoque disponível do produto no período especificado"""
    # Buscar produto
    produto = produtos_collection.find_one({"_id": ObjectId(produto_id)})
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
        query["_id"] = {"$ne": ObjectId(evento_id_excluir)}
    
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

# ============= PRODUTOS ROUTES =============

@app.get("/api/produtos")
async def listar_produtos(busca: Optional[str] = None, limit: int = 100):
    try:
        query = {}
        if busca:
            query["$or"] = [
                {"codigo": {"$regex": busca, "$options": "i"}},
                {"nome": {"$regex": busca, "$options": "i"}},
                {"categoria": {"$regex": busca, "$options": "i"}}
            ]
        
        produtos = list(produtos_collection.find(query).sort("nome", ASCENDING).limit(limit))
        return [produto_helper(p) for p in produtos]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/produtos/{produto_id}")
async def obter_produto(produto_id: str):
    try:
        produto = produtos_collection.find_one({"_id": ObjectId(produto_id)})
        if not produto:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        return produto_helper(produto)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/produtos", status_code=status.HTTP_201_CREATED)
async def criar_produto(produto: Produto):
    try:
        # Verificar se código já existe
        existe = produtos_collection.find_one({"codigo": produto.codigo})
        if existe:
            raise HTTPException(status_code=400, detail="Código do produto já existe")
        
        # Validar estoque
        if produto.quantidadeEstoque < 0:
            raise HTTPException(status_code=400, detail="Estoque não pode ser negativo")
        
        produto_dict = produto.dict()
        result = produtos_collection.insert_one(produto_dict)
        produto_dict["_id"] = result.inserted_id
        return produto_helper(produto_dict)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/produtos/{produto_id}")
async def atualizar_produto(produto_id: str, produto: Produto):
    try:
        # Verificar se produto existe
        produto_existente = produtos_collection.find_one({"_id": ObjectId(produto_id)})
        if not produto_existente:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        
        # Verificar se código já existe em outro produto
        if produto_existente["codigo"] != produto.codigo:
            existe = produtos_collection.find_one({"codigo": produto.codigo, "_id": {"$ne": ObjectId(produto_id)}})
            if existe:
                raise HTTPException(status_code=400, detail="Código do produto já existe")
        
        # Validar estoque
        if produto.quantidadeEstoque < 0:
            raise HTTPException(status_code=400, detail="Estoque não pode ser negativo")
        
        produto_dict = produto.dict()
        produtos_collection.update_one({"_id": ObjectId(produto_id)}, {"$set": produto_dict})
        produto_dict["_id"] = ObjectId(produto_id)
        return produto_helper(produto_dict)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/produtos/{produto_id}")
async def deletar_produto(produto_id: str):
    try:
        # Verificar se produto está sendo usado em algum evento
        evento_com_produto = eventos_collection.find_one({"itens.produtoId": produto_id})
        if evento_com_produto:
            raise HTTPException(status_code=400, detail="Produto está sendo usado em eventos e não pode ser deletado")
        
        result = produtos_collection.delete_one({"_id": ObjectId(produto_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        return {"message": "Produto deletado com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============= EVENTOS ROUTES =============

@app.get("/api/eventos")
async def listar_eventos(
    status_filter: Optional[str] = None,
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    limit: int = 100
):
    try:
        query = {}
        
        if status_filter:
            query["status"] = status_filter
        
        if data_inicio and data_fim:
            query["dataHoraInicio"] = {"$gte": data_inicio, "$lte": data_fim}
        
        eventos = list(eventos_collection.find(query).sort("dataHoraInicio", ASCENDING).limit(limit))
        return [evento_helper(e) for e in eventos]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/eventos/dashboard")
async def dashboard_eventos():
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
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/eventos/{evento_id}")
async def obter_evento(evento_id: str):
    try:
        evento = eventos_collection.find_one({"_id": ObjectId(evento_id)})
        if not evento:
            raise HTTPException(status_code=404, detail="Evento não encontrado")
        return evento_helper(evento)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/eventos", status_code=status.HTTP_201_CREATED)
async def criar_evento(evento: Evento):
    try:
        evento_dict = evento.dict()
        
        # Calcular totais
        total_produtos = sum(item["valorTotal"] for item in evento_dict["itens"])
        total_geral = total_produtos + evento_dict["valorFrete"] + evento_dict["valorOrganizacao"]
        
        evento_dict["totalProdutos"] = total_produtos
        evento_dict["totalGeral"] = total_geral
        evento_dict["status"] = "orçamento"  # Sempre começa como orçamento
        
        result = eventos_collection.insert_one(evento_dict)
        evento_dict["_id"] = result.inserted_id
        return evento_helper(evento_dict)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/eventos/{evento_id}")
async def atualizar_evento(evento_id: str, evento: Evento):
    try:
        # Verificar se evento existe
        evento_existente = eventos_collection.find_one({"_id": ObjectId(evento_id)})
        if not evento_existente:
            raise HTTPException(status_code=404, detail="Evento não encontrado")
        
        evento_dict = evento.dict()
        
        # Calcular totais
        total_produtos = sum(item["valorTotal"] for item in evento_dict["itens"])
        total_geral = total_produtos + evento_dict["valorFrete"] + evento_dict["valorOrganizacao"]
        
        evento_dict["totalProdutos"] = total_produtos
        evento_dict["totalGeral"] = total_geral
        
        eventos_collection.update_one({"_id": ObjectId(evento_id)}, {"$set": evento_dict})
        evento_dict["_id"] = ObjectId(evento_id)
        return evento_helper(evento_dict)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/eventos/{evento_id}/status")
async def atualizar_status_evento(evento_id: str, novo_status: dict):
    try:
        status_valor = novo_status.get("status")
        if status_valor not in ["orçamento", "pendente", "realizado", "cancelado"]:
            raise HTTPException(status_code=400, detail="Status inválido")
        
        evento = eventos_collection.find_one({"_id": ObjectId(evento_id)})
        if not evento:
            raise HTTPException(status_code=404, detail="Evento não encontrado")
        
        eventos_collection.update_one(
            {"_id": ObjectId(evento_id)},
            {"$set": {"status": status_valor}}
        )
        
        evento["status"] = status_valor
        return evento_helper(evento)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/eventos/{evento_id}")
async def deletar_evento(evento_id: str):
    try:
        result = eventos_collection.delete_one({"_id": ObjectId(evento_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Evento não encontrado")
        return {"message": "Evento deletado com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/eventos/disponibilidade")
async def verificar_disponibilidade(request: DisponibilidadeRequest):
    """Retorna lista de produtos com disponibilidade no período"""
    try:
        produtos = list(produtos_collection.find({}))
        produtos_disponiveis = []
        
        for produto in produtos:
            produto_id = str(produto["_id"])
            estoque_total = produto["quantidadeEstoque"]
            
            # Calcular quantidade reservada no período
            query = {
                "itens.produtoId": produto_id,
                "status": {"$in": ["pendente", "realizado"]},
                "$or": [
                    {"dataHoraInicio": {"$gte": request.dataHoraInicio, "$lt": request.dataHoraFim}},
                    {"dataHoraFim": {"$gt": request.dataHoraInicio, "$lte": request.dataHoraFim}},
                    {"dataHoraInicio": {"$lte": request.dataHoraInicio}, "dataHoraFim": {"$gte": request.dataHoraFim}}
                ]
            }
            
            if request.eventoIdExcluir:
                query["_id"] = {"$ne": ObjectId(request.eventoIdExcluir)}
            
            eventos_conflitantes = list(eventos_collection.find(query))
            
            quantidade_reservada = 0
            for evento in eventos_conflitantes:
                for item in evento.get("itens", []):
                    if item["produtoId"] == produto_id:
                        quantidade_reservada += item["quantidade"]
            
            estoque_disponivel = estoque_total - quantidade_reservada
            
            produtos_disponiveis.append({
                **produto_helper(produto),
                "estoqueDisponivel": estoque_disponivel
            })
        
        return produtos_disponiveis
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "D&R Decorações API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)