# Preparação para implantação

## Ambiente de desenvolvimento

1. Copie `.env.example` para `.env` e defina uma senha local para PostgreSQL, um `CPF_HASH_SECRET` aleatório e sua chave `GEOAPIFY_API_KEY` para habilitar a busca por endereço. A chave é lida somente pela API; não a coloque em variáveis `VITE_*` nem no navegador.
2. Inicie os serviços com `docker compose up -d --build`.
3. Acompanhe a inicialização com `docker compose ps` e `docker compose logs -f api web valhalla`. A API e a interface passam a saudáveis após os respectivos healthchecks. A API verifica PostgreSQL/PostGIS; esse healthcheck não indica se o grafo do Valhalla terminou de ser preparado.
4. Abra `http://localhost:9000`. A API fica em `http://localhost:3000`, o healthcheck em `/health`, PostgreSQL em `localhost:5433` e Valhalla em `localhost:8002`.

O primeiro início do Valhalla pode demorar vários minutos para baixar o PBF e preparar o grafo. Os dados ficam no volume Docker `valhalla_data`; o PostgreSQL persiste em `postgres_data`. Não remova esses volumes se precisar conservar os dados.

## Antes de publicar

O Compose atual é de desenvolvimento: usa Vite e NestJS em modo watch, instala dependências ao iniciar e publica portas para uso local. Não exponha essa configuração diretamente à internet. Defina e valide uma plataforma de produção com imagens de runtime, HTTPS e proxy reverso antes do lançamento público.

- Gere uma senha forte para o banco e um `CPF_HASH_SECRET` aleatório, estável e guardado em um gerenciador de segredos. Nunca use os valores de exemplo em produção; trocar o segredo CPF impede reconhecer os CPFs cadastrados anteriormente.
- Configure `NODE_ENV=production` e `WEB_ORIGIN` com a origem HTTPS exata da aplicação. O cookie de sessão de produção usa o prefixo `__Host-`, `Secure`, `HttpOnly`, `SameSite=Lax` e caminho `/`.
- Mantenha PostgreSQL e Valhalla em rede privada. Não publique a porta do banco nem a porta do Valhalla ao público. A porta `5433` e as portas `3000`, `8002` e `9000` publicadas no Compose são conveniências locais.
- Defina `VITE_API_URL` como URL pública da API no build do frontend; essa variável é visível no navegador e nunca pode conter segredos.
- Escolha a cobertura geográfica e prepare o PBF por `VALHALLA_TILE_URL`. Reserve memória e disco para baixar e construir tiles; monitore espaço, logs e reinício dos serviços.
- Verifique termos, capacidade, disponibilidade e atribuição do provedor cartográfico. O estilo de demonstração OpenFreeMap e os dados do OpenStreetMap não incluem garantia de serviço para produção.
- Configure backup e restauração para PostgreSQL, migrações versionadas, logs centralizados, limites compartilhados para múltiplas réplicas e monitoramento externo do Valhalla. O limitador de tentativas atual é em memória e atende apenas uma instância.
- Resolva os avisos altos da cadeia da CLI Prisma identificados na auditoria antes da implantação. A migração necessária envolve versão principal e não foi incluída no MVP.
- O build do frontend emite um aviso de chunk acima de 500 kB por causa do worker do MapLibre (cerca de 1,1 MB, aproximadamente 300 kB gzip). Avalie divisão/carregamento otimizado antes de ampliar o uso em dispositivos móveis ou redes lentas.

## Limites de operação

O mapa e a roteirização exigem internet. O cliente encerra chamadas à API após 25 segundos e apresenta mensagem de conexão; a consulta da API ao Valhalla termina após 15 segundos. Se o recálculo falhar, a API salva a mensagem e remove a geometria anterior para não exibir uma rota desatualizada. São armazenadas apenas coordenadas e posições dos pontos, nunca endereços textuais.

A busca por endereço usa Geoapify Address Autocomplete e exige `GEOAPIFY_API_KEY` no `.env`. O campo digitado é enviado à API Geoapify para obter sugestões e não é gravado pelo Rota Fácil; após a confirmação do marcador, a aplicação persiste apenas latitude, longitude e posição. A tela atribui a busca ao Geoapify.

A localização em tempo real usa a API de geolocalização do navegador. O usuário inicia e encerra o acompanhamento pelo mapa, e a posição atual só aparece como marcador temporário na tela; ela não é enviada à API nem persistida. Em implantação, sirva a interface por HTTPS e permita geolocalização na política de permissões do site; o navegador também solicita autorização ao usuário.
