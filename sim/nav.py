"""Go2 경로 추종 (pure pursuit).

번들 보행 정책은 급회전 명령(약 1 rad/s) 직후 물리 상태가 멈추는 현상이 관찰되어,
경로 모서리를 둥글게 만들고 회전 속도를 제한한다. (sim/diag_freeze.py 참고)
"""
from __future__ import annotations

import math


def wrap(a):
    return (a + math.pi) % (2 * math.pi) - math.pi


def smooth_path(points, iterations=3, step=0.05):
    """Chaikin 알고리즘으로 모서리를 둥글게 하고 일정 간격으로 다시 샘플링."""
    pts = [tuple(p) for p in points]
    for _ in range(iterations):
        out = [pts[0]]
        for a, b in zip(pts[:-1], pts[1:]):
            out.append((0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]))
            out.append((0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]))
        out.append(pts[-1])
        pts = out
    dense = [pts[0]]
    for a, b in zip(pts[:-1], pts[1:]):
        n = max(1, int(math.hypot(b[0] - a[0], b[1] - a[1]) / step))
        for k in range(1, n + 1):
            dense.append((a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n))
    return dense


class PathFollower:
    def __init__(self, path, speed=0.4, lookahead=0.55, max_yaw=0.55, goal_tol=0.1):
        self.path = smooth_path(path)
        self.speed = speed
        self.lookahead = lookahead
        self.max_yaw = max_yaw
        self.goal_tol = goal_tol
        self.idx = 0
        self.done = False

    @property
    def progress(self):
        return self.idx / (len(self.path) - 1)

    def command(self, x, y, yaw):
        if self.done:
            return [0.0, 0.0, 0.0]
        # 가장 가까운 점 (앞쪽으로만 진행)
        best, bi = 1e9, self.idx
        for i in range(self.idx, min(len(self.path), self.idx + 60)):
            d = (self.path[i][0] - x) ** 2 + (self.path[i][1] - y) ** 2
            if d < best:
                best, bi = d, i
        self.idx = bi
        gx, gy = self.path[-1]
        dist_goal = math.hypot(gx - x, gy - y)
        if dist_goal < self.goal_tol and self.idx > len(self.path) - 15:
            self.done = True
            return [0.0, 0.0, 0.0]
        # lookahead 점
        j = self.idx
        while j < len(self.path) - 1 and math.hypot(self.path[j][0] - x, self.path[j][1] - y) < self.lookahead:
            j += 1
        tx, ty = self.path[j]
        alpha = wrap(math.atan2(ty - y, tx - x) - yaw)
        vx = self.speed * max(0.3, math.cos(alpha))
        vx = min(vx, max(0.12, dist_goal * 0.8))
        yaw_rate = 2.0 * vx * math.sin(alpha) / max(self.lookahead, 0.2)
        yaw_rate = max(-self.max_yaw, min(self.max_yaw, yaw_rate))
        return [vx, 0.0, yaw_rate]
