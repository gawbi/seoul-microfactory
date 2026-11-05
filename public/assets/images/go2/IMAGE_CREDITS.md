# Unitree Go2 사진 출처

이 폴더의 사진은 모두 Wikimedia Commons에 공개 라이선스로 올라온 실제 Unitree Go2 사진입니다.
Unitree 공식 사이트의 제품 이미지는 "All Rights Reserved"로 표시되어 있고 별도 미디어 키트가 없어서 쓰지 않았습니다.

- 다운로드 일자: 2026-11-05
- 공통 수정 사항: 크롭, 크기 조정(두 가지 너비), WebP 변환(품질 80), EXIF 메타데이터 제거
- 원본 비율은 유지했고, 워터마크 제거나 제품 외형 수정은 하지 않았습니다.
- 사람 얼굴이 보이는 부분은 크롭으로 제외했습니다.
- 원본 고해상도 파일은 `media-src/go2/originals/`에 보관합니다(용량 때문에 git에는 올리지 않음). 아래 원본 이미지 URL에서 다시 받을 수 있습니다.

| 사용 파일 | 원본 페이지 | 원본 이미지 | 저작자 | 라이선스 | 수정 | 사이트 내 사용 위치 |
|---|---|---|---|---|---|---|
| `go2-hero.webp`, `go2-hero-900.webp` | [Robotic dog stands on a red carpet](https://commons.wikimedia.org/wiki/File:Robotic_dog_stands_on_a_red_carpet.jpg) | [jpg](https://upload.wikimedia.org/wikipedia/commons/4/40/Robotic_dog_stands_on_a_red_carpet.jpg) | Nenad Stojković (Commons 업로더: Shixart1985) | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | 크롭(가로 15–85%, 세로 6–100%), 크기 조정, WebP. 사이트에서는 CSS 흑백 필터로 표시 | HERO |
| `go2-sensor.webp`, `go2-sensor-700.webp` | 위와 같음 | 위와 같음 | 위와 같음 | CC BY 2.0 | 머리 부분 크롭(가로 38–70%, 세로 28–70%), 크기 조정, WebP | SOLUTION · Go2 Store Scanner |
| `go2-front.webp`, `go2-front-700.webp` | [Vancouver Auto Show 2025 - 54403754651](https://commons.wikimedia.org/wiki/File:Vancouver_Auto_Show_2025_-_54403754651.jpg) (Flickr 원본: [GoToVan](https://www.flickr.com/photos/47022937@N03/54403754651/)) | [jpg](https://upload.wikimedia.org/wikipedia/commons/4/44/Vancouver_Auto_Show_2025_-_54403754651.jpg) | GoToVan | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | 크롭(관람객 얼굴 제외), 크기 조정, WebP | WORKFLOW · Unitree Go2 EDU 단계 |
| `go2-side.webp`, `go2-side-700.webp` | [Vancouver Auto Show 2025 - 54403927214](https://commons.wikimedia.org/wiki/File:Vancouver_Auto_Show_2025_-_54403927214.jpg) (Flickr 원본: [GoToVan](https://www.flickr.com/photos/47022937@N03/54403927214/)) | [jpg](https://upload.wikimedia.org/wikipedia/commons/8/89/Vancouver_Auto_Show_2025_-_54403927214.jpg) | GoToVan | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | 크롭(배경 인물 얼굴 제외), 크기 조정, WebP | SOLUTION · Go2 Store Scanner, DIGITAL TWIN · Real robot |
| `go2-operation.webp`, `go2-operation-700.webp` | [World Dog Surfing Championship 2026 01](https://commons.wikimedia.org/wiki/File:World_Dog_Surfing_Championship_2026_01.jpg) | [jpg](https://upload.wikimedia.org/wikipedia/commons/e/e4/World_Dog_Surfing_Championship_2026_01.jpg) | Jesse Kornblum | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | 크롭, 크기 조정, WebP. **수정본도 CC BY-SA 4.0으로 배포합니다.** | WORKFLOW · Spatial Data Acquisition 단계 |

## 검토했지만 쓰지 않은 사진

| 사진 | 이유 |
|---|---|
| [Unitree Go2 of Salvamont (front/side/close up)](https://commons.wikimedia.org/wiki/File:Unitree_Go2_of_Salvamont_front_view.jpg) | 근접 사진으로는 가장 좋지만 Commons에서 "License review needed" 상태. YouTube 원본의 CC 표시를 확인하지 못함. 라이선스가 확인되면 사용 가능 (HotNews Romania, CC BY 3.0 주장) |
| [Zilele Clujului 2025 - parade (54557876074)](https://commons.wikimedia.org/wiki/File:Zilele_Clujului_2025_-_parade_(54557876074).jpg) | CC BY-SA 2.0으로 사용은 가능하나 모서리에 워터마크가 있음. 워터마크 제거를 하지 않는 원칙에 따라 제외 |
| [Japan-Mobility-Show-2025-RuinDig 0538](https://commons.wikimedia.org/wiki/File:Japan-Mobility-Show-2025-RuinDig_0538.jpg) | CC BY 4.0. Go2가 화면 구석에 작게 나오고 다른 로봇과 섞여 있어 제외 |
| Unitree 공식 사이트 이미지 | All Rights Reserved. 사용하려면 Unitree의 서면 허가 필요 |
| Commons의 "Unitree robot dog" 사진 다수 | Go1 또는 다른 제조사 로봇으로 확인되어 제외 |

## 사이트 표기

각 사진 아래 캡션과 페이지 하단 "Image credits"에 저작자, 라이선스, 원본 링크를 표시합니다.
사진 목록은 `src/data/media.ts`의 `CREDITS`와 같아야 합니다.
