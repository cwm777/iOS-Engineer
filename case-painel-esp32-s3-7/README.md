# Caixa para o painel Waveshare ESP32-S3-Touch-LCD-7

Caixa impressa em 3D para o painel de voos (Waveshare ESP32-S3-Touch-LCD-7, 800×480), com duas opções de base.

![Prévia](preview.png)

## Arquivos para imprimir (`stl/`)

| Arquivo | O que é | Tamanho | Como imprimir |
|---|---|---|---|
| `caixa.stl` | Corpo da caixa | 171,3 × 103,2 × 23,5 mm | Fundo na mesa (como está no arquivo), sem suporte |
| `base_porta_retrato.stl` | Base simples, berço inclinado 15° | 82 × 39 × 110 mm | Deitada sobre o perfil (como está no arquivo), sem suporte |
| `base_monitor.stl` | Base tipo monitor, inclinada 10° | 114 × 55 × 110 mm | Deitada sobre o perfil (como está no arquivo), sem suporte |

Sugestão: PLA ou PETG, camada 0,2 mm, 3 perímetros, 15–20 % de preenchimento.

## Montagem

1. Passe o cabo USB-C pelo rasgo lateral e ligue na placa.
2. Coloque o painel pela frente da caixa. As 4 abas roscadas da chapa traseira apoiam nos 4 postes.
3. Por trás, coloque 4 parafusos nos rebaixos (6,5 mm de diâmetro, 13,5 mm de profundidade).
   - Parafuso curto: **M3×6** (as abas são M3, conforme o desenho oficial).
     Não use parafuso mais comprido: ele pode encostar no LCD.
   - No fundo de cada rebaixo há uma película de 0,24 mm que permite imprimir sem suporte.
     Fure com o próprio parafuso ou com uma broca de 3,5 mm.
4. Base (opcional): 2 porcas M3 nos alojamentos sextavados por dentro da caixa e 2 parafusos **M3×12** por trás da base.
   A base porta-retrato também funciona só encaixada, sem parafusos.

O acesso USB é um recorte em "L" (parede esquerda + fundo) na altura da porta USB-C "USB" (a que fica ao lado do
módulo ESP32), então dá para ligar e desligar o carregador com a caixa montada.

## Medidas usadas

Do desenho oficial da Waveshare (vista traseira):

- Chapa traseira: 165,72 × 97,60 mm
- 4 abas M3: 126,20 mm entre centros na horizontal (19,76 mm de cada lado)
- Abas de cima a 13,64 mm da borda de cima (lado da antena); abas de baixo a 18,31 mm da borda de baixo
  (65,65 mm entre as fileiras — a fixação **não** é simétrica na vertical)

Medidas no painel:

- Do vidro da tela até o topo do componente mais alto: 20 mm (`ALTURA_TOTAL`)
- Espessura do módulo LCD, do vidro até a chapa traseira: 4 mm (`PAINEL_ESP`)
- Porta USB-C usada: a "USB", começando a 30,5 mm da borda de cima (centro ≈ 35 mm)

Estimadas (não constam no desenho oficial — conferir com paquímetro):

| Parâmetro no script | Valor | O que é |
|---|---|---|
| `ABA_H` | 2,5 mm | Altura das abas roscadas acima da chapa traseira |
| `USB_BOCA_X` | 33 mm | Até onde a janela traseira avança a partir da borda esquerda |

## Espessura

Profundidade da caixa = fundo (2,0) + folga (1,0) + `ALTURA_TOTAL` (20) + rebaixo da tela (0,5) = **23,5 mm**.

A posição do painel em profundidade é definida pelos postes, que encostam nas abas. Com `ABA_H` = 2,5 mm a tela fica
0,5 mm abaixo da borda e sobra 1 mm atrás dos componentes. Se as abas forem mais altas, a tela avança na mesma
diferença; se forem mais baixas, a tela recua e a folga atrás diminui (uma arruela entre o poste e a aba compensa).

## Ajustar e gerar de novo

```bash
pip install cadquery
python3 gerar_caixa.py
```

Todos os parâmetros estão no topo de `gerar_caixa.py`.
