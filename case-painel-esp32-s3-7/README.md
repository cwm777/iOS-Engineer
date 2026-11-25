# Caixa para o painel Waveshare ESP32-S3-Touch-LCD-7

Caixa impressa em 3D, tipo moldura, para o painel de voos (Waveshare ESP32-S3-Touch-LCD-7, 800×480), com duas opções de base.
A tela entra por trás da moldura e a tampa traseira fecha o conjunto.

![Prévia](preview.png)

## Arquivos para imprimir (`stl/`)

Imprima **uma** moldura e **uma** tampa. As versões com e sem inserto têm o mesmo contorno e combinam entre si.

| Arquivo | O que é | Tamanho | Como imprimir |
|---|---|---|---|
| `moldura_inserto.stl` | Frente: moldura + paredes, com 4 furos para inserto a quente M3 | 176,5 × 113,4 × 23 mm | Face da frente na mesa, sem suporte |
| `tampa_inserto.stl` | Tampa traseira com os postes e 2 ressaltos para inserto M3 (fixação da base) | 176,5 × 113,4 × 16,5 mm | Face de fora na mesa, sem suporte |
| `moldura.stl` | Mesma moldura, sem inserto: o parafuso abre rosca no plástico (furo-guia de 2,6 mm) | igual | igual |
| `tampa.stl` | Mesma tampa, sem inserto: porca M3 presa por dentro | igual | igual |
| `base_porta_retrato.stl` | Base simples, berço inclinado 15° | 83 × 39 × 110 mm | Deitada sobre o perfil, sem suporte |
| `base_monitor.stl` | Base tipo monitor, inclinada 10° | 114 × 55 × 110 mm | Deitada sobre o perfil, sem suporte |

Todos os arquivos já estão na posição de impressão. Caixa montada: 176,5 × 113,4 × 25 mm.
Sugestão: PLA ou PETG, camada 0,2 mm, 3 perímetros, 15–20 % de preenchimento.
A face da moldura fica com o acabamento da mesa de impressão.

## Insertos e parafusos

Insertos a quente M3 × 5 (comprimento) × 4,5 (diâmetro externo). Os furos têm 4,0 mm, com uma pequena entrada cônica.

- **Moldura** (`moldura_inserto.stl`): 4 insertos, um em cada canto da borda de trás. Furo de 9 mm de profundidade;
  assente o inserto rente à superfície. Sobra 1,5 mm de plástico em volta de cada inserto.
- **Tampa** (`tampa_inserto.stl`): 2 insertos, colocados por **dentro** da tampa, nos dois ressaltos. O parafuso da base
  entra por fora e puxa o inserto contra a tampa. Se algum plástico entrar no furo de passagem, limpe com um parafuso M3.

Parafusos:

- 4 × M3×6 — tampa nas abas roscadas do painel. Não use mais comprido: pode encostar no LCD.
- 4 × M3×8 ou M3×10 de cabeça abaulada (panela) — tampa na moldura. Os furos não são escareados: ficam a 3,75 mm da
  borda e um escareado não deixaria parede para imprimir. As cabeças ficam ~2,5 mm para fora, nos cantos de trás.
- 2 × M3×10 ou M3×12 — base na tampa (opcional). Na versão sem inserto, use M3×12 com 2 porcas M3.

## Montagem

1. Coloque os insertos com o ferro de solda (ou, na versão sem inserto, encaixe as 2 porcas por dentro da tampa).
2. Com a moldura virada para baixo, deite o painel dentro dela, com o cabo flat no alívio da parede de baixo.
3. Ligue o cabo USB-C na porta "USB" (ao lado do módulo ESP32) e deixe-o sair pelo rasgo da parede lateral.
4. Feche a tampa: os 4 postes apoiam nas abas roscadas do painel.
5. Parafuse os 4 M3×6 nos rebaixos da tampa (6,5 mm de diâmetro, 13,5 mm de profundidade).
   No fundo de cada rebaixo há uma película de 0,24 mm que permite imprimir sem suporte; fure com o próprio
   parafuso ou com uma broca de 3,5 mm.
6. Parafuse os 4 parafusos de cabeça abaulada dos cantos.
7. Base: 2 parafusos M3 por trás. A base porta-retrato também funciona só encaixada, sem parafusos.

O recorte da USB continua na tampa, então dá para ligar e desligar o carregador com a caixa fechada.

## Medidas usadas

Do desenho oficial da Waveshare:

- Chapa traseira: 165,72 × 97,60 mm
- 4 abas M3: 126,20 mm entre centros na horizontal (19,76 mm de cada lado); abas de cima a 13,64 mm da borda de cima,
  abas de baixo a 18,31 mm da borda de baixo
- Área visível: 153,84 × 85,632 mm. A posição dela dentro do painel foi lida no desenho (≈ 4,2 mm da borda esquerda e
  ≈ 3,4 mm da borda de cima); a abertura da moldura passa 1,2 mm da área visível em cada lado para cobrir esse erro.

Medidas no painel:

- Do vidro da tela até o topo do componente mais alto: 20 mm (`ALTURA_TOTAL`)
- Espessura do módulo LCD, do vidro até a chapa traseira: 4 mm (`PAINEL_ESP`)
- Porta USB-C usada: a "USB", começando a 30,5 mm da borda de cima (centro ≈ 35 mm)
- Cabo flat: sai no centro da borda de baixo, ≈ 34 mm de largura e ≈ 3,5 mm para fora (estimado pela foto).
  O alívio tem 42 mm de largura e 5,5 mm de profundidade (`FLAT_L`, `FLAT_PROF`).

Estimada (não consta no desenho oficial — conferir com paquímetro):

| Parâmetro no script | Valor | O que é |
|---|---|---|
| `ABA_H` | 2,5 mm | Altura das abas roscadas acima da chapa traseira |

## Moldura e espessura

A moldura visível tem 10,1 mm nos lados e em cima e 15,3 mm embaixo. A faixa de baixo é maior porque a tela tem uma
borda morta de 8 mm ali e o cabo flat precisa de espaço para a dobra. As paredes de cima e de baixo têm 7,5 mm para
alojar os insertos.

Profundidade = moldura na frente do vidro (1,6) + folga (0,4) + `ALTURA_TOTAL` (20) + folga (1,0) + tampa (2,0) = **25 mm**.

A posição do painel em profundidade é definida pelos postes da tampa, que encostam nas abas. Com `ABA_H` = 2,5 mm sobra
0,4 mm entre o vidro e a moldura. Se as abas forem mais altas que ~2,9 mm, a tampa não assenta: lixe os postes ou ajuste
`ABA_H`. Se forem mais baixas, sobra uma folga maior entre o vidro e a moldura.

## Ajustar e gerar de novo

```bash
pip install cadquery
python3 gerar_caixa.py
```

Todos os parâmetros estão no topo de `gerar_caixa.py`.
