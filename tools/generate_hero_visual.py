#!/usr/bin/env python3
"""Draw original 64x96 Lynn pixels and poses from coordinates, never resize old art.

Pillow only rasterizes authored polygons/lines at the final pixel grid. Every
direction is drawn with its own face, cloak and anatomical equipment layering.
"""
from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/art/characters/lynn_hd"
SIZE = (64, 96)
FOOT = (32, 88)
DIRECTIONS = ("south", "north", "east", "west")
COUNTS = {"idle": 4, "walk": 6, "attack": 6, "dash": 4,
          "pulse": 6, "hit": 3, "death": 6, "interact": 4}
FPS = {"idle": 6, "walk": 10, "attack": 14, "dash": 16,
       "pulse": 12, "hit": 10, "death": 8, "interact": 8}
P = {
    "ink": "#25333d", "hair_ink": "#685b55", "hair_deep": "#998b7e",
    "hair_shadow": "#bcad99", "hair_mid": "#ded0b5", "hair": "#efe0c3",
    "hair_light": "#fff0d3", "hair_glint": "#fff7df",
    "skin_deep": "#a36752", "skin_shadow": "#cb9070", "skin": "#edb991",
    "skin_light": "#ffd7ad", "skin_glint": "#ffe4bf", "blush": "#d9957c",
    "eye": "#3b3035", "iris": "#a66b35", "iris_light": "#d99945",
    "shirt_deep": "#a49580", "shirt_shadow": "#c7b69b", "shirt": "#e8d8b8",
    "shirt_light": "#fff0cf", "shirt_glint": "#fff7df",
    "cape_deep": "#173f49", "cape_shadow": "#205a60", "cape": "#2f7f7b",
    "cape_light": "#58a79a", "cape_glint": "#83c0ac",
    "pants_deep": "#243b47", "pants_shadow": "#2e4b59", "pants": "#3f6069",
    "pants_light": "#5c7b7c", "pants_glint": "#78918a",
    "leather_deep": "#463831", "leather_shadow": "#684733", "leather": "#92603e",
    "leather_light": "#b47d49", "leather_glint": "#cc9a65",
    "brass_deep": "#754b2e", "brass": "#be8744", "brass_light": "#e8b65c",
    "brass_glint": "#ffe0a0", "glass": "#df8734", "amber": "#ffbd54",
    "flame": "#ffdf88", "flame_core": "#fff5c5",
}


class Pixels:
    def __init__(self, dx=0, dy=0):
        self.im = Image.new("RGBA", SIZE)
        self.d = ImageDraw.Draw(self.im)
        self.dx, self.dy = dx, dy

    def pts(self, points):
        return [(round(x + self.dx), round(y + self.dy)) for x, y in points]

    def poly(self, points, color, outline=None):
        self.d.polygon(self.pts(points), fill=P.get(color, color),
                       outline=P.get(outline, outline) if outline else None)

    def line(self, points, color, width=1):
        self.d.line(self.pts(points), fill=P.get(color, color), width=width)

    def rect(self, x, y, w, h, color):
        self.d.rectangle((round(x+self.dx), round(y+self.dy),
                          round(x+w-1+self.dx), round(y+h-1+self.dy)), fill=P.get(color, color))

    def dot(self, x, y, color):
        self.rect(x, y, 1, 1, color)


def satchel(c, x, y, back=False):
    # Rounded flap, separate gusset, hand-stitched edges and two useful tools.
    c.poly([(x+1,y),(x+10,y-1),(x+14,y+2),(x+14,y+12),(x+12,y+15),
            (x+1,y+14),(x-1,y+10),(x-1,y+3)], "leather_shadow", "ink")
    c.poly([(x+1,y+2),(x+10,y+1),(x+11,y+13),(x+1,y+12)], "leather")
    c.poly([(x,y+1),(x+11,y),(x+12,y+5),(x+9,y+7),(x+1,y+6)], "leather_light", "leather_deep")
    c.line([(x+1,y+1),(x+9,y+1)], "leather_glint")
    c.line([(x+12,y+4),(x+12,y+12)], "leather_deep")
    c.rect(x+4,y+5,3,5,"brass_deep")
    c.rect(x+4,y+6,3,3,"brass")
    c.dot(x+5,y+6,"brass_glint")
    c.dot(x+5,y+8,"leather_deep")
    c.line([(x+3,y+10),(x+3,y+12)], "leather_shadow")
    for sx, sy in [(x+1,y+8),(x+1,y+11),(x+8,y+12),(x+10,y+12)]:
        c.dot(sx,sy,"leather_glint")
    c.rect(x+8,y-4,2,5,"shirt_shadow")
    c.rect(x+8,y-4,1,3,"shirt_light")
    c.line([(x+11,y-3),(x+12,y-6),(x+13,y-6)],"pants_light")
    c.dot(x+11,y-4,"shirt_glint")


def lantern(c, x, y, pulse=0):
    # x/y is the handle centre: copper frame remains legible, no baked glow.
    c.line([(x-3,y+4),(x-3,y+1),(x-1,y-1),(x+2,y-1),(x+4,y+1),(x+4,y+4)],"leather_deep")
    c.line([(x-2,y+3),(x-2,y+1),(x,y),(x+2,y),(x+3,y+2)],"brass_light")
    c.poly([(x-4,y+5),(x-2,y+3),(x+2,y+3),(x+5,y+5),(x+6,y+7),(x-5,y+7)],"brass", "leather_deep")
    c.line([(x-2,y+4),(x+2,y+4)],"brass_glint")
    c.poly([(x-4,y+7),(x+5,y+7),(x+5,y+18),(x+3,y+20),(x-2,y+20),(x-4,y+18)],"glass", "leather_deep")
    c.rect(x-2,y+8,5,10,"amber")
    c.poly([(x-1,y+16),(x-2,y+13),(x,y+11-(pulse%2)),(x+1,y+9),(x+2,y+13),(x+3,y+16),(x+1,y+18)],"flame")
    c.line([(x,y+16),(x+1,y+13),(x+1,y+16)],"flame_core")
    c.rect(x-4,y+8,1,9,"brass")
    c.rect(x+4,y+8,1,9,"brass_deep")
    c.line([(x-2,y+9),(x-2,y+13)],"brass_glint")
    c.poly([(x-5,y+18),(x+6,y+18),(x+5,y+21),(x-4,y+21)],"brass", "leather_deep")
    c.line([(x-3,y+19),(x+3,y+19)],"brass_light")
    c.dot(x-3,y+7,"brass_glint")


def boot(c, x, y, facing, back=False):
    # y is sole bottom and may lift during the passing pose.
    side = facing in ("east", "west")
    toe = 4 if facing == "east" else -4 if facing == "west" else 1
    c.poly([(x-4,y-13),(x+4,y-13),(x+4,y-5),(x+5+max(toe,0),y-3),
            (x+5+max(toe,0),y),(x-5+min(toe,0),y),(x-5+min(toe,0),y-3),(x-4,y-5)],"leather_shadow","ink")
    c.poly([(x-3,y-12),(x+2,y-12),(x+2,y-4),(x+4+max(toe,0),y-3),
            (x+4+max(toe,0),y-1),(x-3+min(toe,0),y-1),(x-3,y-5)],"leather")
    c.rect(x-3,y-11,6,2,"leather_deep")
    c.line([(x-2,y-12),(x+2,y-12)],"leather_glint")
    for row in [y-9,y-6]:
        c.line([(x-2,row),(x+1,row)],"leather_light")
        c.dot(x+2,row,"brass")
    c.line([(x-3+min(toe,0),y-2),(x+4+max(toe,0),y-2)],"leather_light")
    c.line([(x-4+min(toe,0),y),(x+5+max(toe,0),y)],"leather_deep")


def leg(c, hip, knee, ankle, facing, lit=True):
    hx,hy=hip; kx,ky=knee; ax,ay=ankle
    c.poly([(hx-5,hy),(hx+5,hy),(kx+5,ky),(ax+3,ay-12),(ax-4,ay-12),(kx-6,ky)],"pants_shadow","ink")
    c.poly([(hx-4,hy+1),(hx+1,hy+1),(kx+2,ky-2),(ax+1,ay-13),(ax-3,ay-13),(kx-3,ky)],"pants" if lit else "pants_shadow")
    c.line([(hx-3,hy+3),(kx-3,ky-2),(kx-1,ky)],"pants_light" if lit else "pants")
    c.line([(kx,ky-2),(kx+3,ky-1)],"pants_deep")
    c.line([(kx-2,ky+1),(kx+2,ky+1)],"pants_light")
    c.rect(ax-3,ay-14,6,3,"skin_shadow")
    c.rect(ax-2,ay-14,4,2,"skin")
    boot(c,ax,ay,facing)


def arm(c, shoulder, elbow, hand, light=True):
    sx,sy=shoulder; ex,ey=elbow; hx,hy=hand
    c.poly([(sx-3,sy-2),(sx+3,sy-2),(ex+3,ey),(ex+2,ey+3),(ex-3,ey+3),(sx-4,sy+3)],"shirt_shadow","ink")
    c.poly([(sx-2,sy-1),(sx+2,sy),(ex+2,ey-1),(ex,ey+1),(ex-2,ey)],"shirt_light" if light else "shirt")
    c.line([(sx-2,sy+3),(ex-2,ey-1)],"shirt_deep")
    c.line([(ex-3,ey),(ex+2,ey+1)],"shirt_glint")
    c.line([(ex,ey+2),(hx,hy)],"skin_deep",5)
    c.line([(ex,ey+2),(hx,hy-1)],"skin",3)
    c.poly([(hx-2,hy-1),(hx+1,hy-2),(hx+3,hy),(hx+2,hy+3),(hx-1,hy+4),(hx-3,hy+2)],"skin","skin_deep")
    c.line([(hx-2,hy),(hx,hy-1),(hx+1,hy)],"skin_light")
    c.line([(hx,hy+2),(hx+2,hy+1)],"skin_shadow")


def front_head(c, back=False, blink=False, fierce=False):
    # Individual stepped locks make the ivory bob unlike a rectangular helmet.
    c.poly([(19,27),(18,20),(20,13),(24,9),(31,7),(37,8),(42,11),(45,16),
            (46,24),(44,29),(42,33),(38,34),(35,31),(25,33),(21,31)],"hair_shadow","hair_ink")
    c.poly([(21,19),(23,12),(29,9),(35,9),(41,12),(44,18),(43,24),(39,28),(24,28)],"hair")
    c.poly([(23,15),(28,10),(34,9),(37,11),(31,13),(28,18)],"hair_light")
    c.line([(25,13),(28,11),(32,10)],"hair_glint")
    c.line([(35,11),(39,13),(41,17)],"hair_mid")
    if back:
        c.poly([(21,19),(25,15),(32,14),(38,16),(44,20),(43,28),(40,31),
                (36,33),(33,31),(29,34),(25,31),(22,31),(23,27)],"hair_mid")
        c.poly([(26,16),(32,14),(36,17),(35,25),(31,30),(28,27)],"hair")
        c.poly([(37,18),(41,20),(40,26),(37,29),(36,27)],"hair_shadow")
        for pts,col in [([(24,19),(23,23),(25,28)],"hair_shadow"),
                        ([(28,17),(27,22),(30,28)],"hair_light"),
                        ([(33,17),(33,23),(32,27)],"hair_light"),
                        ([(39,20),(39,24),(37,28)],"hair_deep")]:
            c.line(pts,col)
        c.dot(29,30,"hair_light")
        c.poly([(20,22),(18,26),(21,29),(19,31),(23,32),(25,28)],"hair_mid","hair_ink")
        c.poly([(43,23),(46,26),(44,27),(45,30),(41,33),(40,28)],"hair_shadow","hair_ink")
        return
    c.poly([(25,18),(39,18),(41,22),(41,28),(38,33),(33,35),(28,33),(24,29),(23,23)],"skin_shadow","hair_ink")
    c.poly([(26,20),(38,19),(40,22),(39,29),(36,33),(31,33),(26,30),(25,24)],"skin")
    c.poly([(28,21),(36,20),(38,23),(37,29),(32,31),(28,29)],"skin_light")
    c.rect(23,25,2,4,"skin_shadow")
    c.dot(24,26,"skin_light")
    c.rect(40,25,2,3,"skin")
    # Amber eyes, thin lashes, brow, nose and a calm small mouth.
    for x in [27,36]:
        c.line([(x-2,23),(x,22),(x+1,23)],"hair_ink")
        if blink:
            c.line([(x-2,26),(x+1,26)],"eye")
        else:
            c.line([(x-2,25),(x,24),(x+2,25)],"eye")
            c.rect(x-1,25,3,4,"iris")
            c.rect(x,25,1,3,"eye")
            c.dot(x-1,25,"flame_core")
            c.dot(x+1,28,"iris_light")
            c.dot(x-2,27,"skin_glint")
    c.dot(32,28,"skin_shadow")
    c.dot(33,29,"skin_glint")
    c.line([(31,32),(33,32)],"skin_deep")
    c.dot(29,30,"blush"); c.dot(37,30,"blush")
    c.dot(32,33,"skin_light")
    # Sweep from a side part; different lock lengths reveal a real face.
    c.poly([(22,17),(26,12),(33,10),(32,15),(29,20),(25,24),(23,29),(22,25),(20,27),(21,21),(18,23),(20,18)],"hair_mid","hair_ink")
    c.poly([(24,17),(28,13),(32,11),(30,16),(27,20),(24,22)],"hair_light")
    c.line([(26,17),(24,21),(23,25)],"hair")
    c.poly([(34,11),(40,13),(44,18),(45,23),(43,27),(44,30),(41,32),(40,28),(42,24),(39,22),(37,18),(34,17),(33,21),(32,19)],"hair","hair_ink")
    c.poly([(36,13),(39,15),(42,20),(42,22),(39,20)],"hair_light")
    c.line([(38,22),(40,25),(40,28)],"hair_shadow")
    c.line([(21,28),(22,31),(24,30)],"hair_deep")
    c.dot(42,29,"hair_light")


def side_head(c, east, blink=False):
    # Profile coordinates are reflected anatomically, not the finished texture.
    def tr(points):
        return points if east else [(64-x,y) for x,y in points]
    def poly(points,col,out=None): c.poly(tr(points),col,out)
    def line(points,col,w=1): c.line(tr(points),col,w)
    def dot(x,y,col): c.poly(tr([(x,y),(x,y)]),col)
    poly([(20,28),(18,23),(19,16),(23,11),(29,8),(35,8),(41,11),(44,16),
          (43,21),(40,23),(37,31),(31,34),(24,33)],"hair_shadow","hair_ink")
    poly([(23,16),(28,10),(35,10),(40,12),(43,17),(39,23),(28,28),(21,23)],"hair")
    poly([(32,17),(41,17),(43,22),(46,25),(44,27),(45,29),(42,33),(36,34),(32,30)],"skin_shadow","hair_ink")
    poly([(35,18),(41,19),(41,23),(45,25),(43,27),(44,29),(41,32),(37,32),(34,28)],"skin_light")
    line([(39,22),(42,22)],"hair_ink")
    if blink:
        line([(39,25),(42,25)],"eye")
    else:
        line([(39,24),(42,24),(42,25)],"eye")
        line([(40,25),(40,28)],"iris")
        dot(40,25,"flame_core"); dot(41,27,"iris_light")
    line([(42,30),(43,30)],"skin_deep")
    dot(41,29,"blush")
    poly([(29,23),(32,23),(34,25),(33,29),(30,29),(28,27)],"skin_shadow","hair_ink")
    line([(30,25),(32,25),(31,27)],"skin")
    poly([(22,17),(26,12),(32,9),(36,11),(34,16),(32,20),(29,23),(28,28),
          (25,32),(22,31),(24,27),(20,28),(21,23),(18,24)],"hair_mid","hair_ink")
    poly([(25,15),(31,11),(34,11),(32,16),(29,21),(25,24)],"hair_light")
    line([(25,20),(23,24),(24,28)],"hair")
    line([(29,14),(28,18),(26,21)],"hair_glint")
    poly([(36,11),(40,13),(43,17),(41,21),(39,24),(38,27),(36,26),(37,21),(35,19)],"hair","hair_ink")
    line([(38,15),(40,17),(39,20)],"hair_light")
    line([(22,28),(23,31),(26,30)],"hair_deep")


def cloak_front(c, back, flutter):
    f=flutter
    if back:
        c.poly([(22,35),(40,35),(45,42),(47+f,57),(36,65),(31,66),(19-f,60),(17,45)],"cape_deep","ink")
        c.poly([(23,36),(38,36),(43,44),(44+f,56),(32,63),(20-f,58),(20,45)],"cape")
        c.poly([(22,39),(30,42),(34,43),(31,61),(23,57),(21,46)],"cape_light")
        c.poly([(35,42),(42,43),(43+f,55),(34,60)],"cape_shadow")
        c.line([(21,43),(31,47),(41,43)],"cape_deep")
        c.line([(22,44),(31,48),(39,45)],"cape_glint")
        c.line([(21-f,59),(31,64),(44+f,57)],"brass")
        c.line([(25,48),(23,55),(28,59)],"cape")
        c.line([(36,48),(36,56),(34,61)],"cape_deep")
    else:
        c.poly([(22,35),(17,39),(14,48),(12-f,59),(18,62),(25,52),(26,40)],"cape_deep","ink")
        c.poly([(22,38),(18,42),(16,51),(15-f,58),(18,59),(22,50)],"cape")
        c.line([(17-f,57),(19,53),(20,48)],"cape_light")
        c.line([(15-f,59),(18,60),(20,57)],"brass")
        c.poly([(39,36),(46,41),(47,48),(43,49),(39,42)],"cape_shadow","ink")
    # Hood rests behind the neck, drawn as folds instead of a second head.
    c.poly([(24,33),(31,35),(39,33),(42,37),(41,40),(36,42),(31,43),(24,41),(20,38)],"cape_shadow","ink")
    c.poly([(24,34),(31,37),(38,34),(40,37),(35,39),(29,39),(23,37)],"cape")
    c.line([(25,35),(31,38),(37,35)],"cape_light")
    if not back:
        c.poly([(23,37),(29,40),(31,39),(30,43),(23,44),(18,43),(17,41)],"cape","cape_deep")
        c.poly([(35,39),(39,36),(46,41),(47,44),(41,44),(35,42)],"cape_shadow","cape_deep")
        c.line([(19,42),(25,43),(29,41)],"brass")
        c.line([(36,41),(42,43),(45,42)],"brass_deep")
        c.rect(31,38,4,3,"brass_deep");c.rect(32,38,2,2,"brass_light")
        c.dot(32,38,"brass_glint")


def torso(c, side=False, east=True):
    if side:
        tr=lambda pts: pts if east else [(64-x,y) for x,y in pts]
        c.poly(tr([(28,35),(38,36),(42,43),(40,59),(28,62),(25,55),(25,43)]),"shirt_shadow","ink")
        c.poly(tr([(30,37),(36,37),(39,43),(37,57),(29,58),(28,48)]),"shirt")
        c.line(tr([(34,42),(35,50),(33,56)]),"shirt_light",2)
        c.line(tr([(28,46),(30,50),(28,54)]),"shirt_deep")
        c.poly(tr([(27,57),(39,56),(40,60),(28,62)]),"leather_deep","ink")
        c.line(tr([(28,58),(38,57)]),"leather_light")
        x=38 if east else 28
        c.rect(x,57,3,4,"brass");c.dot(x,57,"brass_glint")
        c.line(tr([(29,39),(32,46),(32,54)]),"leather_shadow",2)
    else:
        c.poly([(24,35),(39,35),(43,41),(42,57),(39,62),(25,62),(21,56),(21,42)],"shirt_shadow","ink")
        c.poly([(26,37),(37,37),(40,42),(39,56),(34,60),(26,59),(24,53),(24,42)],"shirt")
        c.poly([(29,38),(36,39),(37,52),(35,57),(29,57),(28,47)],"shirt_light")
        c.line([(32,41),(32,53),(31,57)],"shirt_shadow")
        c.line([(26,44),(25,49),(27,52)],"shirt_deep")
        c.line([(38,46),(37,51),(39,54)],"shirt_shadow")
        c.dot(33,45,"brass_deep");c.dot(33,50,"shirt_deep")
        c.poly([(23,57),(40,57),(42,60),(40,62),(24,62),(22,60)],"leather_deep","ink")
        c.line([(24,58),(39,58)],"leather_light")
        c.rect(30,57,5,5,"brass");c.rect(31,58,3,3,"leather_deep")
        c.line([(31,57),(34,57),(34,59)],"brass_glint")
        c.line([(25,40),(23,49),(23,55)],"leather_shadow",2)
        c.dot(24,45,"leather_light")


def pose_parameters(action, i):
    bob=0; stride=0; flutter=0; lift=0; lean=0
    if action=="idle": bob=[0,0,-1,0][i]; flutter=[0,0,1,0][i]
    if action=="walk":
        stride=[-3,-1,2,3,1,-2][i]; bob=[0,-1,0,0,-1,0][i]; flutter=[-1,0,2,1,0,-2][i]
    if action=="attack":
        stride=[0,-2,-4,4,2,0][i]; lean=[0,-1,-2,2,1,0][i]; flutter=[0,1,2,-2,-1,0][i]
    if action=="dash": stride=[4,5,4,1][i];bob=2;flutter=[2,3,2,0][i];lean=2
    if action=="pulse": lift=[0,5,11,12,7,2][i];flutter=[0,0,2,2,1,0][i]
    if action=="interact": lift=[0,4,7,0][i]
    if action=="hit": bob=[2,1,0][i];lean=[-2,1,0][i];flutter=[-2,1,0][i]
    if action=="death":bob=[0,3,7,11,12,12][i];lean=[0,-1,-3,-4,-4,-4][i]
    return bob,stride,flutter,lift,lean


def front_body(c, direction, action, i, stride, flutter, lift):
    back=direction=="north"
    # Feet occupy the same anchor, lifted boots expose different stride shapes.
    feet=[(25-stride,87-max(0,stride)),(38+stride,87-max(0,-stride))]
    if action=="attack": feet=[(24-stride,87),(39+stride,87)]
    for j,(x,y) in enumerate(feet):
        leg(c,(26+j*10,60),(x,72),(x,y),direction,j==0)
    lampx=12 if back else 51
    bagx=43 if back else 11
    # Anatomical right hand strikes; the left hand keeps the copper lantern.
    rhx=47 if back else 17
    rhy=54
    if action=="attack":
        rhx=([47,49,51,47,44,47] if back else [17,12,7,13,20,17])[i]
        rhy=([54,43,36,45,52,54] if back else [54,44,46,54,54,54])[i]
    elif action=="walk": rhy+=stride//2
    lh=(lampx,52-lift-stride//2)
    arm(c,(43 if back else 21,43),(46 if back else 18,49),(rhx,rhy),not back)
    arm(c,(21 if back else 43,43),(17 if back else 47,48-lift//2),lh,True)
    if back:
        torso(c)
        satchel(c,bagx,54,True)
        cloak_front(c,True,flutter)
    else:
        torso(c)
        cloak_front(c,False,flutter)
        satchel(c,bagx,53+stride//2)
    lantern(c,lh[0],lh[1]+2,i if action=="pulse" else 0)
    # One compact neck rather than a thick scarf/collar block.
    c.poly([(29,31),(36,31),(36,36),(33,38),(29,36)],"skin_shadow","ink")
    c.rect(31,33,3,3,"skin_light")
    front_head(c,back,action=="idle" and i==3,action=="attack")
    if action=="attack" and i in (1,2,3,4):
        # The strike arm passes in front of the hip bag; keep it clear of face.
        shoulder=(42 if back else 22,42)
        elbow=((rhx+shoulder[0])//2,46 if i<3 else 50)
        arm(c,shoulder,elbow,(rhx,rhy),not back)
        blade(c,(rhx,rhy),direction,i)


def side_body(c,direction,action,i,stride,flutter,lift):
    east=direction=="east"; s=1 if east else -1
    tr=lambda pts: pts if east else [(64-x,y) for x,y in pts]
    # Different near/far equipment is authored separately for each view.
    lampx=46 if east else 17
    bagx=17 if east else 37
    farfoot=(35+s*stride,87-max(0,-stride)); nearfoot=(29-s*stride,87-max(0,stride))
    leg(c,(35,60),(farfoot[0],72),farfoot,direction,False)
    if not east: lantern(c,lampx,54-lift,i if action=="pulse" else 0)
    c.poly(tr([(26,34),(35,36),(31,46),(20-flutter,60),(12-flutter,57),(17,44),(20,38)]),"cape_deep","ink")
    c.poly(tr([(25,36),(30,37),(27,46),(19-flutter,57),(14-flutter,55),(20,43)]),"cape")
    c.line(tr([(23,42),(21,49),(17-flutter,55)]),"cape_light")
    c.line(tr([(14-flutter,57),(19-flutter,59),(23,55)]),"brass")
    # West shows the near right hip; east shows the bag peeking at the rear.
    if east: satchel(c,bagx,54+stride//2)
    leg(c,(29,60),(nearfoot[0],72),nearfoot,direction,True)
    torso(c,True,east)
    c.poly(tr([(26,33),(36,33),(40,36),(38,41),(31,43),(22,40),(20,37)]),"cape_shadow","ink")
    c.poly(tr([(26,34),(34,35),(37,37),(34,39),(28,39),(23,37)]),"cape")
    c.line(tr([(24,36),(30,38),(35,37)]),"cape_light")
    c.line(tr([(26,41),(33,42),(38,39)]),"brass_deep")
    hand=(43 if east else 22,54-lift)
    if action=="attack" and not east:
        hand=([22,18,12,17,24,22][i],[54,44,39,45,51,54][i])
    elif action=="walk":hand=(hand[0]+stride//2,hand[1]-stride//2)
    arm(c,(35 if east else 28,43),(39 if east else 25,49-lift//2),hand,east)
    if not east: satchel(c,bagx,54-stride//2)
    if east:lantern(c,hand[0]+2,hand[1]+2,i if action=="pulse" else 0)
    if action=="attack" and east:
        rh=([28,33,45,49,37,28][i],[53,42,37,46,51,53][i])
        arm(c,(29,42),(32,47),rh,False)
        if i in (1,2,3,4):blade(c,rh,direction,i)
    elif action=="attack" and i in (1,2,3,4):blade(c,hand,direction,i)
    c.poly([(32,31),(38,31),(38,35),(35,38),(32,36)],"skin_shadow","ink")
    c.rect(34,33,3,3,"skin")
    side_head(c,east,action=="idle" and i==3)


def blade(c,hand,direction,i):
    hx,hy=hand
    angles={"south":[-1.8,-1.9,0.2,1.0,1.4,1.0],
            "north":[-0.4,-1.0,-0.8,-1.4,-2.1,-1.0],
            "east":[-1.5,-1.2,-0.8,0.2,0.5,0.0],
            "west":[-1.7,-2.0,-2.4,2.8,2.3,3.1]}
    angle=angles[direction][i]
    ex=round(hx+math.cos(angle)*14);ey=round(hy+math.sin(angle)*14)
    c.line([(hx,hy),(ex,ey)],"brass",3)
    c.line([(hx,hy),(ex,ey)],"flame_core",2)
    c.dot(ex,ey-1,"flame")
    if i in (2,3):
        points=[]
        for n in range(8):
            a=angle-.8+n*.14
            points.append((hx+math.cos(a)*17,hy+math.sin(a)*17))
        c.line(points,"amber",2)
        c.line([(x,y-1) for x,y in points[2:7]],"flame_core")


def fallen(c,direction,i):
    # A separately drawn collapsing pose, not a rotation of a static PNG.
    y=80
    c.poly([(16,y-12),(25,y-14),(35,y-10),(40,y-5),(37,y+3),(25,y+5),(18,y+2)],"cape_shadow","ink")
    c.poly([(18,y-10),(26,y-11),(35,y-6),(33,y+1),(24,y+2)],"cape")
    c.line([(19,y-9),(25,y-7),(30,y-3)],"cape_light")
    c.line([(25,y+3),(32,y+2),(36,y-1)],"brass")
    leg(c,(37,76),(43,79),(48,86),"east",False)
    leg(c,(35,77),(39,80),(43,87),"east",True)
    c.poly([(15,70),(11,72),(9,77),(10,82),(16,86),(23,83),(25,79),(23,73)],"hair_mid","hair_ink")
    c.poly([(12,72),(17,71),(21,73),(19,78),(12,80)],"hair_light")
    c.poly([(18,78),(23,78),(24,81),(20,84),(16,83)],"skin","hair_ink")
    c.line([(19,80),(21,81)],"eye")
    c.line([(11,77),(13,81)],"hair_shadow")
    c.line([(17,73),(16,77)],"hair_glint")
    arm(c,(25,76),(27,81),(29,84),False)
    lantern(c,7,62)
    if i==4:c.dot(24,83,"skin_light")


def draw_frame(direction, action, i):
    bob,stride,flutter,lift,lean=pose_parameters(action,i)
    c=Pixels(lean,bob)
    if action=="death" and i>=3:
        c=Pixels()
        fallen(c,direction,i)
    elif direction in ("north","south"):
        front_body(c,direction,action,i,stride,flutter,lift)
    else:
        side_body(c,direction,action,i,stride,flutter,lift)
    # Declared grounded edge never contains glow, effects or shadow pixels.
    c.d.rectangle((0,88,63,95),fill=(0,0,0,0))
    return c.im


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    entries=[];samples={}; checks=[]
    for direction in DIRECTIONS:
        for action,count in COUNTS.items():
            sheet=Image.new("RGBA",(SIZE[0]*count,SIZE[1]))
            frames=[]
            for i in range(count):
                im=draw_frame(direction,action,i);frames.append(im)
                sheet.paste(im,(i*SIZE[0],0))
                assert im.getchannel("A").crop((0,88,64,96)).getbbox() is None
                assert im.getchannel("A").getbbox() is not None
            file=f"lynn_{action}_{direction}_sheet.png"
            sheet.save(OUT/file)
            unique=len({hashlib.sha256(im.tobytes()).hexdigest() for im in frames})
            assert unique>1,(direction,action,"no actual animation")
            entries.append({"path":file,"direction":direction,"action":action,
                            "frames":count,"fps":FPS[action],"cell":[64,96],
                            "anchor":list(FOOT),"loop":action in ("idle","walk"),
                            "unique_frames":unique,"sha256":hashlib.sha256((OUT/file).read_bytes()).hexdigest()})
            samples[(direction,action)]=frames
    east=samples[("east","idle")][0].transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    assert east.tobytes()!=samples[("west","idle")][0].tobytes()
    # The review artwork is composed only from the generated source-grid frames.
    preview=Image.new("RGBA",(64*6,96*12),(27,42,48,255))
    pd=ImageDraw.Draw(preview)
    for row,(direction,action) in enumerate((d,a) for d in DIRECTIONS for a in ("idle","walk","attack")):
        for col,im in enumerate(samples[(direction,action)]):
            preview.alpha_composite(im,(col*64,row*96))
        pd.text((2,row*96+89),f"{direction} {action}",fill=(191,211,207,255))
    preview.resize((768,2304),Image.Resampling.NEAREST).save(OUT/"lynn_pose_contact.png")
    turn=Image.new("RGBA",(256,96),(27,42,48,255))
    for i,d in enumerate(DIRECTIONS):turn.alpha_composite(samples[(d,"idle")][0],(i*64,0))
    turn.resize((1024,384),Image.Resampling.NEAREST).save(OUT/"lynn_turnaround.png")
    pulse=Image.new("RGBA",(384,384),(27,42,48,255))
    for row,d in enumerate(DIRECTIONS):
        for col,im in enumerate(samples[(d,"pulse")]):pulse.alpha_composite(im,(col*64,row*96))
    pulse.resize((768,768),Image.Resampling.NEAREST).save(OUT/"lynn_pulse_contact.png")
    # GIF is a review artifact: six true pixel poses, original sheets power game.
    walk=[]
    for i in range(6):
        board=Image.new("RGBA",(256,96),(27,42,48,255))
        for j,d in enumerate(DIRECTIONS):board.alpha_composite(samples[(d,"walk")][i],(j*64,0))
        walk.append(board.resize((768,288),Image.Resampling.NEAREST).convert("RGB"))
    walk[0].save(OUT/"lynn_walk_review.gif",save_all=True,append_images=walk[1:],duration=100,loop=0)
    metadata={"schema":1,"character":"Lynn","revision":"0.3.1-dev",
              "authoring":"original coordinate-authored native pixel art; no old image input or image-generation input",
              "source":"tools/generate_hero_visual.py","canvas":[64,96],"foot_anchor":list(FOOT),
              "pixel_size_world":0.017,"palette":P,"directions":list(DIRECTIONS),"assets":entries,
              "validation":{"rgba":True,"transparent_below_anchor":True,"all_actions_have_distinct_frames":True,"east_west_not_finished_image_mirror":True}}
    (OUT/"metadata.json").write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+"\n")
    print(f"HeroVisual: {len(entries)} sheets / {sum(COUNTS.values())*4} native 64x96 poses; alpha, motion and equipment checks PASS")


if __name__=="__main__":main()
