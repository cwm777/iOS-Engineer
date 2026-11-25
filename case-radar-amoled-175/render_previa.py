#!/usr/bin/env python3
"""Imagens de conferencia das pecas geradas por gerar_stl.py (rode gerar_stl.py antes).
Uso: xvfb-run -a python3 render_previa.py"""
import math
import os

from PIL import Image, ImageDraw

import gerar_mockups as m
import gerar_stl as g

AQUI = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(AQUI, "_ref")
COR = {"corpo": (0.17, 0.18, 0.20), "frente": (0.17, 0.18, 0.20), "painel": (0.24, 0.25, 0.28),
       "fundo": (0.30, 0.31, 0.34), "base": (0.24, 0.25, 0.28), "tampa": (0.85, 0.45, 0.10),
       "vidro": (0.02, 0.02, 0.03), "pilha": (0.30, 0.31, 0.33), "pcb": (0.10, 0.28, 0.62),
       "metal": (0.80, 0.68, 0.30), "altos": (0.75, 0.75, 0.72), "plug": (0.92, 0.92, 0.90)}
MOD = ("vidro", "pilha", "pcb", "metal", "altos")


def folha(op, pecas, titulo, notas, explode):
    n, incl, pos = op["nome"], op["incl"], op["pos"]
    a = math.radians(incl)
    nrm = (0.0, -math.cos(a), math.sin(a))                # para fora da tela
    tex = os.path.join(m.TMP, "radar.png")
    m.textura_radar(tex)
    L, H, P = op["dims"]
    foco = (0, P * 0.35, H * 0.48)

    def cena(opac=1.0, expl=False, plug=True, mesa=True):
        at = []
        nomes = list(pecas) + list(MOD) + (["plug"] if plug else [])
        for k in nomes:
            o = opac if k in pecas and k != "tampa" else 1.0
            ator = m.ator_stl(os.path.join(REF, f"{n}_{k}.stl"), COR[k] if o == 1.0 else (0.6, 0.62, 0.66), o)
            if expl:
                d, dz = explode.get("modulo" if k in MOD else k, (0.0, 0.0))
                ator.SetPosition(nrm[0] * d, nrm[1] * d, nrm[2] * d + dz)
            at.append(ator)
        tela = m.ator_tela(tex, incl, pos)
        if expl:
            d, dz = explode.get("modulo", (0.0, 0.0))
            tela.SetPosition(nrm[0] * d, nrm[1] * d, nrm[2] * d + dz)
        at.append(tela)
        if mesa:
            at.append(m.ator_mesa())
        return at

    vistas = (
        ("Frente", cena(), (-150, -300, 165), dict(zoom=1.0)),
        ("Trás", cena(), (190, 330, 150), dict(zoom=1.0)),
        ("Explodida", cena(expl=True, plug=False, mesa=False), (-330, -300, 190), dict(zoom=0.62)),
        ("Lateral em corte — módulo, tampa e plugue em L", cena(opac=0.22, mesa=False),
         (-600, foco[1], foco[2]), dict(paralelo=True, escala=64)),
    )
    W, Hh, topo, rod = 1800, 1400, 120, 60 + 40 * len(notas)
    sh = Image.new("RGB", (W, topo + Hh + rod), "white")
    d = ImageDraw.Draw(sh)
    d.text((40, 28), titulo, fill=(20, 22, 28), font=m.fonte(48, True))
    d.text((40, 86), f"{L:.0f} × {H:.0f} × {P:.0f} mm (largura × altura × profundidade)  ·  tela inclinada "
                     f"{incl:.0f}° para trás", fill=(70, 74, 84), font=m.fonte(26))
    for i, (rot, at, cam, kw) in enumerate(vistas):
        arq = os.path.join(m.TMP, f"{n}_{i}.png")
        m.render(arq, at, cam, foco, **kw)
        x, y = (i % 2) * 900, topo + (i // 2) * 700
        sh.paste(Image.open(arq), (x, y))
        d.text((x + 24, y + 18), rot, fill=(30, 32, 40), font=m.fonte(26, True))
    y = topo + Hh + 24
    for linha in notas:
        d.text((40, y), "•  " + linha, fill=(40, 44, 52), font=m.fonte(26))
        y += 40
    arq = os.path.join(AQUI, f"previa_opcao_{n}.png")
    sh.save(arq)
    print(arq)


def main():
    a, b = g.opcao_a(), g.opcao_b()
    folha(a, ("corpo", "painel", "fundo", "tampa"), "Opção A — Console de radar (STL)", [
        "4 peças: painel frontal (cinza), tampa do módulo (laranja), corpo e fundo.",
        "O módulo é preso à tampa pelos 3 espaçadores M2; a tampa parafusa no colar do painel.",
        "O painel fecha o corpo com 4 parafusos M3 de cabeça chata em insertos; o fundo, com mais 4.",
        "O plugue em L fica atrás do painel e o cabo sai pelo rasgo de trás, rente à mesa.",
    ], {"painel": (62.0, 0.0), "modulo": (40.0, 0.0), "tampa": (16.0, 0.0), "fundo": (0.0, -16.0)})
    folha(b, ("frente", "base", "tampa"), "Opção B — Instrumento sobre pedestal (STL)", [
        "3 peças: frente (cabeça + pescoço), tampa do módulo (laranja) e base.",
        "O módulo é preso à tampa pelos 3 espaçadores M2; a tampa parafusa atrás da cabeça.",
        "A base prende no pescoço com 2 parafusos M3 de cabeça chata em insertos.",
        "O plugue em L sobe pelo pescoço e o cabo sai pelo rasgo de trás.",
    ], {"modulo": (34.0, 0.0), "tampa": (-26.0, 0.0), "base": (0.0, -16.0)})


if __name__ == "__main__":
    main()
