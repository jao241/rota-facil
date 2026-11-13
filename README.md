# Rota Fácil — MVP

Monorepo do MVP com API NestJS, interface Vue 3 + Quasar + TypeScript, MapLibre GL JS, PostgreSQL/PostGIS e Valhalla.

## Etapa 1: ambiente e prova cartográfica

1. Copie `.env.example` para `.env` e ajuste a senha local do banco.
2. Execute `docker compose up --build` na raiz.
3. Aguarde o primeiro preparo do Valhalla. O serviço baixa um recorte OSM da região Nordeste do Brasil e gera o grafo de roteamento; isso pode levar vários minutos e usar bastante memória e disco. Os arquivos ficam no volume `valhalla_data` e são reutilizados nas próximas inicializações.
4. Abra <http://localhost:9000> e use **Calcular rota de teste**.
5. Verifique a conexão com PostGIS em <http://localhost:3000/health>.

O PostgreSQL fica publicado localmente em `localhost:5433` para evitar conflito com uma instalação local que já use a porta 5432; os contêineres usam a porta padrão 5432 na rede interna.

Para acompanhar a inicialização e consultar os healthchecks, use `docker compose ps` e `docker compose logs -f api web valhalla`. A API fica saudável quando PostgreSQL/PostGIS respondem; isso não significa que a preparação dos tiles do Valhalla terminou. Consulte [docs/implantacao.md](docs/implantacao.md) para operação local, variáveis e preparação antes de publicar.

## Etapa 2: autenticação

- Abra <http://localhost:9000/register> para cadastrar uma conta e <http://localhost:9000/login> para entrar.
- O perfil protegido fica em `/workspace`; a prova de mapa da Etapa 1 fica em `/workspace/map-preview`.
- A API oferece `POST /auth/register`, `POST /auth/login`, `POST /auth/logout` e `GET /auth/me`. A rota `POST /route` também exige uma sessão.
- Senhas exigem pelo menos 12 caracteres; o limite de hashing é 72 bytes. A API armazena somente o hash bcrypt.
- O cadastro pede nome completo e CPF formatado. A API valida os dígitos verificadores do CPF e persiste somente um HMAC-SHA-256 do número; CPF não aparece nas respostas de autenticação. Configure um `CPF_HASH_SECRET` aleatório e mantenha-o estável, pois uma troca impede reconhecer os CPFs já registrados.
- A senha de verificação só é usada no formulário: precisa coincidir com a senha antes do envio e não é enviada nem armazenada.
- A sessão usa token aleatório em cookie `HttpOnly`, `SameSite=Lax`, com prazo de sete dias. Apenas o SHA-256 do token é persistido. Em produção o cookie recebe `Secure` e o prefixo `__Host-`; sirva a aplicação por HTTPS e configure `WEB_ORIGIN` para a origem real da interface.
- Cadastro e login têm limite de cinco tentativas por minuto por IP; o limite atual fica em memória e é adequado apenas para uma instância local. Produção com várias réplicas precisa de armazenamento compartilhado para os limites.
- O MapLibre foi atualizado para a linha 6.16, com o worker empacotado pelo Vite para ESM.
- A auditoria da API ainda reporta avisos altos na cadeia de configuração da versão Prisma 6 usada pela CLI. A correção indicada pelo npm exige a migração de versão principal do Prisma, que também muda o formato de módulos e o adaptador do banco; essa migração deve ser concluída antes de produção.

## Etapa 3: gerenciamento de mapas

- Após entrar, `/workspace` lista os mapas da conta e permite criar, editar, abrir e excluir mapas.
- A tela `/workspace/maps/:id` apresenta os dados do mapa e o mapa interativo descrito na Etapa 4.
- A API oferece `POST /maps`, `GET /maps`, `GET /maps/:id`, `PATCH /maps/:id` e `DELETE /maps/:id`. Todos exigem sessão e limitam consultas e alterações ao proprietário autenticado.
- O modelo persiste nome e descrição opcional, com datas de criação e atualização. A exclusão do usuário remove seus mapas por chave estrangeira em cascata.

## Etapa 4: mapa interativo e pontos

- Na tela de detalhes do mapa, use **Adicionar ponto** para ativar o modo de inclusão. Um clique no mapa grava latitude e longitude; cliques em modo de navegação não criam pontos.
- A lista lateral mostra as coordenadas e a sequência de inclusão. Selecione um marcador ou item da lista e use o botão de exclusão para removê-lo; os pontos seguintes são renumerados.
- Use o ícone de edição em um ponto para atribuir, alterar ou remover seu nome. O nome é opcional e aparece na lista e ao passar o cursor sobre o marcador; renomear não altera a rota.
- A API oferece `GET /maps/:id/points`, `POST /maps/:id/points` e `DELETE /maps/:id/points/:pointId`. As coordenadas são validadas por faixa e os recursos seguem a propriedade do mapa.
- `MapPoint` persiste apenas identificador, mapa relacionado, latitude, longitude, posição e datas de criação/atualização. Não são gravados endereços ou textos do local.
- O modo de visualização e edição requer internet para carregar cartografia do OpenFreeMap; o cálculo da rota consulta o serviço Valhalla.

## Etapa 5: ordenação manual e rotas

- Reordene pontos arrastando-os na lista ou usando os botões de subir/descer. A API `PATCH /maps/:id/points/order` exige a lista completa dos IDs sem duplicatas; a posição é salva sem otimização automática.
- O Valhalla é consultado automaticamente após inclusão, remoção e reordenação, sempre na sequência salva. A API `GET /maps/:id/route` retorna a geometria persistida como GeoJSON `LineString`.
- A geometria e horário do cálculo ficam em `MapRoute`, relacionados ao mapa. Se houver menos de dois pontos, a rota é limpa; se o Valhalla falhar, a geometria anterior é removida e a mensagem do serviço fica disponível para a interface.
- As rotas são protegidas pela mesma autorização de propriedade dos mapas. O endpoint de demonstração `POST /route` continua disponível para a prova cartográfica da Etapa 1.

## Evolução pós-MVP: pontos visitados

- O criador pode abrir **Responsáveis** no mapa, conceder acesso pelo e-mail de uma conta cadastrada e revogar esse acesso. Mapas compartilhados aparecem na área de trabalho do responsável, que pode visualizar o mapa e detalhes, renomear pontos e marcar ou desmarcar visitas. As demais ações de edição e a gestão de acessos ficam com o criador.

- Selecione um ponto e use a ação **Marcar como visitado**. O marcador e o número na lista ficam cinza, e o estado pode ser desfeito.
- A API oferece `PATCH /maps/:id/points/:pointId/visited` com `{ "visited": true|false }`. O banco guarda `visitedAt` opcional; alterar essa marcação não muda a sequência nem recalcula a rota.
- A busca e inclusão por endereço está na Etapa 8 do [plano de execução](plano-execucao-mvp-mapas-rotas.md): digite o endereço, escolha uma sugestão, confira/ajuste o marcador no mapa e confirme a inclusão. Configure `GEOAPIFY_API_KEY` no `.env`; a chave permanece no backend. O texto de busca é enviado ao Geoapify para consulta, não é armazenado pelo Rota Fácil, e o ponto salvo contém apenas coordenadas e posição.
- No mapa, **Minha localização** solicita permissão ao navegador e acompanha as atualizações do dispositivo enquanto estiver ativada. O marcador é temporário, não vira ponto salvo; use **Parar localização** para encerrar o acompanhamento. O navegador exige HTTPS, com exceção de `localhost` em desenvolvimento.

Verificação de e-mail, recuperação de senha e administração de contas ainda não fazem parte desta etapa.

O CRUD da Etapa 3 permite gerenciar mapas, e as Etapas 4 e 5 adicionam pontos persistidos, reordenação e cálculo das rotas. A prova de rota da Etapa 1 permanece como demonstração fixa protegida por sessão.

O recorte Geofabrik Nordeste contém Vitória da Conquista e municípios do entorno, além de uma área geográfica muito maior que a prova de conceito. Se os recursos locais forem limitados, ajuste `VALHALLA_TILE_URL` para um extrato menor antes de iniciar pela primeira vez.

## Dados cartográficos e serviços

- **MapLibre GL JS** renderiza o mapa; não fornece os dados cartográficos.
- A prova usa o estilo Liberty hospedado pelo OpenFreeMap. A URL pode ser configurada em `VITE_MAP_STYLE_URL`.
- O estilo e as vias usam dados do OpenStreetMap. Exibir atribuição visível ao OpenStreetMap é obrigatório; os dados OSM são licenciados sob ODbL. Consulte os termos atuais do provedor de tiles antes de publicar o serviço ou depender dele em produção.
- O roteador usa Valhalla e dados viários OSM, sem Google Maps. A imagem Docker scripted oficial prepara os tiles a partir do PBF definido em `VALHALLA_TILE_URL`.
- A busca por endereço usa o Geoapify Address Autocomplete; sua chave é configurada em `GEOAPIFY_API_KEY` no `.env` e nunca deve ser publicada no frontend. A tela atribui a busca ao Geoapify.
- O endpoint de saúde da API confirma conexão ao PostgreSQL e executa `PostGIS_Full_Version()`. O endpoint `POST /route` encaminha coordenadas ao Valhalla.

## Limites desta prova

O cálculo principal usa os pontos salvos e sua sequência manual. A rota fixa da prova cartográfica permanece disponível em `/workspace/map-preview`. A aplicação requer conexão à internet para carregar o estilo cartográfico e consultar o Valhalla.

Antes da implantação, definir um provedor cartográfico com termos, disponibilidade e capacidade adequados ao uso esperado. OpenFreeMap na prova de conceito não representa compromisso de hospedagem ou nível de serviço de produção.

O Compose deste repositório é para desenvolvimento local, não para exposição pública. Consulte [docs/implantacao.md](docs/implantacao.md) para a configuração necessária de produção e os avisos conhecidos de segurança e tamanho do worker cartográfico.
