#!/usr/bin/env python3
"""
Caixa para o painel Waveshare ESP32-S3-Touch-LCD-7 (800x480) + duas bases.

Gera 3 STLs (pasta ./stl):
  caixa.stl               corpo da caixa (painel entra pela frente, 4 parafusos por tras)
  base_porta_retrato.stl  base simples tipo porta-retrato (berco inclinado 15 graus)
  base_monitor.stl        base tipo monitor (pescoco + sapata, inclinada 10 graus)

Uso:  pip install cadquery && python3 gerar_caixa.py

Todas as medidas em mm. Eixos da caixa: X = direita (olhando a tela de frente),
Y = para cima, Z = do fundo (0) para a frente da tela.
"""
import math
import os

import cadquery as cq

# --------------------------------------------------------------------------
# MEDIDAS DO PAINEL (desenho oficial da Waveshare, vista traseira)
# --------------------------------------------------------------------------
PAINEL_L = 165.72       # largura total da chapa traseira
PAINEL_A = 97.60        # altura total da chapa traseira
FURO_DX = 126.20        # distancia horizontal entre as abas M3 (19,76 de cada lado)
ABA_TOPO = 13.64        # abas de cima: distancia ate a borda de CIMA (lado da antena)
ABA_BAIXO = 18.31       # abas de baixo: distancia ate a borda de BAIXO (lado do flat cable)
                        # (65,65 mm entre as duas fileiras)
ALTURA_TOTAL = 20.0     # do VIDRO da tela ate o topo do componente mais alto (medido: 2 cm)

PAINEL_ESP = 4.0        # espessura do modulo LCD, vidro ate a chapa traseira (medido: 0,4 cm)

# --- medida ASSUMIDA (conferir com paquimetro; ajustar e gerar de novo) ---
ABA_H = 2.5             # altura das abas roscadas acima da chapa traseira
FURO_D = 3.4            # furo passante do parafuso M3

# --- porta USB (olhando a tela de frente, as portas ficam viradas p/ a ESQUERDA)
# porta usada: a USB-C "USB" (ao lado do modulo ESP32), que comeca a 30,5 mm da borda
# de cima e tem ~9 mm de largura (centro ~35 mm).
USB_TOPO_MIN = 24.0     # inicio do rasgo, medido a partir da borda de CIMA do painel
USB_TOPO_MAX = 45.0     # fim do rasgo
USB_BOCA_X = 33.0       # ate onde a janela traseira avanca a partir da borda esquerda
                        # (a boca da USB fica ~25-30 mm para dentro da borda)

# --------------------------------------------------------------------------
# PARAMETROS DA CAIXA
# --------------------------------------------------------------------------
FOLGA = 0.4             # folga por lado entre painel e caixa
PAREDE = 2.4            # paredes laterais
FUNDO = 2.0             # parede do fundo
FOLGA_COMP = 1.0        # folga extra atras dos componentes (cobre erro de medida)
REBAIXO_TELA = 0.5      # quanto a tela fica abaixo da borda frontal
RAIO_EXT = 4.0          # raio dos cantos externos
POSTE_D = 10.0          # diametro dos postes (a placa passa a ~7 mm do centro do furo)
REBAIXO_D = 6.5         # rebaixo para cabeca do parafuso M3 / chave
PISO_POSTE = 3.0        # espessura de plastico sob a cabeca do parafuso
MEMBRANA = 0.24         # camada de sacrificio p/ imprimir o rebaixo sem suporte
VENTILACAO = True

# fixacao das bases: 2x M3 com porca presa por dentro da caixa
BASE_FURO_X = 35.0      # +/- em X
BASE_FURO_Y = -35.0     # em Y (centro do painel = 0)
PORCA_AF = 5.7          # porca M3 (5.5 entre faces) + folga
PORCA_H = 2.6
BOSS_D = 12.0
BOSS_H = 2.5

# derivados
CAV_L = PAINEL_L + 2 * FOLGA
CAV_A = PAINEL_A + 2 * FOLGA
EXT_L = CAV_L + 2 * PAREDE
EXT_A = CAV_A + 2 * PAREDE
Z_TELA = FUNDO + FOLGA_COMP + ALTURA_TOTAL      # face da tela
Z_CHAPA = Z_TELA - PAINEL_ESP                  # plano da chapa traseira do painel
Z_ABA = Z_CHAPA - ABA_H                        # topo dos postes (encosta nas abas)
PROF = Z_TELA + REBAIXO_TELA                   # profundidade total da caixa
POSTES = [(sx * FURO_DX / 2, y) for sx in (-1, 1)
          for y in (PAINEL_A / 2 - ABA_TOPO, -PAINEL_A / 2 + ABA_BAIXO)]
V_FURO_BASE = BASE_FURO_Y + EXT_A / 2          # altura dos furos da base acima do fundo externo

LARG_BASE = 110.0       # largura (em X) das duas bases
FOLGA_BERCO = 0.6


# --------------------------------------------------------------------------
# CAIXA
# --------------------------------------------------------------------------
def caixa():
    corpo = cq.Workplane("XY").rect(EXT_L, EXT_A).extrude(PROF)
    corpo = corpo.edges("|Z").fillet(RAIO_EXT)
    corpo = corpo.faces(">Z").edges().fillet(1.2)
    corpo = corpo.faces("<Z").edges().chamfer(1.0)

    cav = (cq.Workplane("XY").workplane(offset=FUNDO).rect(CAV_L, CAV_A)
           .extrude(PROF - FUNDO + 1).edges("|Z").fillet(1.0))
    corpo = corpo.cut(cav)

    # postes + nervuras ate a parede mais proxima
    for (x, y) in POSTES:
        poste = (cq.Workplane("XY").workplane(offset=FUNDO - 0.01).center(x, y)
                 .circle(POSTE_D / 2).extrude(Z_ABA - FUNDO + 0.01))
        sy = 1 if y > 0 else -1
        y_par = sy * CAV_A / 2
        nerv = (cq.Workplane("XY").workplane(offset=FUNDO - 0.01)
                .center(x, (y + y_par) / 2).rect(2.4, abs(y_par - y) + 0.02)
                .extrude(Z_ABA - 2.5 - FUNDO))
        corpo = corpo.union(poste).union(nerv)

    # ressaltos com alojamento de porca M3 para as bases
    for sx in (-1, 1):
        boss = (cq.Workplane("XY").workplane(offset=FUNDO - 0.01)
                .center(sx * BASE_FURO_X, BASE_FURO_Y).circle(BOSS_D / 2)
                .extrude(BOSS_H + 0.01))
        corpo = corpo.union(boss)

    # furos dos postes: rebaixo por tras + membrana + furo passante
    z_reb = Z_ABA - PISO_POSTE
    for (x, y) in POSTES:
        reb = cq.Workplane("XY").workplane(offset=-1).center(x, y).circle(REBAIXO_D / 2).extrude(z_reb + 1)
        furo = (cq.Workplane("XY").workplane(offset=z_reb + MEMBRANA).center(x, y)
                .circle(FURO_D / 2).extrude(PISO_POSTE + 1))
        corpo = corpo.cut(reb).cut(furo)

    # furos + alojamento sextavado das porcas
    for sx in (-1, 1):
        furo = (cq.Workplane("XY").workplane(offset=-1).center(sx * BASE_FURO_X, BASE_FURO_Y)
                .circle(1.7).extrude(FUNDO + BOSS_H + 2))
        hexa = (cq.Workplane("XY").workplane(offset=FUNDO + BOSS_H - PORCA_H)
                .center(sx * BASE_FURO_X, BASE_FURO_Y).polygon(6, PORCA_AF / math.cos(math.pi / 6))
                .extrude(PORCA_H + 1))
        corpo = corpo.cut(furo).cut(hexa)

    # acesso USB: rasgo na parede esquerda + janela no fundo (formato em "L")
    y1 = PAINEL_A / 2 - USB_TOPO_MAX
    y2 = PAINEL_A / 2 - USB_TOPO_MIN
    z_top = Z_CHAPA - 2.0
    ch = 6.0
    rasgo = (cq.Workplane("YZ").workplane(offset=-EXT_L / 2 - 1)
             .polyline([(y1, -1), (y2, -1), (y2, z_top - ch), (y2 - ch, z_top),
                        (y1 + ch, z_top), (y1, z_top - ch)]).close()
             .extrude(PAREDE + 1.5))
    x_fim = -PAINEL_L / 2 + USB_BOCA_X
    comp = x_fim + EXT_L / 2 + 5
    janela = (cq.Workplane("XY").workplane(offset=-1)
              .center(-EXT_L / 2 - 5 + comp / 2, (y1 + y2) / 2).rect(comp, y2 - y1)
              .extrude(FUNDO + 1.01).edges("|Z").fillet(4.0))
    corpo = corpo.cut(rasgo).cut(janela)

    # ventilacao no fundo (parte de cima, centro)
    if VENTILACAO:
        for i in range(-3, 4):
            slot = (cq.Workplane("XY").workplane(offset=-1).center(i * 8.0, 26)
                    .slot2D(24, 3.0, 90).extrude(FUNDO + 2))
            corpo = corpo.cut(slot)
    return corpo


# --------------------------------------------------------------------------
# BASES (perfil 2D extrudado na largura; imprimir deitado sobre o perfil)
# perfil: p = para tras (+), q = para cima; mesa em q = 0
# --------------------------------------------------------------------------
class Quadro:
    """Converte coordenadas da caixa (u = para tras do fundo, v = acima da face
    inferior externa) para o perfil da base, com a caixa inclinada 'ang' graus."""

    def __init__(self, ang, pb):
        self.t = math.radians(ang)
        self.pb = pb

    def pq(self, u, v):
        c, s = math.cos(self.t), math.sin(self.t)
        return (self.pb[0] + u * c + v * s, self.pb[1] - u * s + v * c)

    def ret(self, u0, u1, v0, v1, larg=LARG_BASE):
        pts = [self.pq(u0, v0), self.pq(u1, v0), self.pq(u1, v1), self.pq(u0, v1)]
        return cq.Workplane("XY").polyline(pts).close().extrude(larg)


def ret_mesa(p0, p1, q0, q1, larg=LARG_BASE):
    return cq.Workplane("XY").polyline([(p0, q0), (p1, q0), (p1, q1), (p0, q1)]).close().extrude(larg)


def arredonda(solido, pontos, raio, tol=0.6):
    """Arredonda as arestas verticais (paralelas a largura) proximas aos pontos (p, q)."""
    for (p, q) in pontos:
        sel = cq.selectors.BoxSelector((p - tol, q - tol, -1), (p + tol, q + tol, LARG_BASE + 1))
        try:
            solido = solido.edges(sel).edges("|Z").fillet(raio)
        except Exception as e:  # aresta nao encontrada / raio grande demais
            print(f"  aviso: sem arredondamento em ({p:.1f},{q:.1f}) r={raio}: {type(e).__name__}")
    return solido


def furos_base(solido, quadro, esp_placa):
    """Furos passantes M3 na placa que encosta no fundo da caixa."""
    c, s = math.cos(quadro.t), math.sin(quadro.t)
    for sx in (-1, 1):
        z = LARG_BASE / 2 + sx * BASE_FURO_X
        p0 = quadro.pq(-2, V_FURO_BASE)
        furo = (cq.Workplane(cq.Plane(origin=(p0[0], p0[1], z), xDir=(0, 0, 1), normal=(c, -s, 0)))
                .circle(1.75).extrude(esp_placa + 4))
        solido = solido.cut(furo)
    return solido


def base_porta_retrato(ang=15.0):
    """Berco simples: a caixa apoia no fundo do berco e encosta na placa traseira."""
    esp_placa, h_placa, h_labio, esp_labio, sapata, tras = 5.0, 38.0, 4.0, 3.0, 4.5, 48.0
    qd = Quadro(ang, (0.0, 3.0 * math.cos(math.radians(ang))))
    u_frente = -(PROF + FOLGA_BERCO)
    berco = qd.ret(u_frente - esp_labio, esp_placa, -30, h_labio)
    placa = qd.ret(0, esp_placa, -30, h_placa)
    p_tras = qd.pq(esp_placa, 0)[0] + tras
    p_frente = qd.pq(u_frente - esp_labio, h_labio)[0]
    piso = ret_mesa(p_frente + 8, p_tras, 0, sapata)
    s = berco.union(placa).union(piso)
    s = s.cut(ret_mesa(-200, 200, -100, 0))                      # corta abaixo da mesa
    s = s.cut(qd.ret(u_frente, 0, 0, 300, LARG_BASE))            # espaco da caixa
    s = furos_base(s, qd, esp_placa)
    # arredondamentos
    q_canto = sapata
    p_canto = qd.pq(esp_placa, 0)[0] + (q_canto - qd.pq(esp_placa, 0)[1]) * math.tan(qd.t)
    s = arredonda(s, [(p_canto, q_canto)], 8.0)                                   # reforco placa/sapata
    s = arredonda(s, [qd.pq(0, h_placa), qd.pq(esp_placa, h_placa)], 2.0)         # topo da placa
    s = arredonda(s, [(p_tras, sapata)], 3.0)                                     # ponta traseira
    s = arredonda(s, [qd.pq(u_frente - esp_labio, h_labio), qd.pq(u_frente, h_labio)], 1.0)
    return s, qd


def base_monitor(ang=10.0):
    """Base tipo monitor: sapata na mesa + pescoco inclinado que parafusa no fundo da caixa."""
    esp_pesc, h_pesc, h0, sapata = 6.0, 34.0, 22.0, 6.0
    prat_prof, prat_esp = 12.0, 4.0
    qd = Quadro(ang, (0.0, h0))
    pescoco = qd.ret(0, esp_pesc, -60, h_pesc)
    prateleira = qd.ret(-prat_prof, esp_pesc, -prat_esp, 0)       # apoio sob a caixa
    p_fr, p_tr = -52.0, 62.0
    piso = ret_mesa(p_fr, p_tr, 0, sapata)
    s = pescoco.union(prateleira).union(piso)
    s = s.cut(ret_mesa(-200, 200, -100, 0))
    s = s.cut(qd.ret(-(PROF + 30), 0, 0, 300))
    s = furos_base(s, qd, esp_pesc)
    tg = math.tan(qd.t)
    # encontro pescoco/sapata (frente e tras) com raio grande
    pf = qd.pq(0, 0)[0] - (qd.pq(0, 0)[1] - sapata) * tg
    pt = qd.pq(esp_pesc, 0)[0] - (qd.pq(esp_pesc, 0)[1] - sapata) * tg
    s = arredonda(s, [(pf, sapata)], 8.0)
    s = arredonda(s, [(pt, sapata)], 14.0)
    # encontro prateleira/pescoco
    s = arredonda(s, [qd.pq(0, -prat_esp)], 5.0)
    s = arredonda(s, [qd.pq(-prat_prof, -prat_esp), qd.pq(-prat_prof, 0)], 1.2)
    s = arredonda(s, [qd.pq(0, h_pesc), qd.pq(esp_pesc, h_pesc)], 2.5)
    s = arredonda(s, [(p_fr, sapata), (p_tr, sapata)], 4.0)
    s = arredonda(s, [(p_fr, 0), (p_tr, 0)], 1.0)
    return s, qd


# --------------------------------------------------------------------------
# Modelo de referencia do painel (so para conferencia / imagens, nao imprimir)
# --------------------------------------------------------------------------
def painel_ref():
    lcd = cq.Workplane("XY").workplane(offset=Z_CHAPA).rect(PAINEL_L, PAINEL_A).extrude(PAINEL_ESP)
    for (x, y) in POSTES:
        aba = cq.Workplane("XY").workplane(offset=Z_ABA).center(x, y).rect(12, 8).extrude(ABA_H)
        lcd = lcd.union(aba)
    # placa (estimado pelo desenho oficial): ~27 a 132 mm da borda esquerda,
    # de ~24,6 mm acima da borda de baixo ate ~5 mm da borda de cima
    pcb = (cq.Workplane("XY").workplane(offset=Z_CHAPA - 4).center(-3.4, 9.8).rect(105, 68).extrude(1.6))
    return lcd, pcb


def caixa_no_quadro(solido, qd):
    """Coloca um solido da caixa na posicao montada sobre a base (perfil p,q; largura em Z)."""
    s = solido.translate((0, EXT_A / 2, 0))                       # y = v
    s = s.rotate((0, 0, 0), (0, 1, 0), 90)                        # X->-Z, Z->X
    s = s.mirror("YZ")                                            # Z da caixa -> -p (u = -Z)
    s = s.rotate((0, 0, 0), (0, 0, 1), -math.degrees(qd.t))
    return s.translate((qd.pb[0], qd.pb[1], LARG_BASE / 2))


def main():
    saida = os.path.join(os.path.dirname(os.path.abspath(__file__)), "stl")
    os.makedirs(saida, exist_ok=True)
    cx = caixa()
    b1, q1 = base_porta_retrato()
    b2, q2 = base_monitor()
    lcd, pcb = painel_ref()
    exp = dict(tolerance=0.02, angularTolerance=0.15)
    cq.exporters.export(cx, os.path.join(saida, "caixa.stl"), **exp)
    cq.exporters.export(b1, os.path.join(saida, "base_porta_retrato.stl"), **exp)
    cq.exporters.export(b2, os.path.join(saida, "base_monitor.stl"), **exp)

    # arquivos de conferencia (montagens) -> pasta separada
    ref = os.path.join(os.path.dirname(saida), "_ref")
    os.makedirs(ref, exist_ok=True)
    cq.exporters.export(lcd, os.path.join(ref, "lcd.stl"), **exp)
    cq.exporters.export(pcb, os.path.join(ref, "pcb.stl"), **exp)
    for nome, qd in (("porta_retrato", q1), ("monitor", q2)):
        cq.exporters.export(caixa_no_quadro(cx, qd), os.path.join(ref, f"caixa_em_{nome}.stl"), **exp)
        cq.exporters.export(caixa_no_quadro(lcd, qd), os.path.join(ref, f"lcd_em_{nome}.stl"), **exp)

    print(f"Caixa: {EXT_L:.1f} x {EXT_A:.1f} x {PROF:.1f} mm")
    print(f"Chapa traseira do painel em z={Z_CHAPA:.1f}; topo dos postes z={Z_ABA:.1f}; tela z={Z_TELA:.1f}")
    print(f"Rebaixo dos parafusos: {Z_ABA - PISO_POSTE:.1f} mm de profundidade, {REBAIXO_D} mm de diametro")
    inter = cx.intersect(lcd).val().Volume()
    inter_pcb = cx.intersect(pcb).val().Volume()
    print(f"Interferencia caixa x painel: {inter:.3f} mm3 ; caixa x placa: {inter_pcb:.3f} mm3")
    for nome, b, qd in (("porta_retrato", b1, q1), ("monitor", b2, q2)):
        v = b.intersect(caixa_no_quadro(cx, qd)).val().Volume()
        print(f"Interferencia base {nome} x caixa: {v:.3f} mm3 ; volume base {b.val().Volume()/1000:.1f} cm3")
    print(f"Volume caixa: {cx.val().Volume()/1000:.1f} cm3")


if __name__ == "__main__":
    main()
