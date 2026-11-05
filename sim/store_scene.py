"""SEOUL MICROFACTORY 가상 매장 (Isaac Sim USD 씬).

웹사이트 컨셉 시각화(src/visuals/storeModel.ts)와 같은 8 m x 6 m 배치를 쓴다.
좌표: x = 매장 가로, y = 매장 세로(입구가 y = 6 쪽), z = 위. 단위 m.

- 집기(선반, 곤돌라, 냉장 쇼케이스, 계산대, 작업 테이블)는 단순 형상 + PBR 재질로 직접 만든다.
- 상품은 NVIDIA Isaac 에셋의 YCB 스캔 모델을 쓴다.
- 모든 집기에 충돌을 넣어 Go2가 통과하지 못하게 한다.
"""
from __future__ import annotations

import random

from pxr import Gf, Sdf, UsdGeom, UsdLux, UsdPhysics, UsdShade

W, D, H = 8.0, 6.0, 2.7
DOOR = (2.9, 4.7)

# 웹 모델과 같은 집기 배치 (x0, y0, x1, y1, height)
FIXTURES = {
    "ShelfA": (0.3, 0.08, 3.3, 0.5, 1.9),
    "ShelfB": (3.7, 0.08, 5.9, 0.5, 1.9),
    "Cooler": (0.08, 2.9, 0.62, 5.0, 2.0),
    "Gondola": (1.5, 2.1, 3.7, 2.75, 1.35),
    "Counter": (5.3, 3.9, 7.5, 4.55, 1.0),
}
TABLE = (6.5, 1.0, 7.75, 2.5, 0.85)  # 작업 테이블 (상판 높이 0.85)
WORK_ZONE = (6.3, 0.85, 7.9, 2.65)
ARM_BASE = (7.15, 2.2)  # SO-101 설치 위치 (테이블 위)

# Go2 스캔 경로 (웹 모델과 동일)
PATH = [(3.8, 7.3), (3.8, 5.3), (4.35, 3.3), (4.6, 1.35), (1.1, 1.35), (1.05, 3.4), (4.8, 3.35), (5.85, 2.75), (6.05, 1.75)]
# 시뮬레이션용 경로: 급회전을 피하려고 끝부분을 작업 테이블 정면(+x)으로 진입하게 조정
SIM_PATH = [(3.8, 7.3), (3.8, 5.3), (4.3, 3.3), (4.55, 1.6), (4.2, 1.35), (1.5, 1.35), (1.05, 1.8), (1.05, 3.0), (1.5, 3.45), (4.4, 3.45), (5.0, 2.6), (5.25, 1.75), (6.0, 1.75)]

# YCB Axis_Aligned 모델은 긴 축이 +Y로 누워 있고 원점이 중심이다. X축 90도로 세운다.
# (반높이, 폭) 단위 m
YCB_DIM = {
    "003_cracker_box": (0.107, 0.164),
    "004_sugar_box": (0.088, 0.09),
    "005_tomato_soup_can": (0.051, 0.068),
    "006_mustard_bottle": (0.096, 0.096),
    "010_potted_meat_can": (0.042, 0.10),
}


def place_ycb(stage, root, path, item, x, y, z_base, yaw_deg):
    prim = stage.DefinePrim(path, "Xform")
    prim.GetReferences().AddReference(f"{root}/Isaac/Props/YCB/Axis_Aligned/{item}.usd")
    xf = UsdGeom.XformCommonAPI(prim)
    xf.SetTranslate(Gf.Vec3d(x, y, z_base + YCB_DIM[item][0] + 0.002))
    xf.SetRotate(Gf.Vec3f(90.0, 0.0, yaw_deg), UsdGeom.XformCommonAPI.RotationOrderXYZ)
    return prim


YCB = [
    "003_cracker_box",
    "004_sugar_box",
    "005_tomato_soup_can",
    "006_mustard_bottle",
    "010_potted_meat_can",
]


# ---------------------------------------------------------------- materials

def _material(stage, path, color, roughness=0.6, metallic=0.0, emissive=None, opacity=1.0):
    mat = UsdShade.Material.Define(stage, path)
    sh = UsdShade.Shader.Define(stage, f"{path}/Shader")
    sh.CreateIdAttr("UsdPreviewSurface")
    sh.CreateInput("diffuseColor", Sdf.ValueTypeNames.Color3f).Set(Gf.Vec3f(*color))
    sh.CreateInput("roughness", Sdf.ValueTypeNames.Float).Set(roughness)
    sh.CreateInput("metallic", Sdf.ValueTypeNames.Float).Set(metallic)
    if emissive:
        sh.CreateInput("emissiveColor", Sdf.ValueTypeNames.Color3f).Set(Gf.Vec3f(*emissive))
    if opacity < 1.0:
        sh.CreateInput("opacity", Sdf.ValueTypeNames.Float).Set(opacity)
    mat.CreateSurfaceOutput().ConnectToSource(sh.ConnectableAPI(), "surface")
    return mat


def _bind(prim, mat):
    UsdShade.MaterialBindingAPI.Apply(prim).Bind(mat)


def _box(stage, path, x0, y0, z0, x1, y1, z1, mat, collide=True):
    cube = UsdGeom.Cube.Define(stage, path)
    cube.CreateSizeAttr(1.0)
    xf = UsdGeom.XformCommonAPI(cube)
    xf.SetTranslate(Gf.Vec3d((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2))
    xf.SetScale(Gf.Vec3f(x1 - x0, y1 - y0, z1 - z0))
    _bind(cube.GetPrim(), mat)
    if collide:
        UsdPhysics.CollisionAPI.Apply(cube.GetPrim())
    return cube


# ---------------------------------------------------------------- build

def build_store(stage, assets_root: str, products: bool = True, seed: int = 7) -> dict:
    """매장을 /World/Store 아래에 만든다. 주요 위치 정보를 돌려준다."""
    rnd = random.Random(seed)
    UsdGeom.Xform.Define(stage, "/World/Store")
    M = "/World/Store/Looks"
    mats = {
        "floor": _material(stage, f"{M}/Floor", (0.30, 0.31, 0.33), roughness=0.35),
        "wall": _material(stage, f"{M}/Wall", (0.80, 0.80, 0.78), roughness=0.9),
        "accent": _material(stage, f"{M}/Accent", (0.14, 0.17, 0.21), roughness=0.7),
        "shelf": _material(stage, f"{M}/Shelf", (0.22, 0.24, 0.27), roughness=0.5, metallic=0.4),
        "shelf_board": _material(stage, f"{M}/ShelfBoard", (0.85, 0.86, 0.88), roughness=0.4, metallic=0.2),
        "wood": _material(stage, f"{M}/Wood", (0.42, 0.29, 0.18), roughness=0.55),
        "wood_top": _material(stage, f"{M}/WoodTop", (0.62, 0.47, 0.32), roughness=0.4),
        "steel": _material(stage, f"{M}/Steel", (0.72, 0.74, 0.77), roughness=0.25, metallic=0.9),
        "glass": _material(stage, f"{M}/CoolerGlass", (0.6, 0.75, 0.8), roughness=0.02, opacity=0.18),
        "cooler_in": _material(stage, f"{M}/CoolerInside", (0.85, 0.92, 0.95), roughness=0.6, emissive=(0.12, 0.18, 0.2)),
        "sidewalk": _material(stage, f"{M}/Sidewalk", (0.42, 0.42, 0.41), roughness=0.85),
        "screen": _material(stage, f"{M}/Screen", (0.05, 0.08, 0.1), roughness=0.2, emissive=(0.15, 0.45, 0.6)),
        "mat": _material(stage, f"{M}/DoorMat", (0.08, 0.09, 0.1), roughness=1.0),
        "zone": _material(stage, f"{M}/Zone", (0.1, 0.75, 0.9), roughness=1.0, emissive=(0.05, 0.4, 0.5), opacity=0.35),
    }

    # floor + walls
    # 물리 바닥은 매장 안과 입구 앞 보도를 하나로 잇는다 (평지 보행 정책이 작은 턱에도 걸리기 때문)
    _box(stage, "/World/Store/Floor", -2.0, -0.2, -0.05, W + 2.0, D + 4.0, 0.0, mats["floor"])
    _box(stage, "/World/Store/Sidewalk", -2.0, D + 0.12, 0.0, W + 2.0, D + 4.0, 0.001, mats["sidewalk"], collide=False)
    t = 0.12
    _box(stage, "/World/Store/WallBack", -t, -t, 0, W + t, 0, H, mats["wall"])
    _box(stage, "/World/Store/WallLeft", -t, 0, 0, 0, D, H, mats["wall"])
    _box(stage, "/World/Store/WallRight", W, 0, 0, W + t, D, H, mats["wall"])
    _box(stage, "/World/Store/WallFrontL", -t, D, 0, DOOR[0], D + t, H, mats["wall"])
    _box(stage, "/World/Store/WallFrontR", DOOR[1], D, 0, W + t, D + t, H, mats["wall"])
    _box(stage, "/World/Store/DoorHeader", DOOR[0], D, 2.2, DOOR[1], D + t, H, mats["wall"])
    _box(stage, "/World/Store/Skirting", 0, 0.0, 0, W, 0.02, 0.12, mats["accent"])
    _box(stage, "/World/Store/DoorMat", DOOR[0] + 0.1, D - 0.9, 0.0, DOOR[1] - 0.1, D - 0.1, 0.008, mats["mat"], collide=False)

    # shelves (frame + boards)
    for name in ("ShelfA", "ShelfB", "Gondola"):
        x0, y0, x1, y1, h = FIXTURES[name]
        base = f"/World/Store/{name}"
        _box(stage, f"{base}/Back", x0, y0, 0, x1, y0 + 0.04 if name != "Gondola" else (y0 + y1) / 2 + 0.02, h, mats["shelf"])
        _box(stage, f"{base}/SideL", x0, y0, 0, x0 + 0.04, y1, h, mats["shelf"])
        _box(stage, f"{base}/SideR", x1 - 0.04, y0, 0, x1, y1, h, mats["shelf"])
        levels = [0.08 + i * 0.42 for i in range(int(h / 0.42) + 1) if 0.08 + i * 0.42 < h - 0.1]
        for i, z in enumerate(levels):
            _box(stage, f"{base}/Board{i}", x0, y0, z, x1, y1, z + 0.03, mats["shelf_board"])
        _box(stage, f"{base}/Top", x0, y0, h - 0.03, x1, y1, h, mats["shelf"])
        if products:
            _stock_shelf(stage, assets_root, base, x0, y0, x1, y1, levels, rnd, two_sided=(name == "Gondola"))

    # cooler (glass front faces +x)
    x0, y0, x1, y1, h = FIXTURES["Cooler"]
    _box(stage, "/World/Store/Cooler/Body", x0, y0, 0, x0 + 0.05, y1, h, mats["accent"])
    _box(stage, "/World/Store/Cooler/Top", x0, y0, h - 0.12, x1, y1, h, mats["accent"])
    _box(stage, "/World/Store/Cooler/Bottom", x0, y0, 0, x1, y1, 0.15, mats["accent"])
    _box(stage, "/World/Store/Cooler/EndA", x0, y0, 0, x1, y0 + 0.04, h, mats["accent"])
    _box(stage, "/World/Store/Cooler/EndB", x0, y1 - 0.04, 0, x1, y1, h, mats["accent"])
    _box(stage, "/World/Store/Cooler/Inside", x0 + 0.05, y0 + 0.04, 0.15, x0 + 0.07, y1 - 0.04, h - 0.12, mats["cooler_in"], collide=False)
    cooler_levels = [0.16 + i * 0.4 for i in range(4)]
    for i, z in enumerate(cooler_levels):
        _box(stage, f"/World/Store/Cooler/Rack{i}", x0 + 0.05, y0 + 0.04, z, x1 - 0.05, y1 - 0.04, z + 0.02, mats["shelf_board"], collide=False)
    if products:
        _stock_cooler(stage, assets_root, x0, y0, x1, y1, cooler_levels, rnd)
    for i in range(3):
        ya = y0 + (y1 - y0) * i / 3 + 0.03
        yb = y0 + (y1 - y0) * (i + 1) / 3 - 0.03
        _box(stage, f"/World/Store/Cooler/Glass{i}", x1 - 0.03, ya, 0.15, x1, yb, h - 0.12, mats["glass"], collide=False)

    # counter + POS
    x0, y0, x1, y1, h = FIXTURES["Counter"]
    _box(stage, "/World/Store/Counter/Body", x0, y0, 0, x1, y1, h - 0.04, mats["wood"])
    _box(stage, "/World/Store/Counter/Top", x0 - 0.03, y0 - 0.03, h - 0.04, x1 + 0.03, y1 + 0.03, h, mats["wood_top"])
    _box(stage, "/World/Store/Counter/PosBase", 5.6, 4.15, h, 5.8, 4.3, h + 0.05, mats["accent"])
    _box(stage, "/World/Store/Counter/PosScreen", 5.58, 4.2, h + 0.05, 5.82, 4.24, h + 0.25, mats["screen"])

    # work table (steel frame + wood top)
    x0, y0, x1, y1, h = TABLE
    _box(stage, "/World/Store/WorkTable/Top", x0, y0, h - 0.04, x1, y1, h, mats["wood_top"])
    for i, (lx, ly) in enumerate([(x0 + 0.04, y0 + 0.04), (x1 - 0.04, y0 + 0.04), (x0 + 0.04, y1 - 0.04), (x1 - 0.04, y1 - 0.04)]):
        _box(stage, f"/World/Store/WorkTable/Leg{i}", lx - 0.03, ly - 0.03, 0, lx + 0.03, ly + 0.03, h - 0.04, mats["steel"])
    _box(stage, "/World/Store/WorkTable/Stretcher", x0 + 0.04, y0 + 0.02, 0.15, x1 - 0.04, y0 + 0.06, 0.19, mats["steel"])

    # automation zone marker (바닥 표시, 충돌 없음, 기본은 숨김)
    zone = _box(stage, "/World/Store/TaskZone", WORK_ZONE[0], WORK_ZONE[1], 0.002, WORK_ZONE[2], WORK_ZONE[3], 0.006, mats["zone"], collide=False)
    UsdGeom.Imageable(zone).MakeInvisible()

    _lights(stage)
    return {"table_top": TABLE[4], "arm_base": ARM_BASE, "work_zone": WORK_ZONE, "path": PATH, "size": (W, D, H)}


def _stock_shelf(stage, root, base, x0, y0, x1, y1, levels, rnd, two_sided=False):
    """선반 단마다 YCB 상품을 줄지어 놓는다 (정적 장식, 물리 없음)."""
    k = 0
    faces = [(y1 - 0.12, 0.0)]
    if two_sided:
        faces.append((y0 + 0.12, 180.0))
    for fy, rot in faces:
        for z in levels:
            x = x0 + 0.08
            item = YCB[rnd.randrange(len(YCB))]
            while x < x1 - 0.12:
                if rnd.random() < 0.15:  # 빈 자리도 조금
                    x += 0.16
                    continue
                if rnd.random() < 0.25:
                    item = YCB[rnd.randrange(len(YCB))]
                w = YCB_DIM[item][1]
                if x + w / 2 > x1 - 0.06:
                    break
                place_ycb(stage, root, f"{base}/Items/I{k}", item, x + w / 2, fy, z + 0.03, rot + rnd.uniform(-5, 5))
                k += 1
                x += w + 0.015


def _stock_cooler(stage, root, x0, y0, x1, y1, levels, rnd):
    k = 0
    for z in levels:
        y = y0 + 0.12
        while y < y1 - 0.1:
            item = rnd.choice(["006_mustard_bottle", "005_tomato_soup_can", "010_potted_meat_can"])
            for dx in (0.17, 0.33):
                place_ycb(stage, root, f"/World/Store/Cooler/Items/I{k}", item, x0 + dx, y, z + 0.02, 90 + rnd.uniform(-6, 6))
                k += 1
            y += YCB_DIM[item][1] + 0.02


def _lights(stage):
    dome = UsdLux.DomeLight.Define(stage, "/World/Store/Lights/Ambient")
    dome.CreateIntensityAttr(120.0)
    dome.CreateColorAttr(Gf.Vec3f(0.85, 0.9, 1.0))
    i = 0
    for x in (1.6, 4.0, 6.4):
        for y in (1.4, 3.6):
            light = UsdLux.RectLight.Define(stage, f"/World/Store/Lights/Panel{i}")
            light.CreateWidthAttr(1.2)
            light.CreateHeightAttr(0.3)
            light.CreateIntensityAttr(9000.0)
            light.CreateColorTemperatureAttr(4300.0)
            light.CreateEnableColorTemperatureAttr(True)
            UsdGeom.XformCommonAPI(light).SetTranslate(Gf.Vec3d(x, y, H - 0.02))
            i += 1
    # 냉장 쇼케이스 내부 조명 (유리 쪽 +x를 향함)
    cl = UsdLux.RectLight.Define(stage, "/World/Store/Lights/CoolerInner")
    cl.CreateWidthAttr(1.9)
    cl.CreateHeightAttr(0.05)
    cl.CreateIntensityAttr(6000.0)
    cl.CreateColorTemperatureAttr(6500.0)
    cl.CreateEnableColorTemperatureAttr(True)
    cxf = UsdGeom.XformCommonAPI(cl)
    cxf.SetTranslate(Gf.Vec3d(0.5, 3.95, 1.82))
    cxf.SetRotate(Gf.Vec3f(0.0, -90.0, 90.0), UsdGeom.XformCommonAPI.RotationOrderXYZ)
    # 작업 테이블 위 보조 조명
    spot = UsdLux.SphereLight.Define(stage, "/World/Store/Lights/TaskLamp")
    spot.CreateRadiusAttr(0.08)
    spot.CreateIntensityAttr(25000.0)
    spot.CreateColorTemperatureAttr(5000.0)
    spot.CreateEnableColorTemperatureAttr(True)
    UsdGeom.XformCommonAPI(spot).SetTranslate(Gf.Vec3d(7.1, 1.75, 2.2))
