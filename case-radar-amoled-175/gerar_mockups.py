#!/usr/bin/env python3
"""
Mockups de duas propostas de caixa de mesa para a Waveshare ESP32-S3-Touch-AMOLED-1.75
(tela redonda), com a USB-C voltada para baixo e espaco para um plugue em L.

Isto NAO gera pecas para imprimir: sao modelos de conceito, em escala, so para as imagens.
Uso (precisa de display virtual para o VTK):
    pip install cadquery pillow
    xvfb-run -a python3 gerar_mockups.py
"""
import math
import os
import tempfile

import cadquery as cq
import vtk
from PIL import Image, ImageDraw, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.join(AQUI, "mockups")
TMP = tempfile.mkdtemp(prefix="mock_")

# ---------------- medidas do modulo (desenho oficial) ----------------
VIDRO_D = 48.96         # diametro do vidro
PCB_D = 46.0            # diametro da placa
VIDRO_ESP = 2.05
PILHA = 6.90            # vidro + tela + placa
TOTAL = 10.40           # ate o topo dos espacadores M2 (H3.5)
USB_R = 23.80           # boca da USB-C, a partir do centro
USB_PROF = 8.5          # centro da USB-C atras da face do vidro
AREA_D = 44.0           # area visivel

# plugue USB-C em L (medidas tipicas; conferir com o cabo real)
PLUG_L, PLUG_E, PLUG_H = 12.0, 7.0, 10.0   # largura, espessura, altura do cotovelo
PERNA = 16.0                                # trecho rigido que sai para tras
CABO_D = 4.0

# Eixos: X = direita (olhando a tela), Y = para tras, Z = para cima. No modulo sem
# inclinar, o vidro fica em Y = 0 e a tela olha para -Y; v (altura na tela) = Z.


def cil_y(r, y0, y1, u=0.0, v=0.0):
    return cq.Workplane("XY").add(cq.Solid.makeCylinder(r, y1 - y0, cq.Vector(u, y0, v), cq.Vector(0, 1, 0)))


def bloco(u0, u1, y0, y1, v0, v1):
    return cq.Workplane("XY").box(u1 - u0, y1 - y0, v1 - v0).translate(((u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2))


def posiciona(s, incl, pos):
    """Inclina 'incl' graus para tras (em torno de X, pelo centro da tela) e leva o centro a 'pos'."""
    return s.rotate((0, 0, 0), (1, 0, 0), -incl).translate(pos)


def pt(incl, pos, u, y, v):
    a = math.radians(-incl)
    return (pos[0] + u, pos[1] + y * math.cos(a) - v * math.sin(a), pos[2] + y * math.sin(a) + v * math.cos(a))


def tubo(pontos, r):
    s = None
    for a, b in zip(pontos, pontos[1:]):
        d = cq.Vector(*b) - cq.Vector(*a)
        seg = cq.Workplane("XY").add(cq.Solid.makeCylinder(r, d.Length, cq.Vector(*a), d.normalized()))
        esf = cq.Workplane("XY").sphere(r).translate(b)
        s = seg.union(esf) if s is None else s.union(seg).union(esf)
    return s


def modulo():
    """Pecas do modulo, sem inclinar. A USB fica embaixo (v negativo)."""
    vidro = cil_y(VIDRO_D / 2, 0, VIDRO_ESP)
    pilha = cil_y(PCB_D / 2, VIDRO_ESP, PILHA - 1.6)
    pcb = cil_y(PCB_D / 2, PILHA - 1.6, PILHA)
    metal = bloco(-4.5, 4.5, USB_PROF - 1.6, USB_PROF + 1.6, -USB_R, -USB_R + 7.5)       # USB-C
    for (u, v) in ((-20.5, 0.0), (14.7, 13.75), (14.7, -13.75)):                        # espacadores M2
        metal = metal.union(cil_y(1.75, PILHA, TOTAL, u, v))
    v0 = -USB_R - PLUG_H
    plug = bloco(-PLUG_L / 2, PLUG_L / 2, USB_PROF - PLUG_E / 2, USB_PROF + PLUG_E / 2, v0, -USB_R - 0.3)
    plug = plug.union(bloco(-PLUG_L / 2, PLUG_L / 2, USB_PROF + PLUG_E / 2 - 0.1, USB_PROF + PLUG_E / 2 + PERNA,
                            v0, v0 + 8.0))
    return {"vidro": vidro, "pilha": pilha, "pcb": pcb, "metal": metal, "plug": plug}


def saida_plug(incl, pos):
    """Ponto onde o cabo sai da perna do plugue."""
    return pt(incl, pos, 0, USB_PROF + PLUG_E / 2 + PERNA, -USB_R - PLUG_H + 4.0)


# ---------------- OPCAO A: console de radar ----------------
def opcao_a():
    incl = 30.0                         # tela a 60 graus da mesa
    larg, h_frente, s_centro, s_topo = 74.0, 17.0, 38.0, 70.0
    a = math.radians(90 - incl)
    cy, sy = math.cos(a), math.sin(a)
    pos = (0.0, s_centro * cy, h_frente + s_centro * sy)
    topo = (s_topo * cy, h_frente + s_topo * sy)
    prof = topo[0] + 23.0
    perfil = [(0, 0), (0, h_frente), topo, (topo[0] + 8.0, topo[1]), (prof, 0)]
    corpo = cq.Workplane("YZ").polyline(perfil).close().extrude(larg).translate((-larg / 2, 0, 0))
    for r in (4.0, 3.0, 2.0):
        try:
            corpo = corpo.edges("not <Z").fillet(r)
            break
        except Exception:
            continue
    aro = cil_y(30.5, -1.4, 3.0).cut(cil_y(VIDRO_D / 2 + 0.45, -3, 4))
    corpo = corpo.union(posiciona(aro, incl, pos))
    corpo = corpo.cut(posiciona(cil_y(VIDRO_D / 2 + 0.45, -3, TOTAL + 1), incl, pos))     # alojamento do modulo
    corpo = corpo.cut(bloco(-6.5, 6.5, prof - 12, prof + 2, -1, 8.5))                      # saida do cabo atras
    p0 = saida_plug(incl, pos)
    cabo = tubo([p0, (0, p0[1] + 9, 3.0), (0, prof - 6, 2.6), (0, prof + 22, 2.2), (14, prof + 62, 2.2),
                 (46, prof + 95, 2.2)], CABO_D / 2)
    return dict(nome="A", titulo="Opção A — Console de radar", corpo=corpo, incl=incl, pos=pos, cabo=cabo,
                dims=(larg, topo[1], prof))


# ---------------- OPCAO B: instrumento sobre pedestal ----------------
def opcao_b():
    incl = 15.0                         # tela a 75 graus da mesa
    hc = 47.0                           # altura do centro da tela
    pos = (0.0, 0.0, hc)
    r_cab, prof_cab, larg_pesc, prof_pesc = 31.0, 23.0, 30.0, 36.0
    cab = cq.Workplane("XZ").workplane(offset=-(prof_cab - 1.0)).circle(r_cab).extrude(prof_cab)
    pesc = (cq.Workplane("XZ").workplane(offset=-(prof_pesc - 1.0)).center(0, -42).rect(larg_pesc, 76)
            .extrude(prof_pesc))
    pesc = pesc.edges("|Z").edges(">Y").fillet(6.0)
    corpo = cab.union(pesc)
    vj = -math.sqrt(r_cab ** 2 - (larg_pesc / 2) ** 2)
    for sx in (-1, 1):
        sel = cq.selectors.BoxSelector((sx * larg_pesc / 2 - 1, -5, vj - 1), (sx * larg_pesc / 2 + 1, 30, vj + 1))
        try:
            corpo = corpo.edges(sel).fillet(8.0)
        except Exception as e:
            print("  aviso: sem arredondamento cabeca/pescoco:", type(e).__name__)
    corpo = corpo.faces("<Y").edges().chamfer(1.2)
    corpo = corpo.cut(cil_y(VIDRO_D / 2 + 0.45, -3, TOTAL + 1))                           # alojamento do modulo
    v0 = -USB_R - PLUG_H
    corpo = corpo.cut(bloco(-3.6, 3.6, 24, prof_pesc + 2, v0 + 0.5, v0 + 8.0))                # saida do cabo
    corpo = posiciona(corpo, incl, pos)
    pe = cq.Workplane("XY").ellipse(33, 30).extrude(8.0).edges(">Z").fillet(3.0).translate((0, 13, 0))
    corpo = corpo.union(pe).cut(bloco(-100, 100, -100, 100, -100, 0))
    p0 = saida_plug(incl, pos)
    p1 = pt(incl, pos, 0, prof_pesc + 3, v0 + 4.0)
    cabo = tubo([p0, p1, (0, p1[1] + 9, 5.0), (0, p1[1] + 20, 2.4), (0, p1[1] + 45, 2.2), (-16, p1[1] + 85, 2.2),
                 (-50, p1[1] + 115, 2.2)], CABO_D / 2)
    alt = hc + r_cab * math.cos(math.radians(incl)) + 2
    return dict(nome="B", titulo="Opção B — Instrumento sobre pedestal", corpo=corpo, incl=incl, pos=pos,
                cabo=cabo, dims=(66.0, alt, 60.0))


# ---------------- imagem da tela ----------------
def textura_radar(caminho, n=768):
    im = Image.new("RGB", (n, n), (2, 8, 5))
    d = ImageDraw.Draw(im, "RGBA")
    c = n / 2
    R = n / 2 - 6
    for i in range(70):                                          # rastro da varredura
        a0 = -70 + i
        d.pieslice([c - R, c - R, c + R, c + R], a0, a0 + 1.6, fill=(40, 255, 120, int(2 + i * 1.6)))
    for k in (0.25, 0.5, 0.75, 1.0):
        r = R * k
        d.ellipse([c - r, c - r, c + r, c + r], outline=(40, 210, 110, 190), width=3)
    d.line([c - R, c, c + R, c], fill=(40, 210, 110, 130), width=2)
    d.line([c, c - R, c, c + R], fill=(40, 210, 110, 130), width=2)
    ang = math.radians(0)
    d.line([c, c, c + R * math.cos(ang), c + R * math.sin(ang)], fill=(140, 255, 180, 255), width=4)
    try:
        f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", int(n * 0.045))
    except Exception:
        f = ImageFont.load_default()
    for (dx, dy, nome, cor) in ((0.30, -0.36, "GLO1446", (255, 190, 40)), (-0.42, 0.10, "AZU6002", (120, 220, 255)),
                                (0.12, 0.48, "TAM3310", (255, 255, 255))):
        x, y = c + dx * R, c + dy * R
        d.polygon([(x, y - 13), (x + 10, y + 11), (x, y + 5), (x - 10, y + 11)], fill=cor + (255,))
        d.text((x + 16, y - 16), nome, fill=cor + (255,), font=f)
    d.ellipse([c - 5, c - 5, c + 5, c + 5], fill=(140, 255, 180, 255))
    im.save(caminho)


# ---------------- render ----------------
CORPO, ARO_X = (0.17, 0.18, 0.20), (0.60, 0.62, 0.66)
CORES = {"vidro": (0.02, 0.02, 0.03), "pilha": (0.30, 0.31, 0.33), "pcb": (0.10, 0.28, 0.62),
         "metal": (0.80, 0.68, 0.30), "plug": (0.92, 0.92, 0.90), "cabo": (0.90, 0.90, 0.88)}


def stl(s, nome):
    caminho = os.path.join(TMP, nome + ".stl")
    cq.exporters.export(s, caminho, tolerance=0.03, angularTolerance=0.12)
    return caminho


def ator_stl(caminho, cor, opac=1.0):
    r = vtk.vtkSTLReader()
    r.SetFileName(caminho)
    n = vtk.vtkPolyDataNormals()
    n.SetInputConnection(r.GetOutputPort())
    n.SetFeatureAngle(35)
    n.SplittingOn()
    m = vtk.vtkPolyDataMapper()
    m.SetInputConnection(n.GetOutputPort())
    a = vtk.vtkActor()
    a.SetMapper(m)
    p = a.GetProperty()
    p.SetColor(*cor)
    p.SetOpacity(opac)
    p.SetAmbient(0.28)
    p.SetDiffuse(0.72)
    p.SetSpecular(0.18)
    p.SetSpecularPower(25)
    return a


def ator_tela(tex_png, incl, pos):
    disco = vtk.vtkDiskSource()
    disco.SetInnerRadius(0)
    disco.SetOuterRadius(AREA_D / 2)
    disco.SetCircumferentialResolution(120)
    tm = vtk.vtkTextureMapToPlane()
    tm.SetInputConnection(disco.GetOutputPort())
    h = AREA_D / 2
    tm.SetOrigin(-h, -h, 0)
    tm.SetPoint1(h, -h, 0)
    tm.SetPoint2(-h, h, 0)
    t = vtk.vtkTransform()
    t.PostMultiply()
    t.RotateX(90)
    t.Translate(0, -0.06, 0)
    t.RotateX(-incl)
    t.Translate(*pos)
    tf = vtk.vtkTransformPolyDataFilter()
    tf.SetTransform(t)
    tf.SetInputConnection(tm.GetOutputPort())
    m = vtk.vtkPolyDataMapper()
    m.SetInputConnection(tf.GetOutputPort())
    rd = vtk.vtkPNGReader()
    rd.SetFileName(tex_png)
    tex = vtk.vtkTexture()
    tex.SetInputConnection(rd.GetOutputPort())
    tex.InterpolateOn()
    a = vtk.vtkActor()
    a.SetMapper(m)
    a.SetTexture(tex)
    a.GetProperty().LightingOff()
    return a


def ator_mesa():
    pl = vtk.vtkPlaneSource()
    pl.SetOrigin(-4000, -4000, -0.05)
    pl.SetPoint1(4000, -4000, -0.05)
    pl.SetPoint2(-4000, 4000, -0.05)
    m = vtk.vtkPolyDataMapper()
    m.SetInputConnection(pl.GetOutputPort())
    a = vtk.vtkActor()
    a.SetMapper(m)
    a.GetProperty().SetColor(0.86, 0.85, 0.82)
    a.GetProperty().LightingOff()
    return a


def render(arq, atores, cam, foco, tam=(900, 700), zoom=1.0, paralelo=False, escala=None):
    ren = vtk.vtkRenderer()
    ren.SetBackground(0.90, 0.91, 0.93)
    ren.SetBackground2(0.97, 0.97, 0.98)
    ren.GradientBackgroundOn()
    for a in atores:
        ren.AddActor(a)
    w = vtk.vtkRenderWindow()
    w.SetOffScreenRendering(1)
    w.SetMultiSamples(8)
    w.AddRenderer(ren)
    w.SetSize(*tam)
    c = ren.GetActiveCamera()
    c.SetPosition(*cam)
    c.SetFocalPoint(*foco)
    c.SetViewUp(0, 0, 1)
    if paralelo:
        c.ParallelProjectionOn()
        c.SetParallelScale(escala)
    else:
        c.SetViewAngle(24)
        c.Zoom(zoom)
    ren.ResetCameraClippingRange()
    w.Render()
    f = vtk.vtkWindowToImageFilter()
    f.SetInput(w)
    f.Update()
    wr = vtk.vtkPNGWriter()
    wr.SetFileName(arq)
    wr.SetInputConnection(f.GetOutputPort())
    wr.Write()


def fonte(tam, negrito=False):
    nome = "DejaVuSans-Bold.ttf" if negrito else "DejaVuSans.ttf"
    try:
        return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/" + nome, tam)
    except Exception:
        return ImageFont.load_default()


def folha(op, tex, notas):
    n = op["nome"]
    incl, pos = op["incl"], op["pos"]
    mod = modulo()
    pecas = {k: stl(posiciona(v, incl, pos), f"{n}_{k}") for k, v in mod.items()}
    corpo, cabo = stl(op["corpo"], f"{n}_corpo"), stl(op["cabo"], f"{n}_cabo")
    L, H, P = op["dims"]
    foco = (0, P * 0.35, H * 0.48)

    def cena(opac=1.0, mesa=True):
        at = [ator_stl(corpo, CORPO if opac == 1.0 else ARO_X, opac), ator_stl(cabo, CORES["cabo"]),
              ator_tela(tex, incl, pos)]
        at += [ator_stl(pecas[k], CORES[k]) for k in ("vidro", "pilha", "pcb", "metal", "plug")]
        if mesa:
            at.append(ator_mesa())
        return at

    tiles = []
    for nome, at, cam, kw in (
        ("frente", cena(), (-150, -300, 165), dict(zoom=1.0)),
        ("tras", cena(), (190, 330, 150), dict(zoom=1.0)),
        ("lado", cena(mesa=False), (-600, foco[1], foco[2]), dict(paralelo=True, escala=62)),
        ("raiox", cena(opac=0.22, mesa=False), (-600, foco[1], foco[2]), dict(paralelo=True, escala=62)),
    ):
        arq = os.path.join(TMP, f"{n}_{nome}.png")
        render(arq, at, cam, foco, **kw)
        tiles.append(arq)

    W, Hh, topo, rod = 1800, 1400, 120, 250
    sh = Image.new("RGB", (W, topo + Hh + rod), "white")
    d = ImageDraw.Draw(sh)
    d.text((40, 28), op["titulo"], fill=(20, 22, 28), font=fonte(48, True))
    d.text((40, 86), f"Aprox. {L:.0f} × {H:.0f} × {P:.0f} mm (largura × altura × profundidade)  ·  "
                     f"tela inclinada {incl:.0f}° para trás", fill=(70, 74, 84), font=fonte(26))
    rot = ("Frente", "Trás — saída do cabo", "Lateral", "Lateral em corte — módulo, USB-C e plugue em L")
    for i, arq in enumerate(tiles):
        im = Image.open(arq)
        x, y = (i % 2) * 900, topo + (i // 2) * 700
        sh.paste(im, (x, y))
        d.text((x + 24, y + 18), rot[i], fill=(30, 32, 40), font=fonte(26, True))
    y = topo + Hh + 24
    for linha in notas:
        d.text((40, y), "•  " + linha, fill=(40, 44, 52), font=fonte(26))
        y += 40
    os.makedirs(SAIDA, exist_ok=True)
    arq = os.path.join(SAIDA, f"opcao_{n.lower()}.png")
    sh.save(arq)
    return arq


def main():
    tex = os.path.join(TMP, "radar.png")
    textura_radar(tex)
    a, b = opcao_a(), opcao_b()
    fa = folha(a, tex, [
        "Bloco em cunha, como um console de radar: o mais estável e o que mais esconde o cabo.",
        "O plugue em L fica dentro do corpo; o cabo corre por dentro e sai rente à mesa, atrás.",
        "Tela a 60° da mesa: boa leitura de cima, com a peça perto de você.",
        "Impressão em 2 peças (corpo + fundo), sem suporte.",
        "Botões PWR/BOOT ficam sob o aro, em cima: acesso por dois furos (a definir).",
    ])
    fb = folha(b, tex, [
        "Cabeça redonda sobre pedestal, como um instrumento de cockpit: mais leve e com menos área de mesa.",
        "O plugue em L fica escondido no pescoço; o cabo sai por um rasgo atrás, pouco acima da mesa.",
        "Tela a 75° da mesa: quase de frente, melhor para ver de mais longe.",
        "Impressão em 2 peças (frente + traseira com o pé), sem suporte.",
        "Botões PWR/BOOT ficam no topo da cabeça: acesso por dois furos (a definir).",
    ])
    print(fa, a["dims"])
    print(fb, b["dims"])


if __name__ == "__main__":
    main()
