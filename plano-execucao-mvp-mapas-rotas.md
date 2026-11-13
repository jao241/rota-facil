Plano de execução — MVP do sistema de mapas e rotas
1. Objetivo
Este documento organiza o desenvolvimento do MVP em etapas sequenciais, definindo objetivos, atividades, entregáveis e critérios de conclusão.

Regra obrigatória: cada etapa deverá passar por uma revisão humana antes que a próxima seja iniciada.

A conclusão técnica de uma etapa não significa autorização automática para avançar. O responsável pelo projeto deverá revisar e aprovar explicitamente cada entrega.
2. Visão geral do MVP
Desenvolver uma aplicação web responsiva que permita criar mapas personalizados, adicionar pontos diretamente no mapa, organizar manualmente a sequência e visualizar o trajeto calculado entre esses pontos.

O MVP pressupõe que o usuário terá acesso à internet durante a criação e a visualização dos mapas. Cartografia e roteirização serão carregadas por serviços online; consulta sem conexão não faz parte desta entrega.
2.1 Funcionalidades incluídas
- Cadastro e autenticação de usuários.
- Criação, edição, consulta e exclusão de mapas.
- Exibição de mapa interativo.
- Inclusão de pontos por clique diretamente no mapa.
- Seleção e remoção de pontos.
- Numeração sequencial dos pontos.
- Reordenação manual dos pontos.
- Cálculo de rota respeitando a sequência definida pelo usuário.
- Persistência dos mapas, coordenadas, posições e geometrias das rotas.
2.2 Regras de negócio
1. Os pontos serão adicionados diretamente pelo clique no mapa.
2. Não haverá pesquisa ou cadastro de endereços por texto no MVP.
3. O sistema poderá apresentar informações textuais do local quando disponíveis, mas não deverá persistir esses dados no banco.
4. A persistência dos pontos deverá armazenar somente as coordenadas geográficas e sua posição na sequência.
5. A rota deverá respeitar a ordem manual definida pelo usuário: A → B → C → D.
6. Não haverá otimização automática da sequência.
7. A criação, edição e visualização de mapas dependem de conexão à internet.
8. Não haverá compartilhamento de mapas por link.
9. Não será necessário apresentar duração ou distância estimada dos trajetos no MVP.
10. O sistema não deverá depender de serviços ou APIs do Google Maps.
3. Arquitetura e tecnologias
Camada	Tecnologia
Frontend	Vue 3 + Quasar + TypeScript
Renderização cartográfica	MapLibre GL JS
Dados cartográficos	OpenStreetMap
Backend	NestJS
ORM	Prisma
Banco de dados	PostgreSQL + PostGIS
Cálculo de rotas	Valhalla
Infraestrutura	Docker Compose

Observação: MapLibre é uma biblioteca de renderização, não um provedor de mapas. Será necessário definir uma fonte cartográfica compatível. O uso dos dados do OpenStreetMap deverá respeitar suas condições de licença e atribuição.
4. Processo obrigatório de execução e revisão
Cada etapa deverá seguir o seguinte fluxo:
1. Planejamento.
2. Implementação.
3. Verificação técnica e funcional.
4. Documentação do que foi desenvolvido.
5. Apresentação para revisão humana.
6. Aprovação ou solicitação de ajustes.
7. Autorização para iniciar a próxima etapa.
4.1 Estados das etapas
Estado	Descrição
PENDENTE	Etapa ainda não iniciada.
EM_ANDAMENTO	Desenvolvimento autorizado.
AGUARDANDO_REVISAO	Implementação concluída, aguardando avaliação humana.
AJUSTES_SOLICITADOS	Revisão identificou problemas que precisam ser corrigidos.
APROVADA	Revisão humana concluída e próxima etapa autorizada.

4.2 Informações obrigatórias na revisão
Ao finalizar uma etapa, apresentar:
- Objetivo da etapa.
- Funcionalidades implementadas.
- Arquivos e módulos criados ou alterados.
- Decisões técnicas tomadas.
- Comandos executados.
- Verificações realizadas.
- Critérios de aceite atendidos.
- Pendências e problemas identificados.
- Riscos técnicos conhecidos.
Regra de bloqueio: enquanto uma etapa estiver aguardando revisão ou possuir ajustes solicitados, nenhuma etapa posterior poderá ser iniciada.

5. Etapas de desenvolvimento
Etapa 1 — Infraestrutura e prova de conceito cartográfica
Primeira etapa
Objetivo
Preparar o ambiente de desenvolvimento e comprovar a viabilidade da renderização cartográfica e do cálculo de rotas.
Atividades
- Definir a organização dos repositórios.
- Criar a configuração do Docker Compose.
- Configurar PostgreSQL com PostGIS.
- Configurar variáveis de ambiente.
- Preparar o projeto NestJS.
- Configurar Prisma.
- Preparar o frontend Vue 3 + Quasar + TypeScript.
- Integrar MapLibre GL JS.
- Definir a fonte cartográfica.
- Selecionar uma região inicial para os testes, preferencialmente Vitória da Conquista e entorno.
- Preparar os dados OpenStreetMap necessários para o Valhalla.
- Configurar e executar o Valhalla.
- Realizar uma prova de conceito de cálculo de rota entre coordenadas.
Entregáveis
- Ambiente de desenvolvimento com Docker Compose.
- PostgreSQL/PostGIS funcionando.
- Backend conectado ao banco.
- Frontend funcionando.
- Mapa renderizado.
- Valhalla calculando trajetos na região selecionada.
- Documentação da preparação dos dados geográficos.
Critérios de aceite
- [ ] Os serviços iniciam corretamente pelo Docker Compose.
- [ ] O backend conecta ao PostgreSQL.
- [ ] O frontend renderiza o mapa.
- [ ] O sistema não depende do Google Maps.
- [ ] O Valhalla calcula um trajeto válido.
- [ ] A fonte cartográfica está documentada.
- [ ] A licença e a atribuição dos dados cartográficos foram consideradas.
Revisão humana
A pessoa responsável deverá validar a infraestrutura, a renderização cartográfica e o cálculo de rotas.

A próxima etapa somente poderá ser iniciada após aprovação explícita.

Estado: APROVADA

Etapa 2 — Usuários e autenticação
Objetivo
Implementar o cadastro, a autenticação e a proteção dos recursos da aplicação.
Atividades
- Criar o modelo de usuário.
- Implementar cadastro.
- Implementar login.
- Implementar encerramento de sessão.
- Configurar autenticação e autorização no NestJS.
- Proteger endpoints privados.
- Proteger rotas do frontend.
- Garantir que cada usuário acesse somente seus próprios mapas.
- Implementar tratamento de erros de autenticação.
Entregáveis
- Modelo de usuário.
- Endpoints de cadastro e autenticação.
- Fluxo de autenticação no frontend.
- Proteção dos recursos privados.
Critérios de aceite
- [ ] É possível cadastrar um usuário.
- [ ] É possível realizar login.
- [ ] É possível encerrar a sessão.
- [ ] Endpoints privados exigem autenticação.
- [ ] Usuários não conseguem acessar mapas de terceiros.
- [ ] As credenciais são armazenadas de maneira segura.
Revisão humana
Revisar a estrutura de autenticação, as regras de autorização e o isolamento dos dados.

Estado: APROVADA

Etapa 3 — Gerenciamento de mapas
Objetivo
Permitir que o usuário crie e gerencie seus próprios mapas.
Atividades
- Criar o modelo Map.
- Implementar criação de mapas.
- Implementar listagem.
- Implementar consulta individual.
- Implementar edição.
- Implementar exclusão.
- Relacionar os mapas aos usuários.
- Criar as telas de gerenciamento no frontend.
- Implementar estados de carregamento e tratamento de erros.
Modelo inicial sugerido
Map
Campo	Descrição
id	Identificador do mapa
user_id	Usuário proprietário
name	Nome do mapa
description	Descrição opcional
created_at	Data de criação
updated_at	Data de atualização

Entregáveis
- CRUD de mapas.
- Endpoints no backend.
- Interface de gerenciamento.
- Controle de propriedade dos mapas.
Critérios de aceite
- [x] Usuário consegue criar mapas.
- [x] Usuário consegue listar seus mapas.
- [x] Usuário consegue abrir um mapa.
- [x] Usuário consegue editar um mapa.
- [x] Usuário consegue excluir um mapa.
- [x] Usuário não consegue acessar mapas de terceiros.
Revisão humana
Validar a modelagem, os endpoints, as permissões e a interface.

Estado: APROVADA

Etapa 4 — Mapa interativo e inclusão de pontos
Objetivo
Permitir que o usuário adicione pontos diretamente no mapa e visualize suas posições.
Atividades
- Criar a tela de visualização e edição do mapa.
- Integrar o MapLibre.
- Implementar controles de navegação.
- Criar o modo explícito de inclusão de pontos.
- Implementar a ação "Adicionar ponto".
- Capturar latitude e longitude do clique.
- Criar marcadores no mapa.
- Numerar os marcadores conforme a sequência.
- Permitir selecionar pontos.
- Permitir remover pontos.
- Atualizar a numeração após remoções.
- Persistir coordenadas e posição no backend.
- Carregar os pontos ao abrir novamente o mapa.
Regras de inclusão
O usuário deverá ativar o modo de inclusão antes de clicar no mapa.

Isso evita que um clique destinado à movimentação ou navegação do mapa crie pontos acidentalmente.
Modelo inicial sugerido
MapPoint
Campo	Descrição
id	Identificador do ponto
map_id	Mapa relacionado
latitude	Latitude
longitude	Longitude
position	Posição na sequência
created_at	Data de criação
updated_at	Data de atualização

Importante: não armazenar endereço, logradouro, número, bairro, cidade ou CEP no banco de dados.

As informações textuais do local poderão ser exibidas temporariamente quando disponíveis, mas não serão persistidas.
Entregáveis
- Mapa interativo.
- Inclusão de pontos por clique.
- Marcadores numerados.
- Seleção e remoção.
- Persistência dos pontos.
Critérios de aceite
- [x] O usuário consegue abrir um mapa.
- [x] O usuário consegue ativar o modo de inclusão.
- [x] Um clique adiciona um ponto na posição correta.
- [x] Cliques fora do modo de inclusão não criam pontos.
- [x] Os marcadores são numerados sequencialmente.
- [x] O usuário consegue selecionar e remover pontos.
- [x] A numeração é atualizada após remoções.
- [x] Os pontos são recuperados após reabrir o mapa.
- [x] O banco armazena coordenadas e posição, sem dados textuais de endereço.
Revisão humana
Validar a experiência de inclusão, a precisão dos marcadores e a persistência dos pontos.

Estado: APROVADA

Etapa 5 — Ordenação manual e cálculo de rotas
Objetivo
Permitir que o usuário organize os pontos e visualize o trajeto respeitando a sequência escolhida.
Atividades
- Implementar reordenação manual.
- Utilizar arrastar e soltar na lista de pontos, se adequado.
- Atualizar a posição dos pontos no banco.
- Integrar o backend ao Valhalla.
- Enviar as coordenadas na ordem definida pelo usuário.
- Receber a geometria do trajeto.
- Persistir a geometria.
- Desenhar a rota no MapLibre.
- Recalcular a rota após inclusão, remoção ou reordenação de pontos.
- Tratar falhas do serviço de roteirização.
Modelo inicial sugerido
Route
Campo	Descrição
id	Identificador da rota
map_id	Mapa relacionado
geometry	Geometria do trajeto
transport_mode	Modalidade de transporte
calculated_at	Data do cálculo

Regras de negócio
A rota deverá respeitar a sequência definida pelo usuário.

Exemplo:

Ponto A → Ponto B → Ponto C → Ponto D

O sistema não deverá alterar automaticamente essa sequência.
Entregáveis
- Lista reordenável de pontos.
- Integração com Valhalla.
- Trajeto desenhado no mapa.
- Persistência da geometria.
- Atualização automática da rota após alterações.
Critérios de aceite
- [x] O usuário consegue alterar a ordem dos pontos.
- [x] A numeração acompanha a nova ordem.
- [x] O Valhalla recebe os pontos na sequência correta.
- [x] A rota respeita a sequência manual.
- [x] A geometria é exibida corretamente no mapa.
- [x] A rota é atualizada após alterações nos pontos.
- [x] A geometria é persistida.
- [x] A rota continua disponível após reabrir o mapa.
- [x] Falhas de roteirização são tratadas.
- [x] Não existe otimização automática da sequência.
Revisão humana
Validar a ordenação, o cálculo, a geometria e o comportamento de atualização das rotas.

Estado: APROVADA

Etapa 6 — Integração, estabilização e entrega
Objetivo
Consolidar as funcionalidades online e preparar uma versão utilizável do MVP.
Atividades
- Revisar o fluxo completo da aplicação.
- Corrigir problemas de integração.
- Revisar autenticação, permissões e isolamento dos dados.
- Tratar indisponibilidade do Valhalla e falhas de rede.
- Avaliar desempenho do mapa e da aplicação nos dispositivos alvo.
- Validar responsividade.
- Revisar logs e mensagens de erro.
- Documentar instalação, configuração e preparação dos dados cartográficos.
- Preparar ambiente de implantação.
- Realizar validação final com conexão à internet.
Entregáveis
- MVP integrado para uso online.
- Documentação técnica e de execução.
- Ambiente preparado para implantação.
- Registro de limitações conhecidas.
Critérios de aceite
- [x] O fluxo online completo funciona com conexão à internet.
- [x] A aplicação informa ou trata adequadamente a perda de conexão e a indisponibilidade de serviços.
- [x] Os dados dos usuários estão isolados.
- [x] Não há persistência de endereços textuais.
- [x] A sequência manual dos pontos é respeitada.
- [x] Não há dependência do Google Maps.
- [x] A documentação permite executar o ambiente.
- [x] As limitações conhecidas estão registradas.
Revisão humana
Validar os principais fluxos online e o comportamento quando a conexão ou um serviço externo estiver indisponível.

Estado: APROVADA

Etapas de evolução pós-MVP

Etapa 7 — Marcar pontos como visitados
Objetivo
Permitir que a pessoa registre os lugares que já visitou.
Atividades
- Persistir `visitedAt` opcional no ponto.
- Implementar ação para marcar e desmarcar como visitado.
- Exibir pontos visitados em cinza no mapa.
- Identificar o estado na lista sem alterar a ordem dos pontos.
- Preservar a sequência e a geometria da rota ao mudar apenas o estado de visita.
Critérios de aceite
- [x] O usuário consegue marcar e desmarcar pontos como visitados.
- [x] O estado continua após reabrir o mapa.
- [x] O marcador visitado aparece em cinza, inclusive quando selecionado.
- [x] O acesso ao estado respeita o proprietário do mapa.
- [x] Alterar estado não altera ordem nem recalcula a rota.
Revisão humana
Validar a ação, a aparência dos marcadores e a persistência do estado.

Estado: APROVADA

Etapa 8 — Localizar e incluir ponto por endereço
Objetivo
Oferecer o endereço como forma alternativa de encontrar uma localização para um novo ponto.
Atividades
- Usar Geoapify Address Autocomplete com chave mantida no backend; a etapa de avaliação humana poderá pedir outro provedor se a cobertura não atender.
- Permitir informar endereço, como logradouro, número, bairro, município e UF, sem persistir a consulta textual.
- Apresentar sugestões de endereço e converter a opção escolhida em coordenadas.
- Exigir confirmação da posição no mapa antes de salvar o ponto.
- Persistir somente latitude, longitude e posição na sequência; não armazenar o endereço escolhido.
- Tratar endereço não encontrado, resultado ambíguo, indisponibilidade e falta de cobertura.
Critérios de aceite
- [x] O usuário consegue informar um endereço e escolher uma sugestão.
- [x] O sistema exige confirmação da posição antes de salvar.
- [x] Endereço consultado ou escolhido não fica armazenado no banco.
- [x] As coordenadas confirmadas são persistidas e entram na sequência manual.
- [x] Resultados inválidos ou indisponíveis são informados sem criar ponto incorreto.
Revisão humana
Validar precisão das sugestões, privacidade e experiência de confirmação.

Estado: AGUARDANDO_REVISAO

Etapa 9 — Acompanhar localização do dispositivo
Objetivo
Exibir a posição atual do usuário e acompanhar suas atualizações durante o uso do mapa.
Atividades
- Solicitar a permissão de localização somente após ação explícita do usuário.
- Exibir um marcador temporário atualizado pelo navegador enquanto o acompanhamento estiver ativo.
- Permitir centralizar a câmera na posição atual e encerrar o acompanhamento.
- Não enviar nem persistir a localização do dispositivo como ponto do mapa.
- Tratar permissão negada, posição indisponível, timeout e contexto sem HTTPS.
Critérios de aceite
- [x] O usuário inicia o acompanhamento por um botão no mapa.
- [x] A posição do marcador acompanha as atualizações recebidas do navegador.
- [x] O usuário pode centralizar o mapa e interromper a localização.
- [x] A localização temporária não é persistida nem incluída na rota.
- [x] Erros e requisitos de permissão/contexto seguro são informados.
Revisão humana
Validar permissão no dispositivo, atualização do marcador e encerramento do acompanhamento.

Estado: AGUARDANDO_REVISAO

Etapa 10 — Renomear pontos
Objetivo
Permitir que o usuário dê nomes reconhecíveis aos pontos adicionados ao mapa.
Atividades
- Adicionar um campo opcional de nome ao ponto, com limite de 80 caracteres.
- Exibir ação de renomear na lista, com opção de limpar o nome e voltar ao rótulo sequencial.
- Persistir o nome mantendo a posição e as coordenadas; renomear não deve recalcular a rota.
- Exibir o nome na lista e na identificação acessível do marcador no mapa.
Critérios de aceite
- [x] O usuário consegue nomear, alterar e limpar o nome de um ponto.
- [x] O nome persiste e é retornado pela API junto aos pontos.
- [x] Renomear mantém coordenadas, ordem, estado visitado e rota.
- [x] A atualização respeita a propriedade do mapa e rejeita nomes fora do limite.
Revisão humana
Validar edição, persistência, exibição em telas pequenas e comportamento da rota.

Estado: AGUARDANDO_REVISAO

6. Checklist geral do MVP
- [x] Infraestrutura configurada.
- [x] PostgreSQL/PostGIS configurado.
- [x] Prisma configurado.
- [x] MapLibre integrado.
- [x] Valhalla funcionando.
- [x] Cadastro e autenticação.
- [x] CRUD de mapas.
- [x] Inclusão de pontos por clique.
- [x] Seleção e remoção de pontos.
- [x] Numeração sequencial.
- [x] Reordenação manual.
- [x] Cálculo de rotas.
- [x] Persistência da geometria.
- [x] Nenhum dado textual de endereço persistido.
- [x] Documentação.
- [x] Aprovação humana de todas as etapas.
7. Funcionalidades fora do MVP
- Pesquisa de endereços por texto.
- Autocomplete de endereços.
- Geocodificação como fluxo de cadastro.
- Persistência de endereço textual.
- Otimização automática da sequência.
- Cálculo da melhor sequência de visita.
- Compartilhamento de mapas.
- Consulta de mapas, pontos e rotas sem conexão à internet.
- Download e armazenamento local de regiões cartográficas.
- Edição offline, sincronização posterior e resolução de conflitos.
- Recálculo de rotas offline.
- Exibição de distância e duração como funcionalidades do produto.
8. Estimativa de desenvolvimento
A estimativa inicial discutida é de aproximadamente quatro semanas, com uma quinta semana como margem para integração e ajustes. A retirada do modo offline reduz o escopo e elimina uma das principais incertezas técnicas, mas o prazo ainda depende do tamanho da equipe, da experiência com as tecnologias e da prova de conceito inicial.

Essa estimativa depende principalmente de:
- Preparação dos dados cartográficos.
- Configuração do Valhalla.
- Cobertura geográfica desejada.
- Disponibilidade e limites dos serviços de cartografia e roteirização.
A prova de conceito da Etapa 1 é fundamental para validar a viabilidade técnica antes de avançar. O uso do MVP requer conexão à internet para carregar a cartografia e consultar o Valhalla. A disponibilidade, os limites e os custos dos provedores deverão ser definidos antes da implantação.

8.1 Evoluções futuras

**Prioridade de implementação**
1. **Permissões e compartilhamento com responsáveis** — Permitir ao criador autorizar e remover usuários específicos como responsáveis pela rota. O acesso compartilhado permitirá visualizar o mapa e seus detalhes, marcar pontos como visitados e editar nomes; todas as demais ações permanecerão exclusivas do criador. O mapa compartilhado exigirá autenticação e autorização explícita.
2. **Notificações aos responsáveis** — Ao atribuir uma rota, enviar mensagem com o aviso e acesso ao mapa autorizado. Notificar também alterações relevantes que afetem o responsável, como edições na rota compartilhada. Avaliar a Evolution API e o campo de telefone durante a implementação, definindo consentimento, segurança e preferências de notificação.
3. **Navegação externa até um ponto** — Adicionar, em cada ponto, um botão para abrir o Google Maps em modo de direção até o destino escolhido, usando a localização atual como origem quando disponível. A pessoa poderá acompanhar a navegação veicular no Google Maps; a ordem e os dados do mapa no Rota Fácil não serão alterados.

Detalhamento da etapa de compartilhamento — **AGUARDANDO_REVISAO**:
- Persistir a concessão de acesso por mapa e usuário, garantindo unicidade e remoção em cascata.
- Exibir ao proprietário os responsáveis autorizados e permitir conceder e revogar acesso a usuários cadastrados.
- Listar mapas próprios e compartilhados para cada usuário, identificando a condição de acesso.
- Autorizar no backend leitura do mapa, pontos e rota e as ações de renomear e marcar visita para responsáveis; restringir criação, exclusão e reordenação de pontos, alteração/exclusão do mapa, busca de endereço para inclusão e gestão de responsáveis ao proprietário.
- Adequar a interface à permissão recebida e verificar as mesmas restrições diretamente na API, inclusive após revogação e entre contas sem acesso.
- Após implementação e validação técnica, aguardar revisão humana antes de iniciar notificações.
- Implementado e validado em 13/11/2026 com contas temporárias: concessão e revogação, leitura e ações permitidas, bloqueio de ações exclusivas e isolamento de terceiro sem acesso. Aguardando revisão humana da interface e do fluxo.

**Em espera e avaliação**
- Agenda por mapa: local-base único para partida e retorno de todos os turnos; tabela de intervalos por mapa com almoço e pausas padrão em novos mapas, editáveis pelo proprietário; configuração de jornada e múltiplos turnos. No almoço, retornar à base e iniciar o turno seguinte a partir dela.
- Duração prevista de atendimento como tipo de intervalo configurável, com padrão no mapa e ajuste por ponto; janelas de atendimento, notas e categorias; comparação entre durações previstas e reais.
- Cálculo de distância e tempo por trecho e total, horários estimados de chegada/conclusão e duração total da jornada, somando deslocamentos, atendimentos e pausas e distribuindo pontos restantes entre turnos ou dias.
- Otimização da ordem respeitando base, retornos para almoço, turnos, intervalos, janelas de atendimento e durações previstas; manter ordem manual e permitir revisar a proposta antes de aplicá-la.
- Acompanhamento da execução: próximo ponto, pontos restantes, horários previstos e caminho percorrido pela pessoa até e ao longo da rota; registrar duração real dos atendimentos.
- Exportação geral de rotas para outros formatos ou plataformas, além do botão de navegação ao Google Maps priorizado acima.
- Uso offline: baixar regiões em PMTiles, armazenar mapas, pontos e geometrias no dispositivo e avaliar edição/sincronização com resolução explícita de conflitos, compatibilidade, armazenamento e retenção. Manter esta frente em espera até os modelos de agenda, execução e permissões estarem mais estáveis.
9. Registro de revisões humanas
Etapa	Responsável	Data	Resultado	Observações
1 — Infraestrutura	Codex	2026-11-06	APROVADA	Compose no ar; PostGIS conectado; rota de teste calculada (2,33 km). Revisão humana aprovada.
2 — Autenticação	Codex	2026-11-06	APROVADA	Cadastro/login/logout, sessões HttpOnly, guardas e telas implementados. Cadastro inclui nome, CPF, senha e confirmação de senha coincidente; CPF validado e armazenado como HMAC. Revisão humana aprovada.
3 — Mapas	Codex	2026-11-07	APROVADA	CRUD e telas de gerenciamento concluídos. Build de API e frontend aprovados; smoke CRUD com duas contas confirmou isolamento e acesso negado a usuário sem sessão. Usuário revisou e autorizou prosseguir.
4 — Pontos	Codex	2026-11-07	APROVADA	Usuário confirmou a correção do carregamento do mapa e autorizou prosseguir. MapLibre na tela de detalhes; pontos autenticados, persistidos e renumerados. Builds e smoke funcional aprovados.
5 — Rotas	Codex	2026-11-07	APROVADA	Reordenação, cálculo ordenado, geometria e tratamento de indisponibilidade revisados pelo usuário; autorização para avançar.
6 — Integração e entrega	Codex	2026-11-07	APROVADA	Builds API/frontend e configuração Compose passaram; serviços API/web/DB saudáveis. Smoke completo com contas descartáveis confirmou sessão, CRUD, pontos, sequência, rota, isolamento e logout; teste fora da cobertura confirmou erro sem geometria antiga. Adicionados timeouts, validação do endpoint de demonstração, healthchecks e documentação operacional/pré-produção. Revisão final humana aprovada.
7 — Visitado	Codex	2026-11-07	APROVADA	Campo `visitedAt`, endpoint autenticado para alternar o estado e UI com marcadores cinza e ação de desfazer. Usuário autorizou avançar para busca por endereço.
8 — Endereço	Codex	2026-11-07	AGUARDANDO_REVISAO	Busca Geoapify via API autenticada e com limite de consultas, chave no backend, seleção de sugestão, marcador arrastável e confirmação antes de persistir somente coordenadas. Interface informa erros e atribui o provedor.
9 — Localização ao vivo	Codex	2026-11-09	AGUARDANDO_REVISAO	Acompanhamento por Geolocation API iniciado por ação explícita, marcador temporário com botão de centralização e ação para parar; posição permanece no dispositivo. Falta validar permissões e atualizações em dispositivo real.
10 — Renomear pontos	Codex	2026-11-09	AGUARDANDO_REVISAO	Campo opcional persistido, PATCH autenticado por mapa, ação de editar/limpar nome na lista e identificação do marcador; atualização não recalcula a rota.

Regra final: nenhuma etapa poderá ser iniciada automaticamente após a conclusão técnica da anterior. A aprovação humana explícita é obrigatória.
