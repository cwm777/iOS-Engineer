# Painel demo de telemetria veicular Starlink

Descritivo de projeto para construção com Claude Code. Leia este arquivo inteiro antes de começar. O resultado é um painel web de demonstração, com dados fictícios gerados localmente, usado em reuniões de venda com revendas empresariais de Starlink e com gestores de frota de clientes finais.

## 1. Objetivo

Tangibilizar, em uma demo de 7 minutos, o valor de um serviço de telemetria embarcada para frotas veiculares com Starlink. O serviço combina a leitura da antena (API local) com sensores do kit veicular (tensão, temperatura, vibração, ignição) e entrega ao NOC da revenda a causa provável de cada incidente, não só o alarme.

O painel precisa provar três resultados, nesta ordem de importância:

1. Menos deslocamento de técnico: o NOC sabe a causa antes de mandar alguém ao veículo.
2. SLA defendido com dado: o relatório separa falha do fornecedor (rede Starlink) de falha do lado do cliente (energia, instalação).
3. Linhas ociosas: terminais pagos sem veículo operando aparecem com o custo mensal desperdiçado.

Não é um produto. É uma demo. Priorize impacto visual e narrativa sobre completude. Tudo que não ajuda a contar a história pode ser omitido.

## 2. Público da demo

- Líder de NOC ou suporte de uma revenda de Starlink (persona principal). Quer reduzir custo de suporte e defender SLA.
- Gerente de produto ou pré-vendas da revenda. Quer um item de proposta com margem e um diferencial em edital.
- Gestor de frota de uma distribuidora de energia ou mineradora (cliente final, visto pela revenda). Quer caminhão conectado e equipe produtiva.

A interface é em português do Brasil. Moeda em R$, datas no formato dd/mm/aaaa, fuso America/Sao_Paulo.

## 3. Restrições técnicas

- Stack: Vite + React + TypeScript, Tailwind CSS, Recharts para gráficos, Leaflet (react-leaflet) com tiles do OpenStreetMap para o mapa, Zustand para estado global, seedrandom para dados determinísticos.
- Sem backend. Todos os dados são gerados no navegador na inicialização, em menos de 1 segundo, a partir de uma seed fixa (padrão 42). A mesma seed produz sempre a mesma demo.
- Sem chamadas de rede além dos tiles do mapa. Se os tiles falharem (sem internet), mostrar um fallback: mapa simples em SVG com os estados do Brasil e os marcadores posicionados por latitude e longitude.
- Roda com `npm install && npm run dev`. Build estático com `npm run build`, publicável em qualquer hosting estático.
- Responsivo para notebook e tablet. Celular não é prioridade.
- Tema claro e escuro, com o tema claro como padrão nas demos.
- Nenhum nome real de empresa, cliente ou pessoa nos dados fictícios. Nunca usar nomes de revendas ou clientes reais do mercado brasileiro.
- Código em inglês (variáveis, componentes, arquivos). Textos de interface em português.
- Sem travessões (o caractere "—") em nenhum texto de interface ou documentação. Usar vírgula, dois pontos ou ponto.

## 4. Estrutura sugerida

```
src/
  app/            rotas, layout, tema, white label
  data/
    generator/    geradores determinísticos (frota, telemetria, incidentes, linhas)
    model/        tipos TypeScript
    config.ts     parâmetros ajustáveis da demo (ver seção 6)
  features/
    overview/     visão geral da frota
    vehicle/      detalhe do veículo
    incidents/    lista e detalhe de incidentes
    correlation/  correlação de frota (rede vs veículo)
    sla/          relatórios de disponibilidade e SLA
    lines/        linhas, inventário e ociosidade
    installers/   ranking de instaladoras
    roi/          calculadora de ROI
    demo/         modo apresentação, roteiro, disparo de incidentes
  components/     componentes compartilhados (KPI card, status badge, mini charts)
  lib/            utilidades (formatação pt-BR, datas, cores de status)
```

## 5. Modelo de dados fictícios

Gerar tudo a partir da seed. Volumes e distribuições abaixo são padrão e devem ficar em `config.ts` para ajuste rápido antes de cada demo.

### 5.1 Tenant (revenda) e white label

- Um tenant ativo por vez, selecionável nas configurações da demo.
- Presets fictícios: "Conecta Telecom", "SatLink Integradora", "Órbita Soluções". Cada um com nome, cor primária, cor secundária e um logotipo gerado por texto (sem imagens externas).
- Campo "Nome do produto" com padrão "Fleet Telemetry" e um toggle "Exibir 'tecnologia Star2Go' no rodapé".

### 5.2 Clientes finais

Três clientes do tenant, todos fictícios:

| Cliente | Segmento | Veículos | Regiões (estados) |
| --- | --- | --- | --- |
| Distribuidora Energia Norte | Distribuição de energia | 180 | MA, PA |
| Mineração Rio Verde | Mineração | 40 | PA |
| AgroLog Sul | Logística agrícola | 60 | MT, RS |

Total: 280 veículos.

### 5.3 Veículos

Campos: id, placa (formato Mercosul, aleatória), cliente, base operacional (cidade fictícia ou real do estado), tipo (caminhão leve, caminhonete, caminhão cesto, van), modelo de antena (Starlink Mini 60%, Standard V4 35%, Flat High Performance 5%), kit (GoBox Mini, Kit V4, Kit FHP), instaladora (uma de quatro: "Instala Norte", "TecCampo", "RotaFix", "SatMontagem"), data de instalação (últimos 18 meses), versão de firmware, status atual (online, degradado, offline, estacionado sem ignição), posição atual (latitude e longitude dentro da região do cliente), última comunicação.

Posições: distribuir ao longo de rodovias e cidades reais dos estados indicados, com jitter. Veículos com ignição desligada ficam parados; com ignição ligada, movem-se devagar quando a simulação ao vivo está ativa.

### 5.4 Telemetria (série temporal por veículo)

Horizonte: 90 dias. Resolução: 5 minutos nas últimas 24 horas, 1 hora no restante (agregado). Gerar sob demanda por veículo e cachear, para não estourar memória.

Métricas da antena (vindas da API local): estado (connected, searching, booting, stowed, thermal_shutdown), downlink Mbps, uplink Mbps, latência ms, perda de pacotes %, SNR dB, obstrução % e mapa de obstrução em 12 setores, consumo da antena em W, alertas (thermal_throttle, motors_stuck, slow_ethernet, obstruction, unexpected_location), contagem de reboots, uptime.

Métricas do kit (sensores próprios): tensão da bateria do veículo em V (12 V nominal, ou 24 V para 20% da frota), tensão de saída do conversor em V, corrente em A, temperatura dentro da case em °C, vibração em g (pico por janela), ignição ligada ou desligada, GPS (latitude, longitude, velocidade).

Padrões realistas a embutir:

- Congestionamento diário: throughput mediano cai 30 a 40% entre 18h e 22h e latência sobe.
- Queda de tensão na partida: pico negativo de 1 a 2 segundos quando a ignição liga. Em veículos com fonte ou chicote ruins, a queda chega abaixo de 10 V e derruba a antena (reboot).
- Temperatura da case sobe com sol e veículo parado; acima de 60 °C aparece thermal_throttle.
- Obstrução maior em veículos de mineração e em bases com galpões.
- Vibração alta em caminhões cesto e em estradas de terra.

### 5.5 Incidentes

Gerar 90 dias de incidentes com o mix de causas abaixo (parametrizável em `config.ts`, porque o mix real virá das entrevistas com clientes):

| Causa | Participação | Assinatura nos dados |
| --- | --- | --- |
| Energia (fonte, chicote, bateria) | 45% | Queda de tensão antes do reboot; ignição recém ligada |
| Instalação (cabo, conector, fixação) | 15% | slow_ethernet, vibração alta antes da queda, mesma instaladora |
| Rede Starlink (regional) | 25% | Vários veículos da mesma região degradam juntos; tensão normal |
| Antena (hardware) | 10% | Reboots sem causa elétrica, motors_stuck, thermal_shutdown repetido |
| Obstrução | 5% | Obstrução acima de 15% em setores fixos; veículo parado |

Campos: id, veículo, cliente, início, fim (nulo se aberto), duração, categoria de causa, causa provável (texto curto), confiança (%), explicação em linguagem natural (gerada a partir de templates por categoria, com os valores reais do incidente inseridos), evidência (lista de métricas com valor e limite, cada uma com mini gráfico dos 30 minutos ao redor do evento), ação recomendada, status (aberto, em diagnóstico, resolvido remoto, técnico acionado, resolvido em campo), número do chamado, custo evitado em R$ (quando resolvido remoto: igual ao custo médio de deslocamento), responsabilidade (fornecedor ou cliente) para fins de SLA.

Eventos de rede regionais: gerar 3 eventos nos 90 dias em que 10 a 40 veículos de uma mesma região caem juntos por 20 a 90 minutos, com tensão e temperatura normais. Um deles deve estar "acontecendo agora" ao abrir a demo, para a cena de correlação.

Incidentes abertos ao iniciar: entre 6 e 10, de categorias variadas, com pelo menos um de energia com evidência clara (tensão a 9,4 V na partida, 6 reboots no dia).

Exemplo de explicação (categoria energia): "Seis reinícios hoje, todos nos 3 segundos seguintes à ignição, com tensão de entrada caindo a 9,4 V. A antena e o link estão saudáveis entre os reinícios. Causa provável: fonte ou chicote de alimentação. Ação: substituir a fonte estabilizada na próxima parada na base. Não é necessário deslocar técnico."

### 5.6 Linhas (contas Starlink)

Uma linha por veículo mais 8% de linhas sem veículo associado (ociosas). Campos: número da linha, plano (Prioridade Local 50 GB, 1 TB ou Mobilidade), consumo do mês em GB, participação no pool, status (ativa, pausada), veículo associado (ou nenhum), último tráfego, custo mensal em R$.

Marcar a tela de linhas com um badge discreto "dados de conta via API da revenda", porque na solução real esse dado depende do acesso que a revenda concede.

### 5.7 Instaladoras

Quatro instaladoras com volume e taxa de falha pós-instalação nos primeiros 30 dias. Uma delas deve ter taxa claramente pior (por exemplo 14% contra 3 a 5% das outras), concentrada em causa "instalação", para a cena de ranking.

### 5.8 SLA e deslocamentos

Por cliente e por mês: disponibilidade (%), meta de SLA (99,0%), incidentes fora de SLA, divisão por responsabilidade (fornecedor vs cliente), deslocamentos realizados, deslocamentos evitados, custo evitado acumulado.

Parâmetros em `config.ts`: custo médio de deslocamento (padrão R$ 1.400), chamados de conectividade por 100 veículos por mês (padrão 12), percentual de chamados resolvidos remotamente com a solução (padrão 55%).

## 6. Configuração da demo (`config.ts`)

Tudo que o apresentador pode querer ajustar antes de uma reunião fica aqui, com valores padrão:

- seed
- tenant ativo e presets de white label
- volumes por cliente
- mix de antenas e mix de causas
- custo de deslocamento, chamados por 100 veículos, taxa de resolução remota
- preço da assinatura por veículo por mês (padrão R$ 29) e preço do módulo (padrão R$ 590), usados na calculadora de ROI
- velocidade da simulação ao vivo (1x, 10x, 60x)
- idioma (apenas pt-BR nesta versão, mas deixar a estrutura pronta)

## 7. Telas

### 7.1 Visão geral da frota

- Faixa de KPIs: veículos online / degradados / offline, incidentes abertos, deslocamentos evitados no mês, R$ economizado no mês, disponibilidade do mês vs meta.
- Mapa com marcadores coloridos por status. Clique abre um cartão resumido do veículo com link para o detalhe. Agrupar marcadores quando houver zoom baixo.
- Lista de alertas recentes (últimas 24 h) com causa provável e confiança, ordenada por gravidade.
- Filtro por cliente, região, modelo de antena e status.

### 7.2 Detalhe do veículo

- Cabeçalho: placa, cliente, base, tipo, antena, kit, instaladora, data de instalação, firmware, status.
- Seletor de janela: 24 h, 7 d, 30 d.
- Gráficos empilhados com eixo de tempo compartilhado: throughput (down e up), latência e perda, tensão (bateria e saída do conversor, com linha de limite em 10 V), temperatura da case (limite em 60 °C), vibração, ignição (faixa ligada/desligada), reboots como marcadores verticais.
- Mapa de obstrução em 12 setores (gráfico radial).
- Histórico de incidentes do veículo.
- Botões de ação simulados: "Reiniciar antena", "Recolher antena (stow)", "Abrir chamado". Cada um mostra um toast de confirmação e registra no log do veículo.

### 7.3 Incidentes

- Tabela com filtros (status, causa, cliente, período) e busca por placa.
- Painel lateral de detalhe: causa provável com confiança, explicação em linguagem natural, evidência com mini gráficos, ação recomendada, responsabilidade para SLA, custo evitado.
- Botões: "Resolver remotamente" (muda status, soma o custo evitado aos KPIs) e "Acionar técnico" (muda status, registra deslocamento). Essas ações atualizam a visão geral em tempo real.

### 7.4 Correlação de frota

- Tela dedicada ao argumento "rede ou veículo?".
- Painel esquerdo: linha do tempo das últimas 6 horas com uma linha por veículo da região selecionada, mostrando a queda simultânea do evento de rede em andamento.
- Painel direito: mapa com os veículos afetados destacados e o veículo isolado (falha de energia) em outra cor.
- Texto de conclusão gerado: "23 veículos em Imperatriz/MA degradaram às 14h12 com tensão e temperatura normais: evento de rede Starlink. O veículo ABC1D23 caiu às 14h40 com tensão a 9,1 V: falha de alimentação, não relacionada."

### 7.5 SLA e relatórios

- Por cliente: disponibilidade mensal vs meta (gráfico de barras, 6 meses), incidentes por responsabilidade (fornecedor vs cliente), tempo médio de diagnóstico, tempo médio de resolução.
- Botão "Gerar relatório mensal" que abre uma versão impressa (window.print) com a marca do tenant, pronta para enviar ao cliente final.

### 7.6 Linhas e inventário

- Tabela de linhas com veículo associado, consumo, plano, status e último tráfego.
- Destaque das linhas ociosas com R$ por mês desperdiçado e total acumulado.
- Gráfico de consumo do pool: usado vs contratado, com projeção de estouro.
- Badge "dados de conta via API da revenda".

### 7.7 Instaladoras

- Ranking por taxa de falha pós-instalação em 30 dias, volume instalado e causa predominante.
- Clique abre a lista de veículos daquela instaladora com os incidentes de instalação.

### 7.8 Calculadora de ROI

- Entradas: número de veículos, custo médio de deslocamento, chamados por mês, percentual resolvido remotamente, linhas ociosas estimadas.
- Saídas: economia mensal e anual, custo da assinatura e do módulo, payback em meses, economia líquida.
- Valores padrão vindos de `config.ts`, editáveis na hora, com os campos marcados como "a validar com o cliente".

### 7.9 Modo apresentação

- Atalho de teclado (tecla P) abre uma barra lateral com o roteiro da demo (seção 8), com as cenas numeradas. Clicar em uma cena navega para a tela certa com os filtros já aplicados.
- Botão "Disparar incidente" com três opções: energia, rede regional, obstrução. Cria um incidente ao vivo no veículo ou região selecionados, com alerta na visão geral em até 5 segundos.
- Controle da simulação ao vivo: pausar, 1x, 10x, 60x.
- Botão "Reiniciar demo" (volta à seed).

## 8. Roteiro da demo (7 minutos)

O painel deve suportar exatamente esta sequência. Cada cena tem a tela, o que clicar e a frase de valor.

1. Visão geral (1 min). Mostrar 280 veículos, 7 incidentes abertos, R$ economizado no mês. Frase: "Hoje ninguém sabe se o problema é a antena, a fonte, a instalação ou a rede. Aqui a resposta aparece antes de o cliente ligar."
2. Incidente de energia (1,5 min). Abrir o incidente do veículo com 6 reboots e tensão a 9,4 V. Ler a explicação. Clicar em "Resolver remotamente" e voltar à visão geral para ver o KPI de custo evitado subir. Frase: "Esse deslocamento não aconteceu. Era a fonte, trocada na próxima parada na base."
3. Correlação de frota (1,5 min). Abrir a tela de correlação com o evento de rede em andamento. Frase: "Vinte e três veículos juntos é rede Starlink. Um sozinho com tensão baixa é o veículo. O técnico não sai para problema de rede."
4. Disparo ao vivo (1 min). No modo apresentação, disparar um incidente de obstrução em um veículo parado. Mostrar o alerta chegando e o mapa de obstrução. Frase: "Isso é o que o NOC de vocês vê, com a marca de vocês."
5. SLA (1 min). Abrir o relatório da distribuidora: disponibilidade vs meta, e a divisão fornecedor vs cliente. Gerar o relatório impresso. Frase: "Quando a falha é do lado do cliente, vocês provam. Quando é da rede, o cliente prova. Os dois lados ganham um árbitro."
6. Linhas ociosas (0,5 min). Mostrar as linhas sem veículo e o R$ por mês. Frase: "Vinte e duas linhas pagando sem ninguém usando."
7. ROI (0,5 min). Abrir a calculadora com os números do cliente. Frase: "Com os números de vocês, o payback fica em X meses. Proposta: piloto de 90 dias em 20 veículos."

## 9. Identidade visual

- Limpo, denso em informação, sem decoração. Referência: painéis de NOC e de observabilidade.
- Cores de status fixas e consistentes em todas as telas: online verde, degradado âmbar, offline vermelho, estacionado cinza, evento de rede roxo.
- Cores do tenant só no cabeçalho, botões primários e relatório impresso.
- Tipografia do sistema (Inter ou similar via fonte local, sem CDN obrigatório).
- Todos os números formatados em pt-BR (separador de milhar com ponto, decimal com vírgula).

## 10. Critérios de aceite

- [ ] `npm run dev` sobe o painel com dados completos em menos de 2 segundos, sem backend.
- [ ] A mesma seed gera exatamente a mesma demo a cada abertura.
- [ ] As 7 cenas do roteiro são executáveis na ordem, sem improviso, pelo modo apresentação.
- [ ] "Resolver remotamente" e "Acionar técnico" atualizam os KPIs da visão geral em tempo real.
- [ ] O disparo de incidente ao vivo gera alerta visível em até 5 segundos.
- [ ] Troca de tenant muda nome, cores e relatório impresso sem recarregar a página.
- [ ] O mapa funciona com tiles e tem fallback SVG sem internet.
- [ ] Nenhum nome real de empresa ou pessoa nos dados.
- [ ] Nenhum travessão em textos de interface ou documentação.
- [ ] README com instruções de execução, descrição da configuração e o roteiro da demo.
- [ ] Testes unitários mínimos para o gerador: volumes, mix de causas e determinismo da seed.

## 11. Plano de iterações para o Claude Code

Entregar em quatro iterações, cada uma rodando e demonstrável ao fim:

1. Scaffold, tipos, gerador determinístico, visão geral com mapa e detalhe do veículo com gráficos.
2. Incidentes com explicação e evidência, correlação de frota, ações que atualizam KPIs.
3. SLA com relatório impresso, linhas e inventário, instaladoras, calculadora de ROI.
4. Modo apresentação com roteiro, disparo de incidentes, simulação ao vivo, white label, README e testes.

Ao final de cada iteração, listar o que foi feito, o que ficou pendente e como rodar. Não avançar para a próxima sem o build passando.

## 12. Fora de escopo

- Autenticação, multiusuário, persistência em banco.
- Integração real com a API da Starlink ou com hardware.
- Exportação além do relatório impresso.
- Suporte a outras redes (OneWeb, 4G, SD-WAN). Deixar o modelo de dados com o campo `network: 'starlink'` para extensão futura, sem implementar.
