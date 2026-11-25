#!/usr/bin/env python3
"""
Caixa tipo moldura para o painel Waveshare ESP32-S3-Touch-LCD-7 (800x480) + duas bases.

Gera 6 STLs (pasta ./stl), ja na posicao de impressao:
  moldura.stl             frente: moldura + paredes (a tela entra por tras); a tampa fecha com
                          parafusos M3 que abrem rosca no plastico
  moldura_inserto.stl     mesma moldura, com alojamento para inserto a quente M3 nos 4 pontos
  tampa.stl               tampa traseira com os postes que prendem o painel (base presa com porca M3)
  tampa_inserto.stl       mesma tampa, com alojamento para inserto a quente M3 no lugar da porca
  base_porta_retrato.stl  base simples tipo porta-retrato (berco inclinado 15 graus)
  base_monitor.stl        base tipo monitor (pescoco + sapata, inclinada 10 graus)

Uso:  pip install cadquery && python3 gerar_caixa.py

Medidas em mm. Os parametros usam a vista de FRENTE: x = direita, y = para cima,
origem no centro da chapa traseira do painel. Profundidade z: 0 = face da moldura,
crescendo para tras.
"""
import math
import os

import cadquery as cq

# --------------------------------------------------------------------------
# MEDIDAS DO PAINEL (desenho oficial da Waveshare)
# --------------------------------------------------------------------------
PAINEL_L = 165.72       # largura total da chapa traseira
PAINEL_A = 97.60        # altura total da chapa traseira
FURO_DX = 126.20        # distancia horizontal entre as abas M3 (19,76 de cada lado)
ABA_TOPO = 13.64        # abas de cima: distancia ate a borda de CIMA (lado da antena)
ABA_BAIXO = 18.31       # abas de baixo: distancia ate a borda de BAIXO (lado do cabo flat)
AREA_L = 153.84         # area visivel da tela
AREA_A = 85.632
AREA_ESQ = 4.16         # borda esquerda do painel ate a area visivel (lido no desenho)
AREA_TOPO = 3.40        # borda de cima do painel ate a area visivel (lido no desenho)

# --- medidas tiradas no painel ---
ALTURA_TOTAL = 20.0     # do VIDRO da tela ate o topo do componente mais alto
PAINEL_ESP = 4.0        # espessura do modulo LCD (vidro ate a chapa traseira)

# --- medida ASSUMIDA (conferir com paquimetro; ajustar e gerar de novo) ---
ABA_H = 2.5             # altura das abas roscadas acima da chapa traseira

# --- cabo flat: sai pela borda de baixo, no centro ---
FLAT_L = 42.0           # largura do alivio (o cabo tem ~34 mm)
FLAT_PROF = 5.5         # quanto o alivio desce abaixo da borda do painel (o cabo sai ~3,5 mm)

# --- porta USB-C "USB" (ao lado do ESP32), virada para a ESQUERDA na vista de frente.
# Comeca a 30,5 mm da borda de cima e tem ~9 mm de largura (centro ~35 mm).
USB_TOPO_MIN = 24.0     # inicio do rasgo, medido a partir da borda de CIMA do painel
USB_TOPO_MAX = 45.0     # fim do rasgo
USB_BOCA_X = 33.0       # ate onde a janela da tampa avanca a partir da borda esquerda do painel

# --------------------------------------------------------------------------
# PARAMETROS DA CAIXA
# --------------------------------------------------------------------------
FOLGA = 0.4             # folga por lado entre painel e moldura
MARGEM_JANELA = 1.2     # quanto a abertura da moldura passa da area visivel, por lado
LABIO = 1.6             # espessura da moldura na frente do vidro
FOLGA_VIDRO = 0.4       # folga entre a moldura e o vidro
PAREDE = 3.2            # parede mais fina (lado direito); define a largura da moldura
PAREDE_FLAT = 2.0       # parede abaixo do alivio do cabo flat
TAMPA = 2.0             # espessura da tampa traseira
FOLGA_COMP = 1.0        # folga atras dos componentes (cobre erro de medida)
RAIO_EXT = 4.0          # raio dos cantos externos
POSTE_D = 10.0          # diametro dos postes (a placa passa a ~7 mm do centro do furo)
FURO_D = 3.4            # furo passante M3
REBAIXO_D = 6.5         # rebaixo para cabeca do parafuso M3 / chave
PISO_POSTE = 3.0        # espessura de plastico sob a cabeca do parafuso
MEMBRANA = 0.24         # camada de sacrificio p/ imprimir o rebaixo sem suporte
FURO_GUIA = 2.6         # furo-guia na moldura para parafuso M3 abrir rosca no plastico
FURO_GUIA_PROF = 12.0
VENTILACAO = True

# fixacao das bases: 2x M3 com porca presa por dentro da tampa
BASE_FURO_DX = 35.0     # +/- em relacao ao centro da caixa
BASE_FURO_Y = -38.0     # em y (faixa livre abaixo da placa)
PORCA_AF = 5.7          # porca M3 (5,5 entre faces) + folga
PORCA_H = 2.6
BOSS_D = 12.0
BOSS_H = 2.5
# alternativa a porca: inserto roscado a quente M3 x 5 (comprimento) x 4,5 (diametro externo),
# colocado por DENTRO da tampa; o parafuso da base entra por fora e puxa o inserto contra a tampa
INSERTO_L = 5.0
INSERTO_D = 4.5
INSERTO_FURO = 4.0      # furo para o inserto (diametro externo - 0,5)
INSERTO_FOLGA = 0.6     # espaco extra no fundo para o plastico deslocado
INSERTO_PAREDE = 2.25   # plastico em volta do inserto
INSERTO_FLANGE = 0.8    # plastico da tampa que fica entre o inserto e a face de fora
INSERTO_PROF_MOLDURA = 9.0  # furo do inserto na moldura (inserto + espaco p/ a ponta do parafuso)

# --------------------------------------------------------------------------
# derivados (vista de frente)
# --------------------------------------------------------------------------
PX, PY = PAINEL_L / 2, PAINEL_A / 2
AX0 = -PX + AREA_ESQ                      # area visivel
AX1 = AX0 + AREA_L
AY1 = PY - AREA_TOPO
AY0 = AY1 - AREA_A
JX0, JX1 = AX0 - MARGEM_JANELA, AX1 + MARGEM_JANELA   # abertura da moldura
JY0, JY1 = AY0 - MARGEM_JANELA, AY1 + MARGEM_JANELA
CX0, CX1 = -PX - FOLGA, PX + FOLGA                    # cavidade do painel
CY0, CY1 = -PY - FOLGA, PY + FOLGA
EX1 = CX1 + PAREDE                                    # externo: direita com parede minima
BORDA = EX1 - JX1                                     # largura da moldura (dir = esq = cima)
EX0 = JX0 - BORDA
EY1 = JY1 + BORDA
EY0 = CY0 - FLAT_PROF - PAREDE_FLAT                   # embaixo: espaco do cabo flat
EXT_L, EXT_A = EX1 - EX0, EY1 - EY0
XC = (EX0 + EX1) / 2                                  # centro da caixa

Z_VIDRO = LABIO + FOLGA_VIDRO
Z_CHAPA = Z_VIDRO + PAINEL_ESP
Z_ABA = Z_CHAPA + ABA_H                               # topo das abas = ponta dos postes
Z_TAMPA = Z_VIDRO + ALTURA_TOTAL + FOLGA_COMP         # face interna da tampa
PROF = Z_TAMPA + TAMPA                                # profundidade total

POSTES = [(sx * FURO_DX / 2, y) for sx in (-1, 1) for y in (PY - ABA_TOPO, -PY + ABA_BAIXO)]
# 4 parafusos que fecham a tampa na moldura (no meio das paredes grossas de cima e de baixo)
FECHO_YT, FECHO_YB = EY1 - (EY1 - CY1) / 2, EY0 + (CY0 - EY0) / 2
FECHO = [(EX0 + 3.9, FECHO_YT), (EX1 - 5.0, FECHO_YT),
         (EX0 + 3.9, FECHO_YB), (EX1 - 5.0, FECHO_YB)]
USB_Y0, USB_Y1 = PY - USB_TOPO_MAX, PY - USB_TOPO_MIN
V_FURO_BASE = BASE_FURO_Y - EY0                       # altura dos furos da base acima do fundo

LARG_BASE = 110.0       # largura das duas bases
FOLGA_BERCO = 0.6


# O modelo e construido na vista de TRAS (X = -x), para que z cresca para tras
# num sistema de mao direita.
def caixa_ret(x0, x1, y0, y1, z0, z1):
    """Bloco dado em coordenadas da vista de frente."""
    return (cq.Workplane("XY").workplane(offset=z0)
            .center(-(x0 + x1) / 2, (y0 + y1) / 2).rect(abs(x1 - x0), abs(y1 - y0)).extrude(z1 - z0))


def cil(x, y, z0, z1, d):
    return cq.Workplane("XY").workplane(offset=z0).center(-x, y).circle(d / 2).extrude(z1 - z0)


# --------------------------------------------------------------------------
# MOLDURA (frente + paredes) -- imprimir com a face da frente na mesa
# --------------------------------------------------------------------------
def moldura(inserto=False):
    """inserto=False: furo-guia para parafuso abrir rosca; inserto=True: inserto a quente M3."""
    m = caixa_ret(EX0, EX1, EY0, EY1, 0, Z_TAMPA).edges("|Z").fillet(RAIO_EXT)
    m = m.faces("<Z").edges().chamfer(0.8)
    # abertura da tela, chanfrada para fora
    ch = LABIO - 0.6
    m = m.cut(caixa_ret(JX0, JX1, JY0, JY1, -1, LABIO + 1))
    funil = (cq.Workplane("XY").center(-(JX0 + JX1) / 2, (JY0 + JY1) / 2)
             .rect(JX1 - JX0 + 2 * ch, JY1 - JY0 + 2 * ch).extrude(ch, taper=45))
    m = m.cut(funil)
    # cavidade do painel (aberta para tras)
    m = m.cut(caixa_ret(CX0, CX1, CY0, CY1, LABIO, Z_TAMPA + 1).edges("|Z").fillet(0.8))
    # alivio do cabo flat (embaixo, no centro)
    m = m.cut(caixa_ret(-FLAT_L / 2, FLAT_L / 2, CY0 - FLAT_PROF, CY0 + 1, LABIO, Z_TAMPA + 1)
              .edges("|Z").fillet(1.5))
    # rasgo do cabo USB na parede esquerda (aberto para tras)
    m = m.cut(caixa_ret(EX0 - 1, CX0 + 1, USB_Y0, USB_Y1, Z_CHAPA + 2.0, Z_TAMPA + 1))
    # furos-guia para os 4 parafusos da tampa
    for (x, y) in FECHO:
        if inserto:
            m = m.cut(cil(x, y, Z_TAMPA - INSERTO_PROF_MOLDURA, Z_TAMPA + 1, INSERTO_FURO))
            guia = cq.Solid.makeCone(INSERTO_FURO / 2 + 0.4, INSERTO_FURO / 2, 0.4,
                                     pnt=cq.Vector(-x, y, Z_TAMPA + 0.01), dir=cq.Vector(0, 0, -1))
            m = m.cut(cq.Workplane("XY").add(guia))
        else:
            m = m.cut(cil(x, y, Z_TAMPA - FURO_GUIA_PROF, Z_TAMPA + 1, FURO_GUIA))
    return m


# --------------------------------------------------------------------------
# TAMPA TRASEIRA -- imprimir com a face de fora na mesa
# --------------------------------------------------------------------------
def tampa(inserto=False):
    """inserto=False: porca M3 presa por dentro; inserto=True: inserto a quente M3."""
    if inserto:
        prof_furo = INSERTO_L + INSERTO_FOLGA
        boss_h = INSERTO_FLANGE + prof_furo - TAMPA
        boss_d = INSERTO_D + 2 * INSERTO_PAREDE
    else:
        boss_h, boss_d = BOSS_H, BOSS_D
    t = caixa_ret(EX0, EX1, EY0, EY1, Z_TAMPA, PROF).edges("|Z").fillet(RAIO_EXT)
    t = t.faces(">Z").edges().chamfer(0.5)
    for (x, y) in POSTES:
        t = t.union(cil(x, y, Z_ABA, Z_TAMPA + 0.01, POSTE_D))
    furos_b = [(XC - BASE_FURO_DX, BASE_FURO_Y), (XC + BASE_FURO_DX, BASE_FURO_Y)]
    for (x, y) in furos_b:
        t = t.union(cil(x, y, Z_TAMPA - boss_h, Z_TAMPA + 0.01, boss_d))
    # postes: rebaixo por fora + membrana + furo passante
    z_reb = Z_ABA + PISO_POSTE
    for (x, y) in POSTES:
        t = t.cut(cil(x, y, z_reb, PROF + 1, REBAIXO_D))
        t = t.cut(cil(x, y, Z_ABA - 1, z_reb - MEMBRANA, FURO_D))
    # furos das bases + alojamento da porca ou do inserto (por dentro)
    for (x, y) in furos_b:
        t = t.cut(cil(x, y, Z_TAMPA - boss_h - 1, PROF + 1, 3.4))
        if inserto:
            z_topo = Z_TAMPA - boss_h
            t = t.cut(cil(x, y, z_topo - 1, PROF - INSERTO_FLANGE, INSERTO_FURO))
            guia = cq.Solid.makeCone(INSERTO_FURO / 2 + 0.4, INSERTO_FURO / 2, 0.4,
                                     pnt=cq.Vector(-x, y, z_topo - 0.01), dir=cq.Vector(0, 0, 1))
            t = t.cut(cq.Workplane("XY").add(guia))
        else:
            hexa = (cq.Workplane("XY").workplane(offset=Z_TAMPA - boss_h - 1).center(-x, y)
                    .polygon(6, PORCA_AF / math.cos(math.pi / 6)).extrude(PORCA_H + 1))
            t = t.cut(hexa)
    # 4 parafusos de fechamento: furo passante + escareado por fora
    for (x, y) in FECHO:
        t = t.cut(cil(x, y, Z_TAMPA - 1, PROF + 1, FURO_D))
        cone = cq.Solid.makeCone(3.1, 1.7, 1.4, pnt=cq.Vector(-x, y, PROF + 0.01), dir=cq.Vector(0, 0, -1))
        t = t.cut(cq.Workplane("XY").add(cone))
    # janela de acesso a USB (continua o rasgo da moldura)
    t = t.cut(caixa_ret(EX0 - 5, -PX + USB_BOCA_X, USB_Y0, USB_Y1, Z_TAMPA - 1, PROF + 1)
              .edges("|Z").fillet(3.0))
    # ventilacao
    if VENTILACAO:
        for i in range(-3, 4):
            slot = (cq.Workplane("XY").workplane(offset=Z_TAMPA - 1).center(-(XC + i * 8.0), 26)
                    .slot2D(24, 3.0, 90).extrude(TAMPA + 2))
            t = t.cut(slot)
    return t


def para_impressao_tampa(t):
    return t.rotate((0, 0, 0), (1, 0, 0), 180).translate((0, 0, PROF))


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
    """Arredonda as arestas paralelas a largura proximas aos pontos (p, q)."""
    for (p, q) in pontos:
        sel = cq.selectors.BoxSelector((p - tol, q - tol, -1), (p + tol, q + tol, LARG_BASE + 1))
        try:
            solido = solido.edges(sel).edges("|Z").fillet(raio)
        except Exception as e:  # aresta nao encontrada / raio grande demais
            print(f"  aviso: sem arredondamento em ({p:.1f},{q:.1f}) r={raio}: {type(e).__name__}")
    return solido


def furos_base(solido, quadro, esp_placa):
    """Furos passantes M3 na placa que encosta na tampa."""
    c, s = math.cos(quadro.t), math.sin(quadro.t)
    for sx in (-1, 1):
        z = LARG_BASE / 2 + sx * BASE_FURO_DX
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
    q_canto = sapata
    p_canto = qd.pq(esp_placa, 0)[0] + (q_canto - qd.pq(esp_placa, 0)[1]) * math.tan(qd.t)
    s = arredonda(s, [(p_canto, q_canto)], 8.0)                                   # reforco placa/sapata
    s = arredonda(s, [qd.pq(0, h_placa), qd.pq(esp_placa, h_placa)], 2.0)         # topo da placa
    s = arredonda(s, [(p_tras, sapata)], 3.0)                                     # ponta traseira
    s = arredonda(s, [qd.pq(u_frente - esp_labio, h_labio), qd.pq(u_frente, h_labio)], 1.0)
    return s, qd


def base_monitor(ang=10.0):
    """Base tipo monitor: sapata na mesa + pescoco inclinado que parafusa na tampa."""
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
    pf = qd.pq(0, 0)[0] - (qd.pq(0, 0)[1] - sapata) * tg
    pt = qd.pq(esp_pesc, 0)[0] - (qd.pq(esp_pesc, 0)[1] - sapata) * tg
    s = arredonda(s, [(pf, sapata)], 8.0)
    s = arredonda(s, [(pt, sapata)], 14.0)
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
    lcd = caixa_ret(-PX, PX, -PY, PY, Z_VIDRO, Z_CHAPA)
    for (x, y) in POSTES:
        lcd = lcd.union(caixa_ret(x - 6, x + 6, y - 4, y + 4, Z_CHAPA, Z_ABA))
    # cabo flat dobrado na borda de baixo
    lcd = lcd.union(caixa_ret(-17, 17, -PY - 3.5, -PY, Z_VIDRO + 0.5, Z_CHAPA + 1.5))
    # placa (estimada pelo desenho oficial): ~27 a 132 mm da borda esquerda,
    # de ~24,6 mm acima da borda de baixo ate ~5 mm da borda de cima
    pcb = caixa_ret(-PX + 27, -PX + 132, -PY + 24.6, PY - 5, Z_CHAPA + 2.4, Z_CHAPA + 4.0)
    return lcd, pcb


def area_ref():
    """Area visivel da tela, como uma placa fina sobre o vidro (para as imagens)."""
    return caixa_ret(AX0, AX1, AY0, AY1, Z_VIDRO - 0.05, Z_VIDRO)


def caixa_no_quadro(solido, qd):
    """Coloca um solido da caixa na posicao montada sobre a base (perfil p,q; largura em Z)."""
    s = solido.translate((XC, -EY0, -PROF))                       # (X, v, u); X = -x
    s = s.rotate((0, 0, 0), (0, 1, 0), 90)                        # (u, v, -X)
    s = s.rotate((0, 0, 0), (0, 0, 1), -math.degrees(qd.t))
    return s.translate((qd.pb[0], qd.pb[1], LARG_BASE / 2))


def main():
    aqui = os.path.dirname(os.path.abspath(__file__))
    saida = os.path.join(aqui, "stl")
    ref = os.path.join(aqui, "_ref")
    os.makedirs(saida, exist_ok=True)
    os.makedirs(ref, exist_ok=True)
    mo, ta, ti, mi = moldura(), tampa(), tampa(inserto=True), moldura(inserto=True)
    b1, q1 = base_porta_retrato()
    b2, q2 = base_monitor()
    lcd, pcb = painel_ref()
    area = area_ref()
    exp = dict(tolerance=0.02, angularTolerance=0.15)
    cq.exporters.export(mo, os.path.join(saida, "moldura.stl"), **exp)
    cq.exporters.export(mi, os.path.join(saida, "moldura_inserto.stl"), **exp)
    cq.exporters.export(para_impressao_tampa(ta), os.path.join(saida, "tampa.stl"), **exp)
    cq.exporters.export(para_impressao_tampa(ti), os.path.join(saida, "tampa_inserto.stl"), **exp)
    cq.exporters.export(b1, os.path.join(saida, "base_porta_retrato.stl"), **exp)
    cq.exporters.export(b2, os.path.join(saida, "base_monitor.stl"), **exp)

    # arquivos de conferencia (montagens) -> pasta separada, nao imprimir
    cq.exporters.export(ti, os.path.join(ref, "tampa_inserto.stl"), **exp)
    cq.exporters.export(mi, os.path.join(ref, "moldura_inserto.stl"), **exp)
    pecas = {"moldura": mo, "tampa": ta, "lcd": lcd, "pcb": pcb, "area": area}
    for n, s in pecas.items():
        cq.exporters.export(s, os.path.join(ref, f"{n}.stl"), **exp)
        for nome, qd in (("porta_retrato", q1), ("monitor", q2)):
            cq.exporters.export(caixa_no_quadro(s, qd), os.path.join(ref, f"{n}_em_{nome}.stl"), **exp)

    def vol(a, b):
        return a.intersect(b).val().Volume()

    print(f"Caixa: {EXT_L:.1f} x {EXT_A:.1f} x {PROF:.1f} mm")
    print(f"Moldura visivel: esq/dir/cima {BORDA:.1f} mm, embaixo {JY0 - EY0:.1f} mm")
    print(f"Paredes: esq {CX0 - EX0:.1f}, dir {EX1 - CX1:.1f}, cima {EY1 - CY1:.1f}, baixo {CY0 - EY0:.1f} mm")
    print(f"Moldura cobre o painel: esq {JX0 + PX:.1f}, dir {PX - JX1:.1f}, cima {PY - JY1:.1f}, baixo {JY0 + PY:.1f} mm")
    print(f"z: vidro {Z_VIDRO:.1f}, chapa {Z_CHAPA:.1f}, abas {Z_ABA:.1f}, tampa {Z_TAMPA:.1f}")
    print(f"Postes: {Z_TAMPA - Z_ABA:.1f} mm; rebaixo {PROF - Z_ABA - PISO_POSTE:.1f} mm de profundidade")
    print(f"Interferencias (mm3): moldura x painel {vol(mo, lcd):.3f}; tampa x painel {vol(ta, lcd):.3f}; "
          f"moldura x tampa {vol(mo, ta):.3f}; tampa x placa {vol(ta, pcb):.3f}; moldura x placa {vol(mo, pcb):.3f}")
    print(f"Tampa com inserto (mm3): x painel {vol(ti, lcd):.3f}; x moldura {vol(mo, ti):.3f}; x placa {vol(ti, pcb):.3f}; "
          f"ressalto {INSERTO_D + 2 * INSERTO_PAREDE:.1f} mm de diametro, "
          f"{INSERTO_FLANGE + INSERTO_L + INSERTO_FOLGA - TAMPA:.1f} mm de altura por dentro")
    print(f"Moldura com inserto (mm3): x painel {vol(mi, lcd):.3f}; x tampa {vol(mi, ti):.3f}")
    cx = mo.union(ta)
    for nome, b, qd in (("porta_retrato", b1, q1), ("monitor", b2, q2)):
        print(f"Interferencia base {nome} x caixa: {vol(b, caixa_no_quadro(cx, qd)):.3f} mm3; "
              f"volume {b.val().Volume() / 1000:.1f} cm3")
    print(f"Volume moldura {mo.val().Volume() / 1000:.1f} cm3; tampa {ta.val().Volume() / 1000:.1f} cm3")


if __name__ == "__main__":
    main()
