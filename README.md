# Rota Fácil

Aplicação web para criar mapas personalizados, organizar pontos de visita e visualizar rotas de carro na sequência escolhida pelo usuário. Permite acompanhar visitas e compartilhar mapas com responsáveis, mantendo o controle das alterações com o criador.

O projeto está em evolução a partir de um MVP para uso online. A ordem dos pontos é manual: o sistema calcula o trajeto entre eles, mas ainda não otimiza a sequência de visitas.

## Funcionalidades

- Cadastro com nome, e-mail, CPF e senha; login e logout com sessão em cookie `HttpOnly`.
- Criação, listagem, edição e exclusão de mapas com nome e descrição.
- Inclusão de pontos por clique ou busca por endereço, com confirmação da posição antes de salvar.
- Nomes opcionais para os pontos, seleção, remoção e reordenação por arrastar e soltar ou pelos botões da lista.
- Cálculo e persistência da rota, com recálculo após inclusão, remoção ou reordenação de pontos.
- Marcação de pontos como visitados, sem alterar a sequência ou recalcular a rota.
- Localização atual do dispositivo, com ações para centralizar e interromper o acompanhamento.
- Compartilhamento com responsáveis pelo e-mail de uma conta cadastrada, com concessão e revogação de acesso pelo criador.

### Permissões de compartilhamento

| Ação | Criador | Responsável autorizado |
| --- | --- | --- |
| Visualizar mapa, pontos e rota | Sim | Sim |
| Renomear pontos e marcar/desmarcar visitas | Sim | Sim |
| Adicionar, remover e reordenar pontos | Sim | Não |
| Editar ou excluir o mapa | Sim | Não |
| Conceder e revogar acessos | Sim | Não |

As restrições são verificadas pela API e refletidas na interface. Contas sem autorização não têm acesso ao mapa.

## Tecnologias utilizadas

| Camada | Tecnologias | Finalidade |
| --- | --- | --- |
| Interface | Vue 3, Quasar 2, TypeScript e Vue Router | Telas, componentes e navegação |
| Build da interface | Vite 6 e vue-tsc | Desenvolvimento, verificação de tipos e build |
| Mapa | MapLibre GL JS 6 | Renderização do mapa, marcadores e trajetos |
| API | NestJS 11, TypeScript e Node.js 22 | Autenticação, permissões e regras de negócio |
| Persistência | Prisma 6 e PostgreSQL 16 com PostGIS 3.5 | Modelos, migrações e armazenamento |
| Roteirização | Valhalla | Cálculo de trajetos de carro com dados viários do OpenStreetMap |
| Cartografia | OpenFreeMap e OpenStreetMap | Estilo e dados do mapa |
| Busca de endereço | Geoapify Address Autocomplete | Sugestões de endereço convertidas em coordenadas |
| Localização | Geolocation API do navegador | Acompanhamento temporário da posição do dispositivo |
| Ambiente local | Docker e Docker Compose | Execução integrada dos serviços |

A interface consulta a API, que acessa o banco, o Valhalla e o Geoapify. A cartografia é carregada pelo navegador. A chave do Geoapify permanece no backend.

## Estrutura do repositório

```text
apps/
  api/                              # API NestJS, schema Prisma e migrações
  web/                              # Interface Vue, Quasar e MapLibre
infra/
  postgres-init.sql                 # Inicialização da extensão PostGIS
docs/
  implantacao.md                    # Operação local e preparação para produção
docker-compose.yml                  # Serviços e volumes de desenvolvimento
.env.example                        # Modelo de configuração
plano-execucao-mvp-mapas-rotas.md     # Etapas, critérios de aceite e revisões
```

## Como executar

### Pré-requisitos

- Docker com o plugin Docker Compose (comando `docker compose`).
- Conexão à internet para baixar imagens, dependências e dados cartográficos e utilizar os serviços externos.
- Memória e espaço em disco disponíveis para preparar o grafo de roteamento do Valhalla. O recorte padrão cobre todo o Nordeste do Brasil e pode exigir recursos consideráveis.
- Uma chave do Geoapify para habilitar a busca por endereço. As demais funcionalidades não dependem dessa chave.

Não é necessário instalar Node.js ou PostgreSQL na máquina para executar pelo Compose.

### 1. Configurar o ambiente

Na raiz do repositório, copie o modelo de configuração, caso ainda não tenha um `.env`:

```bash
cp .env.example .env
```

Edite o `.env` conforme necessário:

| Variável | Configuração |
| --- | --- |
| `POSTGRES_DB` / `POSTGRES_USER` | Nome do banco e usuário local |
| `POSTGRES_PASSWORD` | Senha do banco; substitua o valor de exemplo |
| `CPF_HASH_SECRET` | Segredo aleatório e estável usado para gerar o HMAC dos CPFs; substitua o exemplo |
| `GEOAPIFY_API_KEY` | Chave do Geoapify para a busca por endereço; deixe vazia se não utilizar a busca |
| `VALHALLA_TILE_URL` | URL do arquivo OSM PBF; o padrão é o recorte Nordeste da Geofabrik |
| `VITE_MAP_STYLE_URL` | Estilo cartográfico; o padrão é Liberty do OpenFreeMap |
| `VITE_API_URL` | URL da API acessível pelo navegador; localmente, `http://localhost:3000` |
| `WEB_ORIGIN` | Origem permitida da interface; localmente, `http://localhost:9000` |
| `NODE_ENV` | Mantenha `development` para este ambiente local |

O Compose monta `DATABASE_URL` com as variáveis `POSTGRES_*` e define `VALHALLA_URL` para a rede interna dos contêineres. Os valores dessas duas URLs presentes no `.env.example` usam os nomes internos `db` e `valhalla`.

Mantenha o `CPF_HASH_SECRET` estável: trocá-lo impede reconhecer os CPFs já cadastrados. Nunca coloque segredos em variáveis `VITE_*`, pois elas são expostas ao navegador.

### 2. Iniciar os serviços

```bash
docker compose up -d --build
```

A inicialização instala as dependências, gera o cliente Prisma e aplica as migrações automaticamente. O frontend e a API executam em modo de desenvolvimento, com os diretórios de código montados nos contêineres.

Na primeira execução, o Valhalla baixa o arquivo PBF e constrói o grafo de roteamento. Essa preparação pode levar vários minutos; acompanhe os logs antes de tentar calcular rotas. Para usar um recorte menor, ajuste `VALHALLA_TILE_URL` antes da primeira inicialização.

```bash
docker compose ps
docker compose logs -f api web valhalla
```

O healthcheck da API verifica PostgreSQL/PostGIS. Ele não indica que o Valhalla já terminou a preparação.

### 3. Acessar a aplicação

| Serviço | Endereço local |
| --- | --- |
| Interface | <http://localhost:9000> |
| Cadastro | <http://localhost:9000/register> |
| Login | <http://localhost:9000/login> |
| API | <http://localhost:3000> |
| Saúde da API e conexão com PostGIS | <http://localhost:3000/health> |
| Valhalla | `http://localhost:8002` |
| PostgreSQL | `localhost:5433` |

O banco usa a porta `5433` na máquina para evitar conflito com instalações locais; entre os contêineres, utiliza `5432`.

Após cadastrar uma conta e entrar:

1. Crie um mapa na área de trabalho (`/workspace`) e abra seus detalhes.
2. Use **Adicionar ponto** para incluir locais por clique ou utilize a busca por endereço e confirme a posição.
3. Adicione pelo menos dois pontos dentro da cobertura do Valhalla e organize a sequência para visualizar a rota.
4. Renomeie os pontos e marque as visitas conforme necessário.
5. Em **Responsáveis**, conceda acesso pelo e-mail de outra conta cadastrada.
6. Use **Minha localização** para acompanhar a posição do dispositivo e **Parar localização** para encerrar.

A demonstração cartográfica permanece disponível, após login, em `/workspace/map-preview`.

### Comandos úteis

Execute na raiz do repositório, com os serviços iniciados para os comandos `exec`:

```bash
# Gerar o build da API
docker compose exec api npm run build

# Verificar tipos e gerar o build da interface
docker compose exec web npm run build

# Aplicar migrações manualmente, se necessário
docker compose exec api npm run prisma:deploy

# Encerrar os serviços preservando os volumes
docker compose down
```

O banco persiste no volume `postgres_data` e os dados de roteamento em `valhalla_data`. Evite `docker compose down -v` se precisar manter esses dados: a opção `-v` remove os volumes.

## Dados e limites atuais

- Os pontos armazenam coordenadas, posição, nome opcional e estado de visita. Endereços pesquisados ou selecionados não são persistidos; o texto da busca é enviado ao Geoapify para obter sugestões.
- A localização do dispositivo é temporária, permanece no navegador e não é enviada à API nem incluída como ponto da rota. O navegador solicita permissão e exige HTTPS, exceto em `localhost`.
- A rota segue a ordem manual e utiliza o modo de carro do Valhalla. Com menos de dois pontos, não há trajeto; se o recálculo falhar, a geometria anterior é removida para evitar exibir uma rota desatualizada.
- O uso requer conexão para a cartografia e acesso aos serviços necessários. Não há suporte offline nem navegação curva a curva dentro do Rota Fácil.
- O cálculo depende da cobertura do grafo preparado no Valhalla. O recorte padrão inclui Vitória da Conquista e o entorno, além do restante do Nordeste.
- Senhas são armazenadas como hash bcrypt, CPFs como HMAC-SHA-256 e tokens de sessão como SHA-256. A sessão expira em sete dias; o cadastro exige senha com pelo menos 12 caracteres e no máximo 72 bytes.
- Verificação de e-mail, recuperação de senha e administração de contas ainda não foram implementadas.

O Compose é voltado ao desenvolvimento local. A preparação para produção, incluindo HTTPS, segredos, backups, limites de requisições e pendências de dependências e desempenho, está descrita em [Preparação para implantação](docs/implantacao.md).

MapLibre renderiza a cartografia; os dados são do OpenStreetMap, sob licença ODbL. Mantenha as atribuições visíveis e confira os termos dos provedores antes da publicação. A busca também exibe atribuição ao Geoapify.

## Planos futuros

O [plano de execução](plano-execucao-mvp-mapas-rotas.md) registra critérios de aceite e revisões. O MVP e a marcação de visitas estão aprovados. Busca por endereço, localização do dispositivo, renomeação de pontos e compartilhamento já foram implementados e aguardam revisão humana; a localização ainda precisa ser validada em um dispositivo real.

### Próximas prioridades

1. **Concluir a revisão do compartilhamento e das permissões:** validar a interface e o fluxo de concessão e revogação de acesso antes de avançar para notificações.
2. **Notificar responsáveis:** avisar sobre atribuição de rotas e alterações relevantes. A integração com Evolution API, o uso de telefone, o consentimento e as preferências de notificação ainda serão avaliados.
3. **Abrir navegação no Google Maps:** oferecer um botão por ponto para iniciar a navegação veicular até o destino, preservando a sequência no Rota Fácil.

### Evoluções em avaliação

- **Agenda e turnos:** configurar jornada, almoço e pausas por mapa, com uma base única para partida e retorno de cada turno, incluindo retorno à base no almoço.
- **Atendimentos:** definir duração padrão e por ponto, janelas de atendimento, notas e categorias, comparando tempos previstos e reais.
- **Estimativas:** exibir distância e tempo por trecho e total, horários de chegada e conclusão e distribuição das visitas entre turnos ou dias.
- **Otimização opcional:** propor uma sequência que considere base, turnos, pausas, janelas e duração dos atendimentos, com revisão antes de aplicar.
- **Acompanhamento da execução:** indicar próximo ponto, pontos restantes, caminho percorrido e duração real dos atendimentos.
- **Exportação:** disponibilizar rotas em outros formatos ou plataformas.
- **Uso offline:** avaliar regiões em PMTiles, armazenamento no dispositivo e sincronização com resolução de conflitos, após estabilizar agenda, execução e permissões.

Essas evoluções não fazem parte das funcionalidades disponíveis hoje. O plano prevê revisão humana de cada entrega antes do avanço para a próxima etapa.
