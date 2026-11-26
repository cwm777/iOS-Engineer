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
CORPO = (0.17, 0.18, 0.20)
COR = {"vidro": (0.02, 0.02, 0.03), "pilha": (0.30, 0.31, 0.33), "pcb": (0.10, 0.28, 0.62),
       "metal": (0.80, 0.68, 0.30), "altos": (0.75, 0.75, 0.72), "plug": (0.92, 0.92, 0.90)}
MOD = ("vidro", "pilha", "pcb", "metal", "altos")


def folha(op, titulo, notas):
    n, incl, pos = op["nome"], op["incl"], op["pos"]
    a = math.radians(incl)
    nrm = (0.0, -math.cos(a), math.sin(a))                # para fora da tela
    vv = (0.0, math.sin(a), math.cos(a))                  # para cima, ao longo da tela
    tex = os.path.join(m.TMP, "radar.png")
    m.textura_radar(tex)
    L, H, P = op["dims"]
    foco = (0, P * 0.35, H * 0.48)

    def cena(opac=1.0, fora=0.0, desce=0.0, modulo=True, plug=True, mesa=True):
        at = [m.ator_stl(os.path.join(REF, f"{n}_corpo.stl"), CORPO if opac == 1.0 else (0.6, 0.62, 0.66), opac)]
        if modulo:
            for k in MOD:
                ator = m.ator_stl(os.path.join(REF, f"{n}_{k}.stl"), COR[k])
                ator.SetPosition(nrm[0] * fora, nrm[1] * fora, nrm[2] * fora)
                at.append(ator)
            tela = m.ator_tela(tex, incl, pos)
            tela.SetPosition(nrm[0] * fora, nrm[1] * fora, nrm[2] * fora)
            at.append(tela)
        if plug:
            ator = m.ator_stl(os.path.join(REF, f"{n}_plug.stl"), COR["plug"])
            ator.SetPosition(-vv[0] * desce, -vv[1] * desce, -vv[2] * desce)
            at.append(ator)
        if mesa:
            at.append(m.ator_mesa())
        return at

    imp = os.path.join(AQUI, "stl", f"opcao_{n}.stl")
    vistas = (
        ("Frente", cena(), (-150, -300, 165), foco, dict(zoom=1.0)),
        ("Trás — aberto, com o plugue em L no canal", cena(), (150, 330, 170), foco, dict(zoom=1.0)),
        ("Encaixe: a tela entra pela frente, o plugue desce 8 mm", cena(fora=26, desce=g.CURSO_USB, mesa=False),
         (-330, -300, 190), foco, dict(zoom=0.75)),
        ("Peça vazia, por trás: vigas de apoio e nervuras", cena(modulo=False, plug=False, mesa=False),
         (90, 330, 200), foco, dict(zoom=0.95)),
        ("Lateral em corte", cena(opac=0.22, mesa=False), (-600, foco[1], foco[2]),
         foco, dict(paralelo=True, escala=64)),
        ("Posição de impressão (face da frente na mesa)", [m.ator_stl(imp, CORPO), m.ator_mesa()],
         (170, -260, 190), (0, 0, 20), dict(zoom=0.9)),
    )
    W, Hh, topo, rod = 1800, 2100, 120, 60 + 40 * len(notas)
    sh = Image.new("RGB", (W, topo + Hh + rod), "white")
    d = ImageDraw.Draw(sh)
    d.text((40, 28), titulo, fill=(20, 22, 28), font=m.fonte(48, True))
    d.text((40, 86), f"Peça única  ·  {L:.0f} × {H:.0f} × {P:.0f} mm (largura × altura × profundidade)  ·  "
                     f"tela inclinada {incl:.0f}° para trás", fill=(70, 74, 84), font=m.fonte(26))
    for i, (rot, at, cam, fc, kw) in enumerate(vistas):
        arq = os.path.join(m.TMP, f"{n}_{i}.png")
        m.render(arq, at, cam, fc, **kw)
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
    comum = ["A tela entra pela frente: apoia nos 3 espaçadores e 3 nervuras apertam de leve a borda da placa.",
             "O plugue em L entra por baixo num canal aberto atrás; sai sem desmontar nada."]
    folha(g.opcao_a(), "Opção A — Console de radar", comum + [
        "Face inclinada, duas laterais e piso; aberto atrás. O cabo sai rente à mesa pelo rasgo do piso."])
    folha(g.opcao_b(), "Opção B — Instrumento sobre pedestal", comum + [
        "Cabeça, pescoço e pé em garfo; o cabo sai entre os dois braços do pé."])


if __name__ == "__main__":
    main()
