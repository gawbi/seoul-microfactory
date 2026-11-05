"""필름 리포트의 실제 측정값으로 장면별 오버레이 문구를 만든다."""
import json
import sys

rep = json.load(open(sys.argv[1]))["report"]
import os
_info = os.path.join(os.path.dirname(sys.argv[1]), "s3new", "info.json")
pts = json.load(open(_info))["cloud_points_total"] if os.path.exists(_info) else rep["cloud_points_5cm"]
err_mm = rep["place_xy_error_m"] * 1000
lift_cm = rep["lift_max_m"] * 100
S = [
    dict(key="S1", no="1/6", sn="매장 전경", t="영업이 끝난 매장", c="8 × 6 m 가상 매장입니다. Go2가 입구로 들어옵니다.", facts="실측이 아닌 가정 배치|!짐벌은 단순화한 모델"),
    dict(key="S2", no="2/6", sn="스캔", t="걸으면서 공간을 기록합니다", c="짐벌 카메라로 주변을 훑으며 통로를 따라 걷습니다. 지나간 자리부터 점이 쌓입니다.", facts="3배속|보행: Isaac Lab에서 학습한 정책, 물리 기반|!LiDAR: 범용 시뮬레이션 모델"),
    dict(key="S3", no="3/6", sn="복원", t="점으로 드러나는 매장 구조", c=f"시뮬레이션 LiDAR가 모은 점 {pts / 10000:.0f}만 개(5 cm 간격)로 선반과 통로가 보입니다.", facts="시뮬레이션 센서 데이터|!실제 매장 스캔 아님"),
    dict(key="S4", no="4/6", sn="디지털 트윈", t="로봇이 다닐 길과 일할 자리", c="주행 궤적, 집기 주변 여유 공간, 자동화 후보 작업 영역을 겹쳐 봅니다.", facts="하늘색: 주행 궤적, 작업 영역|주황색: 집기 주변 여유 0.22 m"),
    dict(key="S5", no="5/6", sn="배치", t="작업대에 팔을 놓아 봅니다", c="SO-101을 작업 테이블에 두고 팔이 닿는 범위를 확인합니다.", facts="SO-101: Isaac Sim 공식 에셋|팔 닿는 범위 약 0.34 m (표시용)"),
    dict(key="S6", no="6/6", sn="시험", t="실제 로봇 전에, 가상으로 먼저", c=f"IK로 자세를 풀고 집게 접촉만으로 상자를 옮깁니다. 들어 올림 {lift_cm:.1f} cm, 놓기 오차 {err_mm:.1f} mm.", facts="실제 속도|집게 접촉과 마찰만으로 잡음|!실제 로봇 실험 아님"),
]
json.dump(S, open(sys.argv[2], "w"), ensure_ascii=False, indent=1)
print("spec ok", pts, round(err_mm, 2), round(lift_cm, 2))
