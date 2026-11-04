# Painel demo de telemetria veicular Starlink

Painel web de demonstração para reuniões de venda com revendas de Starlink e gestores de frota. Todos os dados são fictícios, gerados no navegador a partir de uma seed fixa. Não há backend.

O painel mostra, para cada incidente de conectividade, a causa provável (energia, instalação, rede Starlink, antena ou obstrução), a evidência que sustenta o diagnóstico e a ação recomendada. O objetivo é tangibilizar três resultados: menos deslocamento de técnico, SLA defendido com dado e linhas ociosas identificadas.

A especificação completa está em `docs/painel-demo-telemetria-spec.md`.

## Como rodar

Requer Node.js 20 ou superior.

```bash
cd telemetria-demo
npm install
npm run dev
```

Abra `http://localhost:5173`. O build estático é gerado com `npm run build` na pasta `dist/`, publicável em qualquer hosting estático (as rotas usam hash, então não é preciso configurar rewrites).

Outros comandos:

```bash
npm test          # testes unitários do gerador (vitest)
npm run build     # type-check e build de produção
npm run preview   # serve a pasta dist
```

## Stack

Vite, React, TypeScript, Tailwind CSS 4, Recharts, Leaflet (react-leaflet) com tiles do OpenStreetMap, Zustand e seedrandom.

## Configuração da demo

Tudo que o apresentador pode querer ajustar fica em `src/data/config.ts`:

| Parâmetro | Padrão | Uso |
| --- | --- | --- |
| `seed` | `42` | Seed de todos os geradores. A mesma seed gera sempre a mesma demo. |
| `referenceTime` | `today@14:50` | Relógio da demo. `now` usa a hora de abertura; `today@HH:MM` usa a data de hoje na hora indicada; uma string ISO fixa tudo. |
| `activeTenantId`, `tenants` | Conecta Telecom | Presets de white label (nome, cores, marca). |
| `productName`, `showPoweredBy` | Fleet Telemetry, sim | Nome do produto e rodapé "tecnologia Star2Go". |
| `customers` | 3 clientes, 280 veículos | Volumes por cliente e estados de operação. |
| `antennaMix` | Mini 60%, V4 35%, FHP 5% | Mix de antenas. |
| `causeMix` | energia 45%, instalação 15%, rede 25%, antena 10%, obstrução 5% | Mix de causas dos incidentes. |
| `incidentsPer100VehiclesPerMonth` | 36 | Volume de incidentes detectados pela telemetria. |
| `openIncidentsTarget` | 7 | Incidentes abertos ao iniciar (o evento de rede conta uma vez). |
| `truckRollCost` | R$ 1.400 | Custo médio de deslocamento. |
| `ticketsPer100VehiclesPerMonth` | 12 | Chamados de conectividade por 100 veículos por mês (ROI). |
| `remoteResolutionRate` | 55% | Percentual de chamados resolvidos remotamente com a solução (ROI). |
| `subscriptionPerVehicleMonth`, `modulePrice` | R$ 29, R$ 590 | Preços usados na calculadora de ROI. |
| `slaTarget` | 99,0% | Meta de disponibilidade. |
| `simulationSpeed` | 1x | Velocidade da simulação ao vivo. |

## Estrutura

```
src/
  app/            store (Zustand), layout, rotas, tema e white label
  data/
    config.ts     parâmetros da demo
    model/        tipos TypeScript
    generator/    geradores determinísticos: frota, incidentes, telemetria
  features/       uma pasta por tela (overview, vehicle, incidents, ...)
  components/     componentes compartilhados (KPI, badges, toasts)
  lib/            formatação pt-BR e rótulos
  test/           testes do gerador
```

## Roteiro da demo (7 minutos)

1. Visão geral (1 min). 280 veículos, 7 incidentes abertos, R$ economizado no mês. "Hoje ninguém sabe se o problema é a antena, a fonte, a instalação ou a rede. Aqui a resposta aparece antes de o cliente ligar."
2. Incidente de energia (1,5 min). Abrir o incidente do veículo com 6 reinícios e tensão a 9,4 V, ler a explicação, resolver remotamente e ver o KPI de custo evitado subir. "Esse deslocamento não aconteceu. Era a fonte, trocada na próxima parada na base."
3. Correlação de frota (1,5 min). Evento de rede em andamento em Imperatriz/MA. "Vinte e três veículos juntos é rede Starlink. Um sozinho com tensão baixa é o veículo. O técnico não sai para problema de rede."
4. Disparo ao vivo (1 min). No modo apresentação, disparar um incidente de obstrução em um veículo parado. "Isso é o que o NOC de vocês vê, com a marca de vocês."
5. SLA (1 min). Relatório da distribuidora, disponibilidade vs meta, divisão fornecedor vs cliente, relatório impresso. "Quando a falha é do lado do cliente, vocês provam. Quando é da rede, o cliente prova."
6. Linhas ociosas (0,5 min). Linhas sem veículo e o R$ por mês. "Vinte e duas linhas pagando sem ninguém usando."
7. ROI (0,5 min). Calculadora com os números do cliente. "Com os números de vocês, o payback fica em X meses. Proposta: piloto de 90 dias em 20 veículos."

## Estado das iterações

| Iteração | Conteúdo | Status |
| --- | --- | --- |
| 1 | Scaffold, tipos, gerador determinístico, visão geral com mapa, detalhe do veículo com gráficos | Entregue |
| 2 | Incidentes com explicação e evidência, correlação de frota, ações que atualizam KPIs | Pendente |
| 3 | SLA com relatório impresso, linhas e inventário, instaladoras, calculadora de ROI | Pendente |
| 4 | Modo apresentação com roteiro, disparo de incidentes, simulação ao vivo, white label, testes finais | Pendente |

## Mapa sem internet

O mapa usa tiles do OpenStreetMap. Se os tiles não carregarem (sem internet ou rede bloqueada), o painel troca automaticamente para um mapa em SVG com o contorno do Brasil e dos estados de operação, com os veículos posicionados por latitude e longitude. O botão "Mapa offline" no cabeçalho do mapa força esse modo para teste.
