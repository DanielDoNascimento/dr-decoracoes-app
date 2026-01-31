#!/usr/bin/env python3
"""
Testes para o backend do D&R Decorações
Testa todas as APIs de produtos, eventos e sistema de disponibilidade
"""

import requests
import json
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv('/app/frontend/.env')

# URL do backend
BACKEND_URL = os.getenv('EXPO_PUBLIC_BACKEND_URL', 'https://eventodr.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

print(f"🔗 Testando backend em: {API_BASE}")

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
    
    def success(self, test_name):
        self.passed += 1
        print(f"✅ {test_name}")
    
    def fail(self, test_name, error):
        self.failed += 1
        self.errors.append(f"{test_name}: {error}")
        print(f"❌ {test_name}: {error}")
    
    def summary(self):
        total = self.passed + self.failed
        print(f"\n📊 RESUMO DOS TESTES:")
        print(f"Total: {total} | Passou: {self.passed} | Falhou: {self.failed}")
        if self.errors:
            print("\n🚨 ERROS ENCONTRADOS:")
            for error in self.errors:
                print(f"  - {error}")

results = TestResults()

# Dados de teste realistas
produto_teste = {
    "codigo": "MESA001",
    "nome": "Mesa Redonda Branca 1,5m",
    "categoria": "Mesas",
    "valorUnitario": 45.00,
    "quantidadeEstoque": 10,
    "observacoes": "Mesa para 8 pessoas"
}

produto_teste2 = {
    "codigo": "CADEIRA001", 
    "nome": "Cadeira Tiffany Rosa",
    "categoria": "Cadeiras",
    "valorUnitario": 8.50,
    "quantidadeEstoque": 50,
    "observacoes": "Cadeira para eventos"
}

# Datas para teste (formato ISO)
data_inicio = "2025-07-15T10:00:00"
data_fim = "2025-07-15T18:00:00"
data_inicio2 = "2025-07-16T14:00:00"
data_fim2 = "2025-07-16T22:00:00"

evento_teste = {
    "cliente": "Maria Silva",
    "telefone": "(11) 99999-9999",
    "dataHoraInicio": data_inicio,
    "dataHoraFim": data_fim,
    "local": "Salão de Festas Villa Rosa",
    "valorFrete": 150.00,
    "valorOrganizacao": 300.00,
    "status": "orçamento",
    "observacoes": "Festa de 15 anos",
    "itens": []
}

def test_health_check():
    """Teste básico de conectividade"""
    try:
        response = requests.get(f"{API_BASE}/health", timeout=10)
        if response.status_code == 200:
            results.success("Health Check")
            return True
        else:
            results.fail("Health Check", f"Status {response.status_code}")
            return False
    except Exception as e:
        results.fail("Health Check", f"Erro de conexão: {str(e)}")
        return False

def test_produtos_crud():
    """Testa CRUD completo de produtos"""
    produto_id = None
    
    # 1. Criar produto
    try:
        response = requests.post(f"{API_BASE}/produtos", json=produto_teste, timeout=10)
        if response.status_code == 201:
            produto_criado = response.json()
            produto_id = produto_criado["id"]
            results.success("Criar Produto")
        else:
            results.fail("Criar Produto", f"Status {response.status_code}: {response.text}")
            return None
    except Exception as e:
        results.fail("Criar Produto", f"Erro: {str(e)}")
        return None
    
    # 2. Listar produtos
    try:
        response = requests.get(f"{API_BASE}/produtos", timeout=10)
        if response.status_code == 200:
            produtos = response.json()
            if len(produtos) > 0:
                results.success("Listar Produtos")
            else:
                results.fail("Listar Produtos", "Lista vazia")
        else:
            results.fail("Listar Produtos", f"Status {response.status_code}")
    except Exception as e:
        results.fail("Listar Produtos", f"Erro: {str(e)}")
    
    # 3. Buscar produto
    try:
        response = requests.get(f"{API_BASE}/produtos?busca=MESA", timeout=10)
        if response.status_code == 200:
            produtos = response.json()
            if len(produtos) > 0:
                results.success("Buscar Produto")
            else:
                results.fail("Buscar Produto", "Busca não retornou resultados")
        else:
            results.fail("Buscar Produto", f"Status {response.status_code}")
    except Exception as e:
        results.fail("Buscar Produto", f"Erro: {str(e)}")
    
    # 4. Obter produto específico
    if produto_id:
        try:
            response = requests.get(f"{API_BASE}/produtos/{produto_id}", timeout=10)
            if response.status_code == 200:
                results.success("Obter Produto por ID")
            else:
                results.fail("Obter Produto por ID", f"Status {response.status_code}")
        except Exception as e:
            results.fail("Obter Produto por ID", f"Erro: {str(e)}")
    
    # 5. Atualizar produto
    if produto_id:
        try:
            produto_atualizado = produto_teste.copy()
            produto_atualizado["valorUnitario"] = 50.00
            response = requests.put(f"{API_BASE}/produtos/{produto_id}", json=produto_atualizado, timeout=10)
            if response.status_code == 200:
                results.success("Atualizar Produto")
            else:
                results.fail("Atualizar Produto", f"Status {response.status_code}: {response.text}")
        except Exception as e:
            results.fail("Atualizar Produto", f"Erro: {str(e)}")
    
    return produto_id

def test_produto_codigo_duplicado():
    """Testa validação de código único"""
    try:
        # Tentar criar produto com código duplicado
        response = requests.post(f"{API_BASE}/produtos", json=produto_teste, timeout=10)
        if response.status_code == 400:
            results.success("Validação Código Duplicado")
        else:
            results.fail("Validação Código Duplicado", f"Deveria retornar 400, retornou {response.status_code}")
    except Exception as e:
        results.fail("Validação Código Duplicado", f"Erro: {str(e)}")

def test_eventos_crud():
    """Testa CRUD completo de eventos"""
    evento_id = None
    
    # 1. Criar evento
    try:
        response = requests.post(f"{API_BASE}/eventos", json=evento_teste, timeout=10)
        if response.status_code == 201:
            evento_criado = response.json()
            evento_id = evento_criado["id"]
            # Verificar se totais foram calculados
            if evento_criado["totalGeral"] == 450.00:  # 0 + 150 + 300
                results.success("Criar Evento com Cálculo de Totais")
            else:
                results.fail("Criar Evento", f"Total incorreto: {evento_criado['totalGeral']}")
        else:
            results.fail("Criar Evento", f"Status {response.status_code}: {response.text}")
            return None
    except Exception as e:
        results.fail("Criar Evento", f"Erro: {str(e)}")
        return None
    
    # 2. Listar eventos
    try:
        response = requests.get(f"{API_BASE}/eventos", timeout=10)
        if response.status_code == 200:
            eventos = response.json()
            if len(eventos) > 0:
                results.success("Listar Eventos")
            else:
                results.fail("Listar Eventos", "Lista vazia")
        else:
            results.fail("Listar Eventos", f"Status {response.status_code}")
    except Exception as e:
        results.fail("Listar Eventos", f"Erro: {str(e)}")
    
    # 3. Filtrar eventos por status
    try:
        response = requests.get(f"{API_BASE}/eventos?status_filter=orçamento", timeout=10)
        if response.status_code == 200:
            eventos = response.json()
            if len(eventos) > 0:
                results.success("Filtrar Eventos por Status")
            else:
                results.fail("Filtrar Eventos por Status", "Filtro não retornou resultados")
        else:
            results.fail("Filtrar Eventos por Status", f"Status {response.status_code}")
    except Exception as e:
        results.fail("Filtrar Eventos por Status", f"Erro: {str(e)}")
    
    # 4. Dashboard
    try:
        response = requests.get(f"{API_BASE}/eventos/dashboard", timeout=10)
        if response.status_code == 200:
            dashboard = response.json()
            if "totalNaoRealizados" in dashboard and "proximosEventos" in dashboard:
                results.success("Dashboard de Eventos")
            else:
                results.fail("Dashboard de Eventos", "Estrutura de resposta incorreta")
        else:
            results.fail("Dashboard de Eventos", f"Status {response.status_code}")
    except Exception as e:
        results.fail("Dashboard de Eventos", f"Erro: {str(e)}")
    
    # 5. Atualizar status do evento
    if evento_id:
        try:
            response = requests.put(f"{API_BASE}/eventos/{evento_id}/status", 
                                  json={"status": "pendente"}, timeout=10)
            if response.status_code == 200:
                results.success("Atualizar Status do Evento")
            else:
                results.fail("Atualizar Status do Evento", f"Status {response.status_code}: {response.text}")
        except Exception as e:
            results.fail("Atualizar Status do Evento", f"Erro: {str(e)}")
    
    # 6. Obter evento específico
    if evento_id:
        try:
            response = requests.get(f"{API_BASE}/eventos/{evento_id}", timeout=10)
            if response.status_code == 200:
                results.success("Obter Evento por ID")
            else:
                results.fail("Obter Evento por ID", f"Status {response.status_code}")
        except Exception as e:
            results.fail("Obter Evento por ID", f"Erro: {str(e)}")
    
    return evento_id

def test_disponibilidade_sistema(produto_id):
    """Testa sistema de verificação de disponibilidade por horário"""
    if not produto_id:
        results.fail("Sistema de Disponibilidade", "Produto não disponível para teste")
        return
    
    # 1. Verificar disponibilidade básica
    try:
        disponibilidade_request = {
            "dataHoraInicio": data_inicio2,
            "dataHoraFim": data_fim2
        }
        response = requests.post(f"{API_BASE}/eventos/disponibilidade", 
                               json=disponibilidade_request, timeout=10)
        if response.status_code == 200:
            produtos_disponiveis = response.json()
            if len(produtos_disponiveis) > 0:
                results.success("Verificar Disponibilidade de Produtos")
            else:
                results.fail("Verificar Disponibilidade de Produtos", "Nenhum produto disponível")
        else:
            results.fail("Verificar Disponibilidade de Produtos", f"Status {response.status_code}: {response.text}")
    except Exception as e:
        results.fail("Verificar Disponibilidade de Produtos", f"Erro: {str(e)}")
    
    # 2. Criar evento com produto para testar conflito
    try:
        evento_com_produto = evento_teste.copy()
        evento_com_produto["cliente"] = "João Santos"
        evento_com_produto["dataHoraInicio"] = data_inicio2
        evento_com_produto["dataHoraFim"] = data_fim2
        evento_com_produto["itens"] = [{
            "produtoId": produto_id,
            "codigoProduto": "MESA001",
            "nomeProduto": "Mesa Redonda Branca 1,5m",
            "quantidade": 5,
            "valorUnitario": 45.00,
            "valorTotal": 225.00
        }]
        
        response = requests.post(f"{API_BASE}/eventos", json=evento_com_produto, timeout=10)
        if response.status_code == 201:
            evento_criado = response.json()
            evento_id = evento_criado["id"]
            
            # Mudar status para pendente (para reservar estoque)
            requests.put(f"{API_BASE}/eventos/{evento_id}/status", 
                        json={"status": "pendente"}, timeout=10)
            
            results.success("Criar Evento com Produtos")
            
            # 3. Verificar conflito de disponibilidade
            conflito_request = {
                "dataHoraInicio": data_inicio2,
                "dataHoraFim": data_fim2
            }
            response = requests.post(f"{API_BASE}/eventos/disponibilidade", 
                                   json=conflito_request, timeout=10)
            if response.status_code == 200:
                produtos_disponiveis = response.json()
                produto_encontrado = next((p for p in produtos_disponiveis if p["id"] == produto_id), None)
                if produto_encontrado and produto_encontrado["estoqueDisponivel"] == 5:  # 10 - 5 = 5
                    results.success("Sistema de Conflito de Horário")
                else:
                    results.fail("Sistema de Conflito de Horário", 
                               f"Estoque disponível incorreto: {produto_encontrado['estoqueDisponivel'] if produto_encontrado else 'produto não encontrado'}")
            else:
                results.fail("Sistema de Conflito de Horário", f"Status {response.status_code}")
                
        else:
            results.fail("Criar Evento com Produtos", f"Status {response.status_code}: {response.text}")
    except Exception as e:
        results.fail("Criar Evento com Produtos", f"Erro: {str(e)}")

def test_produto_em_uso(produto_id):
    """Testa se produto em uso não pode ser deletado"""
    if not produto_id:
        results.fail("Validação Produto em Uso", "Produto não disponível para teste")
        return
    
    try:
        response = requests.delete(f"{API_BASE}/produtos/{produto_id}", timeout=10)
        if response.status_code == 400:
            results.success("Validação Produto em Uso")
        else:
            results.fail("Validação Produto em Uso", 
                        f"Deveria retornar 400 (produto em uso), retornou {response.status_code}")
    except Exception as e:
        results.fail("Validação Produto em Uso", f"Erro: {str(e)}")

def test_status_invalido():
    """Testa validação de status inválido"""
    try:
        # Criar um evento primeiro
        response = requests.post(f"{API_BASE}/eventos", json=evento_teste, timeout=10)
        if response.status_code == 201:
            evento_id = response.json()["id"]
            
            # Tentar status inválido
            response = requests.put(f"{API_BASE}/eventos/{evento_id}/status", 
                                  json={"status": "status_inexistente"}, timeout=10)
            if response.status_code == 400:
                results.success("Validação Status Inválido")
            else:
                results.fail("Validação Status Inválido", 
                           f"Deveria retornar 400, retornou {response.status_code}")
        else:
            results.fail("Validação Status Inválido", "Não foi possível criar evento para teste")
    except Exception as e:
        results.fail("Validação Status Inválido", f"Erro: {str(e)}")

def test_estoque_negativo():
    """Testa validação de estoque negativo"""
    try:
        produto_estoque_negativo = produto_teste2.copy()
        produto_estoque_negativo["quantidadeEstoque"] = -5
        
        response = requests.post(f"{API_BASE}/produtos", json=produto_estoque_negativo, timeout=10)
        if response.status_code == 400:
            results.success("Validação Estoque Negativo")
        else:
            results.fail("Validação Estoque Negativo", 
                        f"Deveria retornar 400, retornou {response.status_code}")
    except Exception as e:
        results.fail("Validação Estoque Negativo", f"Erro: {str(e)}")

def main():
    """Executa todos os testes"""
    print("🚀 Iniciando testes do backend D&R Decorações\n")
    
    # Teste de conectividade
    if not test_health_check():
        print("❌ Falha na conectividade. Abortando testes.")
        return
    
    print("\n📦 TESTANDO PRODUTOS:")
    produto_id = test_produtos_crud()
    test_produto_codigo_duplicado()
    test_estoque_negativo()
    
    print("\n📅 TESTANDO EVENTOS:")
    evento_id = test_eventos_crud()
    test_status_invalido()
    
    print("\n⏰ TESTANDO SISTEMA DE DISPONIBILIDADE:")
    test_disponibilidade_sistema(produto_id)
    
    print("\n🔒 TESTANDO VALIDAÇÕES:")
    test_produto_em_uso(produto_id)
    
    # Resumo final
    results.summary()
    
    return results.failed == 0

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)