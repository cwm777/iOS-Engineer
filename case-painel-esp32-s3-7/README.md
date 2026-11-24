# Caixa para o painel Waveshare ESP32-S3-Touch-LCD-7

Caixa impressa em 3D para o painel de voos (Waveshare ESP32-S3-Touch-LCD-7, 800×480), com duas opções de base.

![Prévia](preview.png)

## Arquivos para imprimir (`stl/`)

| Arquivo | O que é | Tamanho | Como imprimir |
|---|---|---|---|
| `caixa.stl` | Corpo da caixa | 173 × 105 × 33 mm | Fundo na mesa (como está no arquivo), sem suporte |
| `base_porta_retrato.stl` | Base simples, berço inclinado 15° | 92 × 39 × 110 mm | Deitada sobre o perfil (como está no arquivo), sem suporte |
| `base_monitor.stl` | Base tipo monitor, inclinada 10° | 114 × 55 × 110 mm | Deitada sobre o perfil (como está no arquivo), sem suporte |

Sugestão: PLA ou PETG, camada 0,2 mm, 3 perímetros, 15–20 % de preenchimento.

## Montagem

1. Passe o cabo USB-C pelo rasgo lateral e ligue na placa.
2. Coloque o painel pela frente da caixa. As 4 abas roscadas da chapa traseira apoiam nos 4 postes.
3. Por trás, coloque 4 parafusos nos rebaixos (7 mm de diâmetro, 19,5 mm de profundidade).
   - Parafuso curto: **6 mm de comprimento** (M3×6 ou M2.5×6, conforme a rosca das abas).
     Não use parafuso mais comprido: ele pode encostar no LCD.
   - No fundo de cada rebaixo há uma película de 0,24 mm que permite imprimir sem suporte.
     Fure com o próprio parafuso ou com uma broca de 3,5 mm.
4. Base (opcional): 2 porcas M3 nos alojamentos sextavados por dentro da caixa e 2 parafusos **M3×12** por trás da base.
   A base porta-retrato também funciona só encaixada, sem parafusos.

O acesso USB é um recorte em "L" (parede esquerda + fundo) que expõe as duas portas USB-C, então dá para
ligar e desligar o carregador com a caixa montada.

## Medidas usadas

Do desenho à mão:

- Painel: 166 × 98 mm
- Furos de fixação: 126 × 70 mm entre centros (≈ 19,5 mm e 13,5 mm das bordas)
- Componentes atrás do painel: 20 mm (a caixa deixa 22 mm)

Estimadas (não estavam no desenho — conferir com paquímetro):

| Parâmetro no script | Valor | O que é |
|---|---|---|
| `PAINEL_ESP` | 7,0 mm | Espessura do módulo LCD, do vidro até a chapa traseira |
| `ABA_H` | 2,5 mm | Altura das abas roscadas acima da chapa traseira |
| `USB_TOPO_MIN` / `USB_TOPO_MAX` | 26 / 62 mm | Faixa do rasgo USB, medida a partir da borda de cima do painel |
| `USB_BOCA_X` | 37 mm | Até onde a janela traseira avança a partir da borda esquerda |

Com esses valores a tela fica 1 mm abaixo da borda da caixa. Se a soma real `PAINEL_ESP + ABA_H` for diferente de 9,5 mm,
a tela fica mais funda ou mais saliente na mesma proporção.

## Ajustar e gerar de novo

```bash
pip install cadquery
python3 gerar_caixa.py
```

Todos os parâmetros estão no topo de `gerar_caixa.py`.
