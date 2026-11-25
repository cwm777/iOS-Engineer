#!/usr/bin/env python3
"""
Caixas de mesa ("radar") para a Waveshare ESP32-S3-Touch-AMOLED-1.75, com a USB-C para baixo.

Gera os STLs ja na posicao de impressao:
  stl/opcao_a/  painel.stl  corpo.stl  fundo.stl  tampa.stl     (console em cunha, tela a 20 graus)
  stl/opcao_b/  frente.stl  base.stl   tampa.stl                (instrumento sobre pedestal, 15 graus)

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
VIDRO_ESP = 2.05
PILHA = 6.90            # face do vidro ate o verso da placa
T_APOIO = 10.40         # topo dos 3 espacadores M2 (H3.5)
USB_R = 23.80           # boca da USB-C a partir do centro
USB_T = 8.5             # centro da USB-C atras da face do vidro
ESPACADORES = [(-20.5, 0.0), (14.7, 13.75), (14.7, -13.75)]     # (u, v), vistos de frente
# componentes altos no verso (ate ~12,5 mm da face do vidro), vistos de frente:
ALTOS = [(16.9, 20.3, -10.0, 15.0),      # barra de pinos (u0, u1, v0, v1)
         (-20.8, -15.8, 4.5, 11.3),      # conector SPK
         (-20.8, -15.8, -8.9, -2.1)]     # conector BAT

# plugue USB-C em L (medidas tipicas, so para conferir o espaco)
PLUG_L, PLUG_E, PLUG_H, PERNA = 12.0, 7.0, 10.0, 16.0

# --------------------------------------------------------------------------
# PARTE COMUM: alojamento do modulo + tampa traseira
# --------------------------------------------------------------------------
R_ALOJ = VIDRO_D / 2 + 0.4      # raio do alojamento (0,4 mm de folga em volta do vidro)
R_COLAR = 30.0                  # raio externo do colar / da tampa
T_FUNDO = 13.4                  # face interna da tampa (0,9 mm atras do componente mais alto)
TAMPA_E = 2.6
T_TRAS = T_FUNDO + TAMPA_E      # 16,0: face de fora da tampa
V_CORTE = -22.8                 # a tampa e cortada reta embaixo (espaco do plugue)
R_FECHO = 27.4                  # 3 parafusos M2 da tampa no colar
ANG_FECHO = (90.0, 200.0, 340.0)
FURO_M2 = 2.3
GUIA_M2 = 1.7                   # furo-guia: o M2 abre rosca no plastico
RASGO_USB = 14.4                # largura do rasgo do plugue
T_RASGO = 3.5                   # o rasgo comeca a esta profundidade

# insertos a quente M3 x 5 x 4,5
INS_FURO = 4.0
INS_PROF = 5.8

INCL_A = 20.0
INCL_B = 15.0


def cil_y(r, y0, y1, u=0.0, v=0.0):
    return cq.Workplane("XY").add(cq.Solid.makeCylinder(r, y1 - y0, cq.Vector(u, y0, v), cq.Vector(0, 1, 0)))


def cil_z(r, z0, z1, x=0.0, y=0.0):
    return cq.Workplane("XY").add(cq.Solid.makeCylinder(r, z1 - z0, cq.Vector(x, y, z0), cq.Vector(0, 0, 1)))


def bloco(x0, x1, y0, y1, z0, z1):
    return cq.Workplane("XY").box(x1 - x0, y1 - y0, z1 - z0).translate(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))


def cone(r0, r1, h, pnt, d):
    return cq.Workplane("XY").add(cq.Solid.makeCone(r0, r1, h, cq.Vector(*pnt), cq.Vector(*d)))


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


def polar(r, ang):
    return (r * math.cos(math.radians(ang)), r * math.sin(math.radians(ang)))


def tampa():
    """Tampa traseira (local): disco com 3 ressaltos que apoiam nos espacadores M2 do modulo."""
    t = cil_y(R_COLAR, T_FUNDO, T_TRAS)
    t = t.cut(bloco(-40, 40, T_FUNDO - 1, T_TRAS + 1, -40, V_CORTE + 0.2))
    t = t.faces(">Y").edges().chamfer(0.5)
    res = None
    for (u, v) in ESPACADORES:
        c = cil_y(2.7, T_APOIO, T_FUNDO + 0.01, u, v)
        res = c if res is None else res.union(c)
    for (u0, u1, v0, v1) in ALTOS:                       # nao encostar nos conectores
        res = res.cut(bloco(u0, u1, T_APOIO - 1, T_FUNDO, v0, v1))
    t = t.union(res)
    furos = list(ESPACADORES) + [polar(R_FECHO, a) for a in ANG_FECHO]
    for (u, v) in furos:
        t = t.cut(cil_y(FURO_M2 / 2, T_APOIO - 1, T_TRAS + 1, u, v))
        t = t.cut(cil_y(2.15, T_TRAS - 1.7, T_TRAS + 1, u, v))          # rebaixo da cabeca
    return t


def tampa_impressao(t):
    return t.rotate((0, 0, 0), (1, 0, 0), -90).translate((0, 0, T_TRAS))


def cortes_alojamento():
    """Cortes comuns (local): alojamento do modulo, rasgo do plugue e furos-guia da tampa."""
    c = cil_y(R_ALOJ, -5, T_FUNDO + 0.01)
    c = c.union(bloco(-RASGO_USB / 2, RASGO_USB / 2, T_RASGO, T_FUNDO + 0.01, -R_COLAR - 40, -16))
    for a in ANG_FECHO:
        u, v = polar(R_FECHO, a)
        c = c.union(cil_y(GUIA_M2 / 2, T_FUNDO - 6.5, T_FUNDO + 1, u, v))
    return c


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


def recorta(poli, a, b, c):
    """Recorta o poligono [(y, z)...] mantendo a*y + b*z <= c."""
    out = []
    for i, p in enumerate(poli):
        q = poli[(i + 1) % len(poli)]
        fp, fq = a * p[0] + b * p[1] - c, a * q[0] + b * q[1] - c
        if fp <= 0:
            out.append(p)
        if (fp < 0 < fq) or (fq < 0 < fp):
            k = fp / (fp - fq)
            out.append((p[0] + k * (q[0] - p[0]), p[1] + k * (q[1] - p[1])))
    return out


def arredonda(s, caixas, raio):
    for (a, b) in caixas:
        try:
            s = s.edges(cq.selectors.BoxSelector(a, b)).fillet(raio)
        except Exception as e:
            print(f"  aviso: sem arredondamento r={raio} em {a}: {type(e).__name__}")
    return s


# --------------------------------------------------------------------------
# OPCAO A: console em cunha
# --------------------------------------------------------------------------
A_LARG = 74.0           # largura
A_LABIO = 11.0          # altura da parede vertical da frente
A_SC = 36.0             # da borda de baixo do painel ate o centro da tela
A_ST = 75.0             # comprimento do painel
A_PROF = 58.0           # profundidade na base
A_QUEBRA = 50.0         # y onde a parede de tras muda de inclinacao
A_PAREDE = 2.6
A_PAINEL_E = 3.5        # espessura do painel frontal
A_FUNDO_E = 3.0
A_PARAF = [(-31.0, -30.0), (31.0, -30.0), (-31.0, 33.0), (31.0, 33.0)]      # (u, v) no painel; 6 mm das bordas
A_PARAF_FUNDO = [(-30.3, 8.8), (30.3, 8.8), (-30.3, 49.0), (30.3, 49.0)]    # (x, y) na base


def opcao_a():
    th = math.radians(INCL_A)
    sn, cs = math.sin(th), math.cos(th)
    pos = (0.0, A_SC * sn, A_LABIO + A_SC * cs)
    meia = A_LARG / 2
    p1 = (0.0, A_LABIO)
    p2 = (A_ST * sn, A_LABIO + A_ST * cs)                 # topo do painel
    # teto interno a 45 graus, passando pelo plano de tras do painel na altura (topo - parede)
    zf = p2[1] - A_PAREDE
    vf = (zf - (pos[2] - A_PAINEL_E * sn)) / cs
    yf = pos[1] + A_PAINEL_E * cs + vf * sn
    c_in = yf + zf
    c_out = c_in + A_PAREDE * math.sqrt(2)
    p3 = (c_out - p2[1], p2[1])                           # fim do trecho plano do topo
    pk = (A_QUEBRA, c_out - A_QUEBRA)                     # quebra da parede de tras
    p4 = (A_PROF, 0.0)
    ext = cq.Workplane("YZ").polyline([(0, 0), p1, p2, p3, pk, p4]).close().extrude(A_LARG).translate((-meia, 0, 0))
    sel = None
    for (qa, qb) in ((pk, p4), (p3, pk)):                 # as 4 arestas laterais de tras, de uma vez
        ym, zm = (qa[0] + qb[0]) / 2, (qa[1] + qb[1]) / 2
        for sx in (-1, 1):
            b = cq.selectors.BoxSelector((sx * meia - 1, ym - 2, zm - 2), (sx * meia + 1, ym + 2, zm + 2))
            sel = b if sel is None else sel + b
    try:
        ext = ext.edges(sel).fillet(5.0)
    except Exception as e:
        print("  aviso: sem arredondamento atras:", type(e).__name__)
    try:
        ext = ext.faces(cq.selectors.DirectionMinMaxSelector(cq.Vector(0, -cs, sn), True)).edges().chamfer(0.8)
    except Exception as e:
        print("  aviso: sem chanfro na face:", type(e).__name__)

    # --- cavidade ---
    dy, dz = pk[0] - p4[0], pk[1] - p4[1]
    ln = math.hypot(dy, dz)
    nb = (dz / ln, -dy / ln)                              # normal da parede de tras (para fora)
    poli = [(-60.0, -1.0), (160.0, -1.0), (160.0, 160.0), (-60.0, 160.0)]
    poli = recorta(poli, -1, 0, -A_PAREDE)                                       # parede da frente
    poli = recorta(poli, nb[0], nb[1], nb[0] * p4[0] + nb[1] * p4[1] - A_PAREDE)  # parede de tras
    poli = recorta(poli, 1, 1, c_in)                                             # teto a 45 graus
    cav = (cq.Workplane("YZ").polyline(poli).close().extrude(A_LARG - 2 * A_PAREDE)
           .translate((-(meia - A_PAREDE), 0, 0)))
    corpo = ext.cut(cav)

    # --- macicos para os insertos ---
    xi = meia - A_PAREDE + 0.2
    mac = None
    for sx in (-1, 1):
        x0, x1 = sorted((sx * 26.0, sx * xi))
        blocos = [bloco(x0, x1, 2.4, 15.5, 0, 22),                                # frente: do chao ao painel
                  bloco(x0, x1, 44.5, 60, 0, 9)]                                  # tras: para o fundo
        # em cima: cresce a 45 graus a partir da parede lateral
        z0 = 62.5
        tri = [(sx * xi, z0), (sx * xi, 120), (sx * 26.0, 120), (sx * 26.0, z0 + (xi - 26.0))]
        corb = cq.Workplane("XZ").polyline(tri).close().extrude(-100)
        topo = posiciona(bloco(-60, 60, A_PAINEL_E, 11.5, 24, 60), INCL_A, pos).intersect(corb)
        for b in blocos + [topo]:
            mac = b if mac is None else mac.union(b)
    corpo = corpo.union(mac.intersect(ext))
    # tudo o que fica na frente do plano de tras do painel sai do corpo
    corpo = corpo.cut(posiciona(bloco(-100, 100, -80, A_PAINEL_E, -A_SC, 200), INCL_A, pos))
    for (u, v) in A_PARAF:
        corpo = corpo.cut(posiciona(cil_y(INS_FURO / 2, A_PAINEL_E - 1, A_PAINEL_E + INS_PROF, u, v), INCL_A, pos))
    for (x, y) in A_PARAF_FUNDO:
        corpo = corpo.cut(cil_z(INS_FURO / 2, -1, 6.5, x, y))
    corpo = corpo.cut(bloco(-4.5, 4.5, A_PROF - 12, A_PROF + 5, -1, 7.0))         # saida do cabo

    # --- painel frontal (com o colar do modulo) ---
    painel = ext.intersect(posiciona(bloco(-100, 100, -5, A_PAINEL_E, -A_SC, 200), INCL_A, pos))
    painel = para_local(painel, INCL_A, pos)
    painel = painel.union(cil_y(R_COLAR, A_PAINEL_E - 0.01, T_FUNDO))
    painel = painel.cut(cortes_alojamento())
    for (u, v) in A_PARAF:
        painel = painel.cut(cil_y(1.7, -1, A_PAINEL_E + 1, u, v))
        painel = painel.cut(cone(3.1, 1.7, 1.4, (u, -0.01, v), (0, 1, 0)))

    # --- fundo ---
    fundo = bloco(-meia, meia, 0, A_PROF, -A_FUNDO_E, 0).intersect(ext.translate((0, 0, -A_FUNDO_E)).union(
        ext.translate((0, 0, -A_FUNDO_E / 2))))
    for (x, y) in A_PARAF_FUNDO:
        fundo = fundo.cut(cil_z(1.7, -A_FUNDO_E - 1, 1, x, y))
        fundo = fundo.cut(cone(3.1, 1.7, 1.4, (x, y, -A_FUNDO_E - 0.01), (0, 0, 1)))

    return dict(nome="a", incl=INCL_A, pos=pos, dims=(A_LARG, p2[1] + A_FUNDO_E, A_PROF),
                mundo={"corpo": corpo, "painel": posiciona(painel, INCL_A, pos), "fundo": fundo,
                       "tampa": posiciona(tampa(), INCL_A, pos)},
                imprimir={"corpo": corpo, "painel": face_para_baixo(painel),
                          "fundo": fundo.translate((0, 0, A_FUNDO_E)), "tampa": tampa_impressao(tampa())})


# --------------------------------------------------------------------------
# OPCAO B: instrumento sobre pedestal
# --------------------------------------------------------------------------
B_HC = 44.0             # altura do centro da tela acima do topo da base
B_BASE_E = 7.0
B_PESC_L = 34.0         # largura do pescoco
B_PESC_T = 32.0         # profundidade do pescoco (esconde a perna do plugue)
B_CANAL = 16.0          # largura do canal do plugue
B_PARAF = [(-12.5, 10.0), (12.5, 10.0)]                  # (x, y) parafusos da base
B_BASE_C, B_BASE_RX, B_BASE_RY = 10.0, 33.0, 31.0


def opcao_b():
    pos = (0.0, 0.0, B_HC + B_BASE_E)
    ml = B_PESC_L / 2
    fr = cil_y(R_COLAR, 0, T_FUNDO).union(bloco(-ml, ml, 0, T_FUNDO, -70, -10))
    vj = -math.sqrt(R_COLAR ** 2 - ml ** 2)
    fr = arredonda(fr, [((sx * ml - 1, -1, vj - 1.5), (sx * ml + 1, T_FUNDO + 1, vj + 1.5)) for sx in (-1, 1)], 6.0)
    try:
        fr = fr.faces("<Y").edges().chamfer(0.8)
    except Exception as e:
        print("  aviso: sem chanfro na frente:", type(e).__name__)
    tras = bloco(-ml, ml, T_FUNDO - 0.01, B_PESC_T, -70, V_CORTE)
    tras = tras.edges("|Z").edges(">Y").fillet(4.0)
    fr = fr.union(tras)
    fr = fr.cut(cortes_alojamento())
    fr = fr.cut(bloco(-B_CANAL / 2, B_CANAL / 2, T_FUNDO - 0.01, B_PESC_T - 2.6, -80, V_CORTE - 2.4))  # canal traseiro
    fr = fr.cut(bloco(-3.8, 3.8, B_PESC_T - 3.5, B_PESC_T + 2, -80, -27.5))                           # saida do cabo
    fr = posiciona(fr, INCL_B, pos)
    fr = fr.cut(bloco(-100, 100, -100, 100, -100, B_BASE_E))                                           # assenta na base
    for (x, y) in B_PARAF:
        fr = fr.cut(cil_z(INS_FURO / 2, B_BASE_E - 1, B_BASE_E + 6.5, x, y))

    base = (cq.Workplane("XY").ellipse(B_BASE_RX, B_BASE_RY).extrude(B_BASE_E)
            .edges(">Z").fillet(2.5).edges("<Z").chamfer(0.6).translate((0, B_BASE_C, 0)))
    for (x, y) in B_PARAF:
        base = base.cut(cil_z(1.7, -1, B_BASE_E + 1, x, y))
        base = base.cut(cone(3.1, 1.7, 1.4, (x, y, -0.01), (0, 0, 1)))

    alt = pos[2] + R_COLAR * math.cos(math.radians(INCL_B))
    return dict(nome="b", incl=INCL_B, pos=pos, dims=(2 * B_BASE_RX, alt, 2 * B_BASE_RY),
                mundo={"frente": fr, "base": base, "tampa": posiciona(tampa(), INCL_B, pos)},
                imprimir={"frente": face_para_baixo(para_local(fr, INCL_B, pos)), "base": base,
                          "tampa": tampa_impressao(tampa())})


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
        n = op["nome"]
        for nome, s in op["imprimir"].items():
            bb = s.val().BoundingBox()
            exporta(s.translate((0, 0, -bb.zmin)), os.path.join(aqui, "stl", f"opcao_{n}", f"{nome}.stl"))
        mod = {k: posiciona(v, op["incl"], op["pos"]) for k, v in modulo_ref().items()}
        for nome, s in list(op["mundo"].items()) + list(mod.items()):
            exporta(s, os.path.join(aqui, "_ref", f"{n}_{nome}.stl"))
        L, H, P = op["dims"]
        print(f"\nOpcao {n.upper()}: {L:.0f} x {H:.0f} x {P:.0f} mm (L x A x P), tela inclinada {op['incl']:.0f} graus")
        pecas = op["mundo"]
        nomes = list(pecas)
        for i, a in enumerate(nomes):
            print(f"  {a}: {pecas[a].val().Volume() / 1000:.1f} cm3")
            for b in nomes[i + 1:]:
                print(f"    {a} x {b}: {vol(pecas[a], pecas[b]):.3f} mm3")
        for k in ("vidro", "pilha", "pcb", "metal", "altos", "plug"):
            print(f"  modulo/{k} x pecas: " + ", ".join(f"{a} {vol(pecas[a], mod[k]):.3f}" for a in nomes))
        zmin = mod["plug"].val().BoundingBox().zmin
        print(f"  ponto mais baixo do plugue em L: z = {zmin:.1f} mm")


if __name__ == "__main__":
    main()
