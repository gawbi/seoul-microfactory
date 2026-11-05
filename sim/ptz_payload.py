"""Go2 등 위에 얹는 3축 짐벌 PTZ 카메라 페이로드 (단순화한 시각 모델).

실제 Go2 Ent-MTPTZ 짐벌의 형상을 복제한 것이 아니라, 회전 구조(좌우 yaw, 상하 pitch)를
보여주기 위한 근사 모델이다. 회전 범위는 판매처 공개 사양(yaw ±270°, pitch -90°~+25°)으로 제한한다.
"""
from __future__ import annotations

from pxr import Gf, Sdf, UsdGeom, UsdShade

YAW_LIMIT = 270.0
PITCH_LIMIT = (-90.0, 25.0)


def _mat(stage, path, color, rough=0.4, metal=0.3, emissive=None):
    m = UsdShade.Material.Define(stage, path)
    s = UsdShade.Shader.Define(stage, path + "/S")
    s.CreateIdAttr("UsdPreviewSurface")
    s.CreateInput("diffuseColor", Sdf.ValueTypeNames.Color3f).Set(Gf.Vec3f(*color))
    s.CreateInput("roughness", Sdf.ValueTypeNames.Float).Set(rough)
    s.CreateInput("metallic", Sdf.ValueTypeNames.Float).Set(metal)
    if emissive:
        s.CreateInput("emissiveColor", Sdf.ValueTypeNames.Color3f).Set(Gf.Vec3f(*emissive))
    m.CreateSurfaceOutput().ConnectToSource(s.ConnectableAPI(), "surface")
    return m


def _geom(stage, path, kind, mat, translate=(0, 0, 0), scale=(1, 1, 1), rotate=(0, 0, 0)):
    g = (UsdGeom.Cube if kind == "cube" else UsdGeom.Cylinder).Define(stage, path)
    if kind == "cube":
        g.CreateSizeAttr(1.0)
    else:
        g.CreateRadiusAttr(0.5)
        g.CreateHeightAttr(1.0)
        g.CreateAxisAttr("X")
    xf = UsdGeom.XformCommonAPI(g)
    xf.SetTranslate(Gf.Vec3d(*translate))
    xf.SetRotate(Gf.Vec3f(*rotate))
    xf.SetScale(Gf.Vec3f(*scale))
    UsdShade.MaterialBindingAPI.Apply(g.GetPrim()).Bind(mat)
    return g


class PTZPayload:
    """parent_path(로봇 몸통 링크) 아래에 짐벌을 만든다. set(yaw, pitch)로 각도를 바꾼다."""

    def __init__(self, stage, parent_path: str, mount_offset=(0.02, 0.0, 0.075)):
        self.stage = stage
        root = f"{parent_path}/PTZPayload"
        dark = _mat(stage, root + "/Looks/Dark", (0.06, 0.065, 0.07), 0.45, 0.2)
        grey = _mat(stage, root + "/Looks/Grey", (0.55, 0.57, 0.6), 0.35, 0.6)
        glass = _mat(stage, root + "/Looks/Lens", (0.02, 0.03, 0.05), 0.05, 0.0)
        led = _mat(stage, root + "/Looks/Led", (0.1, 0.6, 0.8), 0.3, 0.0, emissive=(0.2, 1.4, 1.8))

        base = UsdGeom.Xform.Define(stage, root)
        UsdGeom.XformCommonAPI(base).SetTranslate(Gf.Vec3d(*mount_offset))
        _geom(stage, root + "/MountPlate", "cube", dark, (0, 0, 0.008), (0.16, 0.11, 0.016))
        _geom(stage, root + "/Column", "cylinder", grey, (0, 0, 0.045), (0.06, 0.05, 0.05), rotate=(0, 90, 0))

        self.yaw = UsdGeom.Xform.Define(stage, root + "/Yaw")
        UsdGeom.XformCommonAPI(self.yaw).SetTranslate(Gf.Vec3d(0, 0, 0.075))
        self._yaw_op = self.yaw.AddRotateZOp()
        _geom(stage, root + "/Yaw/Fork", "cube", grey, (0, 0, 0.03), (0.04, 0.13, 0.012))
        _geom(stage, root + "/Yaw/ArmL", "cube", grey, (0, 0.06, 0.06), (0.03, 0.012, 0.07))
        _geom(stage, root + "/Yaw/ArmR", "cube", grey, (0, -0.06, 0.06), (0.03, 0.012, 0.07))

        self.pitch = UsdGeom.Xform.Define(stage, root + "/Yaw/Pitch")
        UsdGeom.XformCommonAPI(self.pitch).SetTranslate(Gf.Vec3d(0, 0, 0.075))
        self._pitch_op = self.pitch.AddRotateYOp()
        _geom(stage, root + "/Yaw/Pitch/Housing", "cube", dark, (0.01, 0, 0), (0.11, 0.1, 0.075))
        _geom(stage, root + "/Yaw/Pitch/LensVisible", "cylinder", glass, (0.068, 0.022, 0.0), (0.012, 0.042, 0.042))
        _geom(stage, root + "/Yaw/Pitch/LensThermal", "cylinder", glass, (0.068, -0.024, 0.0), (0.012, 0.032, 0.032))
        _geom(stage, root + "/Yaw/Pitch/Led", "cube", led, (0.066, 0.0, 0.03), (0.006, 0.05, 0.006))

        # 짐벌 카메라 (렌즈 방향 = +X). USD 카메라는 -Z를 보므로 회전으로 맞춘다.
        self.camera_path = root + "/Yaw/Pitch/Camera"
        cam = UsdGeom.Camera.Define(stage, self.camera_path)
        cam.CreateFocalLengthAttr(14.0)
        cam.CreateHorizontalApertureAttr(20.955)
        cam.CreateClippingRangeAttr(Gf.Vec2f(0.03, 200.0))
        xf = UsdGeom.XformCommonAPI(cam)
        xf.SetTranslate(Gf.Vec3d(0.08, 0.022, 0.0))
        xf.SetRotate(Gf.Vec3f(90.0, 0.0, -90.0), UsdGeom.XformCommonAPI.RotationOrderXYZ)
        self.set(0.0, 0.0)

    def set(self, yaw_deg: float, pitch_deg: float):
        y = max(-YAW_LIMIT, min(YAW_LIMIT, yaw_deg))
        p = max(PITCH_LIMIT[0], min(PITCH_LIMIT[1], pitch_deg))
        self._yaw_op.Set(float(y))
        # USD RotateY 양수 = 렌즈가 아래로. 사양의 pitch(+ = 위)와 부호를 맞춘다.
        self._pitch_op.Set(float(-p))
        return y, p
