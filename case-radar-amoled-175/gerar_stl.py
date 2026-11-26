#!/usr/bin/env python3
"""
Suportes de mesa ("radar") para a Waveshare ESP32-S3-Touch-AMOLED-1.75, em PECA UNICA.

A tela entra pela frente e fica encaixada (sem parafusos); a USB-C fica para baixo e o
plugue em L entra por um canal aberto atras, entao o cabo sai sem desmontar nada.

Gera, ja na posicao de impressao (face da frente na mesa, sem suporte):
  stl/opcao_a.stl   console em cunha, tela inclinada 20 graus
  stl/opcao_b.stl   instrumento sobre pedestal, tela inclinada 15 graus

Uso:  pip install cadquery && python3 gerar_stl.py

Medidas em mm. Coordenadas do modulo: u = direita (olhando a tela), v = para cima na tela,
t = profundidade a partir da face do vidro (para tras). Nos solidos "locais": X = u, Y = t, Z = v.
"""
import math
import os

import cadquery as cq

# --------------------------------------------------------------------------
# MODULO (desenho oficial da Waveshare), girado para a USB-C ficar embaixo
# --------------------------------------------------------------------------
VIDRO_D = 48.96         # diametro do vidro
PCB_D = 46.0            # diametro da placa
VIDRO_ESP = 2.05        # parte larga (vidro + tela)
PILHA = 6.90            # face do vidro ate o verso da placa
T_APOIO = 10.40         # topo dos 3 espacadores M2 (H3.5)
USB_R = 23.80           # boca da USB-C a partir do centro
USB_T = 8.5             # centro da USB-C atras da face do vidro
ESPACADORES = [(-20.5, 0.0), (14.7, 13.75), (14.7, -13.75)]     # (u, v), vistos de frente
# componentes altos no verso (ate ~12,5 mm da face do vidro), vistos de frente:
ALTOS = [(16.8, 20.1, -6.9, 14.5),       # barra de pinos (u0, u1, v0, v1); a ponta passa da borda da placa
         (-20.8, -15.8, 4.5, 11.3),      # conector SPK
         (-20.8, -15.8, -8.9, -2.1)]     # conector BAT
SALIENTES_ANG = (35.0, 56.0, 124.0)      # ponta da barra de pinos e botoes PWR/BOOT, que passam da borda
                                         # da placa (graus, 0 = direita, 90 = cima)

# plugue USB-C em L (medidas tipicas, so para conferir o espaco)
PLUG_L, PLUG_E, PLUG_H, PERNA = 12.0, 7.0, 10.0, 16.0
CURSO_USB = 8.0                 # quanto o plugue desce para soltar

# --------------------------------------------------------------------------
# ENCAIXE DO MODULO (comum as duas opcoes)
# --------------------------------------------------------------------------
R_VIDRO = VIDRO_D / 2 + 0.25    # alojamento do vidro (0,25 mm de folga em volta)
T_VIDRO = 2.4                   # profundidade da parte larga do alojamento
R_FURO = PCB_D / 2 + 0.6        # furo em volta da placa
R_COLAR = 30.0                  # raio externo do anel que segura o modulo
T_COLAR = 13.4                  # profundidade do anel (0,9 mm atras do componente mais alto)
T_VIGA = T_APOIO + 0.1          # as vigas de tras apoiam os 3 espacadores
APERTO = 0.10                   # interferencia das nervuras na borda da placa (aumente se ficar solto)
NERV_ANG = (90.0, 210.0, 330.0)
NERV_L = 1.2                    # largura de cada nervura
T_FRENTE = 3.5                  # espessura da parede da frente
CANAL = 16.0                    # largura do canal do plugue USB

INCL_A = 20.0
INCL_B = 15.0


def cil_y(r, y0, y1, u=0.0, v=0.0):
    return cq.Workplane("XY").add(cq.Solid.makeCylinder(r, y1 - y0, cq.Vector(u, y0, v), cq.Vector(0, 1, 0)))


def bloco(x0, x1, y0, y1, z0, z1):
    return cq.Workplane("XY").box(x1 - x0, y1 - y0, z1 - z0).translate(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))


def cone_y(r0, r1, y0, y1):
    return cq.Workplane("XY").add(cq.Solid.makeCone(r0, r1, y1 - y0, cq.Vector(0, y0, 0), cq.Vector(0, 1, 0)))


def prisma_uv(pontos, y0, y1):
    """Poligono no plano (u, v) extrudado em t de y0 a y1."""
    return cq.Workplane("XZ").polyline(pontos).close().extrude(-(y1 - y0)).translate((0, y0, 0))


def polar(r, ang):
    return (r * math.cos(math.radians(ang)), r * math.sin(math.radians(ang)))


def posiciona(s, incl, pos):
    """Local -> montado: inclina 'incl' graus para tras e leva o centro da tela a 'pos'."""
    return s.rotate((0, 0, 0), (1, 0, 0), -incl).translate(pos)


def para_local(s, incl, pos):
    return s.translate((-pos[0], -pos[1], -pos[2])).rotate((0, 0, 0), (1, 0, 0), incl)


def pt(incl, pos, u, t, v):
    a = math.radians(-incl)
    return (pos[0] + u, pos[1] + t * math.cos(a) - v * math.sin(a), pos[2] + t * math.sin(a) + v * math.cos(a))


def face_para_baixo(s):
    """Local -> impressao com a face da frente (t = 0) na mesa."""
    return s.rotate((0, 0, 0), (1, 0, 0), 90)


def furo_modulo():
    """Tudo o que e removido para o modulo e o plugue entrarem (local)."""
    c = cil_y(R_VIDRO, -5, T_VIDRO + 0.01)
    c = c.union(cone_y(R_VIDRO, R_FURO, T_VIDRO, T_VIDRO + (R_VIDRO - R_FURO)))      # degrau a 45 graus
    c = c.union(cil_y(R_FURO, T_VIDRO, T_COLAR + 80))
    for ang in SALIENTES_ANG:                                                       # passagem do que sai da borda
        setor = prisma_uv([(0, 0), polar(40, ang - 10), polar(40, ang + 10)], T_VIDRO, T_COLAR + 1)
        c = c.union(setor.intersect(cil_y(R_VIDRO + 0.6, T_VIDRO, T_COLAR + 1)))
    c = c.union(bloco(-CANAL / 2, CANAL / 2, T_FRENTE, T_COLAR + 80, -150, -16))     # canal do plugue
    return c


def nervuras():
    """3 nervuras que apertam de leve a borda da placa (local)."""
    r_in = PCB_D / 2 - APERTO
    t0 = PILHA - 1.6 + 0.1 - (R_FURO - r_in)             # a entrada inclinada termina onde comeca a placa
    guia = cil_y(R_FURO + 1, -5, t0 + 0.01).union(cone_y(R_FURO, r_in - 0.5, t0, t0 + R_FURO - r_in + 0.5))
    s = None
    for ang in NERV_ANG:
        dx, dz = polar(1.0, ang)
        tx, tz = -dz, dx
        pts = [(r_in * dx + sg * NERV_L / 2 * tx, r_in * dz + sg * NERV_L / 2 * tz) for sg in (-1, 1)]
        pts += [((R_FURO + 0.4) * dx + sg * NERV_L / 2 * tx, (R_FURO + 0.4) * dz + sg * NERV_L / 2 * tz)
                for sg in (1, -1)]
        n = prisma_uv(pts, t0 - 0.5, PILHA + 0.6).cut(guia)                          # entrada inclinada
        s = n if s is None else s.union(n)
    return s


def vigas():
    """Duas vigas em ponte, atras, onde os 3 espacadores do modulo encostam (local)."""
    limite = cil_y(R_COLAR - 0.5, 0, T_COLAR + 1)
    v1 = bloco(12.1, 16.6, T_VIGA, T_COLAR, -40, 40)                                 # passa por 2 espacadores
    v2 = bloco(-40, 12.2, T_VIGA, T_COLAR, -1.8, 2.2)                                # passa pelo terceiro
    return v1.union(v2).intersect(limite)


def encaixe(corpo, incl, pos):
    corpo = corpo.cut(posiciona(furo_modulo(), incl, pos))
    return corpo.union(posiciona(nervuras(), incl, pos)).union(posiciona(vigas(), incl, pos))


def modulo_ref():
    """Modulo + plugue em L (local), so para conferencia e imagens."""
    vidro = cil_y(VIDRO_D / 2, 0, VIDRO_ESP)
    pilha = cil_y(PCB_D / 2, VIDRO_ESP, PILHA - 1.6)
    pcb = cil_y(PCB_D / 2, PILHA - 1.6, PILHA)
    metal = bloco(-4.5, 4.5, USB_T - 1.6, USB_T + 1.6, -USB_R, -USB_R + 7.5)
    for (u, v) in ESPACADORES:
        metal = metal.union(cil_y(1.75, PILHA, T_APOIO, u, v))
    altos = None
    for (u0, u1, v0, v1) in ALTOS:
        b = bloco(u0 + 0.4, u1 - 0.4, PILHA, 12.5, v0 + 0.4, v1 - 0.4)
        altos = b if altos is None else altos.union(b)
    v0 = -USB_R - PLUG_H
    plug = bloco(-PLUG_L / 2, PLUG_L / 2, USB_T - PLUG_E / 2, USB_T + PLUG_E / 2, v0, -USB_R - 0.3)
    plug = plug.union(bloco(-PLUG_L / 2, PLUG_L / 2, USB_T + PLUG_E / 2 - 0.1, USB_T + PLUG_E / 2 + PERNA,
                            v0, v0 + 8.0))
    return {"vidro": vidro, "pilha": pilha, "pcb": pcb, "metal": metal, "altos": altos, "plug": plug}


def tenta(s, f, aviso):
    try:
        return f(s)
    except Exception as e:
        print(f"  aviso: {aviso}: {type(e).__name__}")
        return s


# --------------------------------------------------------------------------
# OPCAO A: console em cunha (face inclinada + laterais + piso, aberto atras)
# --------------------------------------------------------------------------
A_LARG = 74.0
A_SC = 52.5             # da mesa ate o centro da tela, medido ao longo da face
A_VT = 34.0             # do centro da tela ate o topo da face
A_PROF = 58.0           # comprimento do piso
A_PISO = 4.0
A_LATERAL = 3.0
A_TOPO_T = 14.0         # profundidade da aba de cima (esconde a espessura do modulo)


def opcao_a():
    th = math.radians(INCL_A)
    pos = (0.0, A_SC * math.sin(th), A_SC * math.cos(th))
    m = A_LARG / 2
    frente = bloco(-m, m, 0, T_FRENTE, -A_SC - 12, A_VT)
    frente = tenta(frente, lambda s: s.faces("<Y").edges().chamfer(0.5), "sem chanfro na face")
    local = frente.union(bloco(-m, m, 0, A_TOPO_T, A_VT - 3.0, A_VT))               # aba de cima
    local = local.union(cil_y(R_COLAR, T_FRENTE - 0.01, T_COLAR))                   # anel do modulo
    corpo = posiciona(local, INCL_A, pos)
    piso = bloco(-m, m, -8, A_PROF, 0, A_PISO)
    piso = piso.cut(bloco(-CANAL / 2, CANAL / 2, -9, A_PROF + 1, -1, A_PISO + 1))   # rasgo do cabo, ate atras
    p_topo = pt(INCL_A, pos, 0, 0, A_VT)
    p_tras = pt(INCL_A, pos, 0, A_TOPO_T, A_VT)
    perfil = [(0, 0), (p_topo[1], p_topo[2]), (p_tras[1], p_tras[2]), (A_PROF, A_PISO), (A_PROF, 0)]
    for x0 in (-m, m - A_LATERAL):
        lado = cq.Workplane("YZ").polyline(perfil).close().extrude(A_LATERAL).translate((x0, 0, 0))
        corpo = corpo.union(lado)
    corpo = corpo.union(piso)
    corpo = corpo.cut(posiciona(bloco(-200, 200, -200, 0, -300, 300), INCL_A, pos))   # nada na frente da face
    corpo = corpo.cut(bloco(-200, 200, -200, 300, -200, 0))                            # nada abaixo da mesa
    corpo = encaixe(corpo, INCL_A, pos)
    return dict(nome="a", incl=INCL_A, pos=pos, dims=(A_LARG, p_topo[2], A_PROF), mundo=corpo,
                imprimir=face_para_baixo(para_local(corpo, INCL_A, pos)))


# --------------------------------------------------------------------------
# OPCAO B: instrumento sobre pedestal (cabeca + pescoco + pe em garfo)
# --------------------------------------------------------------------------
B_HC = 48.0             # altura do centro da tela acima da mesa
B_PESC_L = 34.0         # largura do pescoco
B_PE_L = 66.0           # largura do pe
B_PE_C = 56.0           # comprimento do pe, da frente para tras
B_PE_E = 5.0
B_REFORCO_T = 32.0      # ate onde as laterais do pescoco avancam para tras (escondem o plugue)


def opcao_b():
    th = math.radians(INCL_B)
    pos = (0.0, 0.0, B_HC)
    ml = B_PESC_L / 2
    local = cil_y(R_COLAR, 0, T_COLAR).union(bloco(-ml, ml, 0, T_FRENTE, -100, -10))
    perfil = [(0, -100), (0, -15), (T_COLAR, -15), (T_COLAR, -22), (B_REFORCO_T, -42), (B_REFORCO_T, -100)]
    for x0 in (-ml, CANAL / 2):
        lado = cq.Workplane("YZ").polyline(perfil).close().extrude(ml - CANAL / 2).translate((x0, 0, 0))
        local = local.union(lado)
    local = tenta(local, lambda s: s.faces("<Y").edges().chamfer(0.5), "sem chanfro na face")
    corpo = posiciona(local, INCL_B, pos)
    y0 = -B_HC * math.tan(th)                                   # onde a face encontra a mesa
    pe = bloco(-B_PE_L / 2, B_PE_L / 2, y0 - 8, y0 + B_PE_C, 0, B_PE_E)
    pe = tenta(pe, lambda s: s.edges("|Z").edges(">Y").fillet(8.0), "sem arredondamento no pe")
    pe = pe.cut(bloco(-CANAL / 2, CANAL / 2, y0 - 9, y0 + B_PE_C + 1, -1, B_PE_E + 1))   # garfo: rasgo do cabo
    corpo = corpo.union(pe)
    corpo = corpo.cut(posiciona(bloco(-200, 200, -200, 0, -300, 300), INCL_B, pos))
    corpo = corpo.cut(bloco(-200, 200, -200, 300, -200, 0))
    corpo = encaixe(corpo, INCL_B, pos)
    alt = B_HC + R_COLAR * math.cos(th)
    return dict(nome="b", incl=INCL_B, pos=pos, dims=(B_PE_L, alt, B_PE_C), mundo=corpo,
                imprimir=face_para_baixo(para_local(corpo, INCL_B, pos)))


# --------------------------------------------------------------------------
def exporta(s, caminho):
    os.makedirs(os.path.dirname(caminho), exist_ok=True)
    cq.exporters.export(s, caminho, tolerance=0.02, angularTolerance=0.12)


def vol(a, b):
    try:
        return a.intersect(b).val().Volume()
    except Exception:
        return 0.0


def main():
    aqui = os.path.dirname(os.path.abspath(__file__))
    for op in (opcao_a(), opcao_b()):
        n, incl, pos, corpo = op["nome"], op["incl"], op["pos"], op["mundo"]
        s = op["imprimir"]
        bb = s.val().BoundingBox()
        exporta(s.translate((0, 0, -bb.zmin)), os.path.join(aqui, "stl", f"opcao_{n}.stl"))
        exporta(corpo, os.path.join(aqui, "_ref", f"{n}_corpo.stl"))
        ref = modulo_ref()
        mod = {k: posiciona(v, incl, pos) for k, v in ref.items()}
        for k, v in mod.items():
            exporta(v, os.path.join(aqui, "_ref", f"{n}_{k}.stl"))
        L, H, P = op["dims"]
        print(f"\nOpcao {n.upper()}: {L:.0f} x {H:.0f} x {P:.0f} mm (L x A x P), tela inclinada {incl:.0f} graus; "
              f"peca {corpo.val().Volume() / 1000:.1f} cm3, altura de impressao {bb.zmax - bb.zmin:.0f} mm")
        print("  interferencia com o corpo (mm3): " + ", ".join(
            f"{k} {vol(corpo, mod[k]):.3f}" for k in ("vidro", "pilha", "metal", "altos", "plug")))
        print(f"  aperto das nervuras na placa: {vol(corpo, mod['pcb']):.2f} mm3 (esperado: pouco acima de zero)")
        # o modulo sai pela frente? (desloca 15 mm para fora e confere de novo, sem contar as nervuras)
        fora = {k: posiciona(v.translate((0, -15, 0)), incl, pos) for k, v in ref.items() if k != "plug"}
        print("  modulo 15 mm para fora (mm3): " + ", ".join(f"{k} {vol(corpo, v):.2f}" for k, v in fora.items()))
        # o plugue desce CURSO_USB sem bater no corpo? e chega ao nivel da mesa?
        desce = posiciona(ref["plug"].translate((0, 0, -CURSO_USB)), incl, pos)
        zmin = desce.val().BoundingBox().zmin
        print(f"  plugue descendo {CURSO_USB:.0f} mm: interferencia {vol(corpo, desce):.3f} mm3; ponto mais baixo "
              f"z = {zmin:.1f} mm" + ("" if zmin >= 0 else " (levante um pouco a peca para soltar o cabo)"))
        print(f"  plugue ligado: ponto mais baixo z = {mod['plug'].val().BoundingBox().zmin:.1f} mm")


if __name__ == "__main__":
    main()
