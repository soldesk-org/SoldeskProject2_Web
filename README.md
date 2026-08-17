# Soldesk Project2 Docker Compose 실행 가이드

이 문서는 Spring Boot Web, 영수증 OCR, AI 추천 서비스를 로컬 Docker Compose로 실행하고 점검하는 방법을 설명합니다. 모든 명령은 `compose.yaml`이 있는 `SoldeskProject2_Web/Project2` 디렉터리에서 실행합니다.

## 서비스 구성

| Compose 서비스 | 컨테이너 | 호스트 주소 | 역할 |
|---|---|---|---|
| `web` | `soldesk-web` | `http://localhost:8081` | Spring Boot Web/API |
| `ocr-api` | `soldesk-ocr` | `http://127.0.0.1:8000` | 영수증 OCR·사업자 확인 |
| `recommendation-api` | `soldesk-recommendation` | `http://127.0.0.1:8001` | GPU 기반 AI 음식점 추천 |

컨테이너끼리는 호스트 포트가 아니라 Compose 서비스 이름으로 통신합니다.

- Web → OCR: `http://ocr-api:8000`
- Web → 추천: `http://recommendation-api:8000`
- 추천 → Web: `http://web:8081/internal/reviews/keyword-ratios`

## 사전 준비

다음 항목이 필요합니다.

- Docker Desktop과 Docker Compose v2
- Web과 Python 저장소가 같은 상위 디렉터리에 있는 구조
- 추천 서비스 실행 시 NVIDIA GPU와 Docker GPU 지원

저장소 배치는 아래 상대 경로를 유지해야 합니다. `compose.yaml`의 Python 빌드 경로가 이 구조를 사용합니다.

```text
<workspace>/
├─ SoldeskProject2_Web/
│  └─ Project2/
│     └─ compose.yaml
└─ SoldeskProject2_Python/
   ├─ receipt-biz-verify/
   └─ keyword-extraction/
```

Docker 설치 상태는 다음 명령으로 확인합니다.

```powershell
docker version
docker compose version
```

## 환경변수 준비

Web 환경변수 파일은 `Project2/.env`입니다. 최초 한 번만 예시 파일을 복사하고 실제 값을 입력합니다.

```powershell
Copy-Item .env.example .env
```

Docker 실행에 특히 중요한 변수는 다음과 같습니다.

| 구분 | 변수명 |
|---|---|
| DB | `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` |
| Redis | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` |
| 인증·암호화 | `JWT_SECRET`, `CHAT_LOG_AES_KEY`, `PHONE_AES_KEY`, `PHONE_HASH_KEY` |
| OCR 내부 인증 | `BUSINESS_VERIFY_INTERNAL_TOKEN` |
| 추천 내부 인증 | `RECOMMENDATION_INTERNAL_TOKEN` |
| 카카오 검색 | `KAKAO_CLIENT_ID` |

`BUSINESS_VERIFY_INTERNAL_TOKEN`과 `RECOMMENDATION_INTERNAL_TOKEN`에는 서로 다른 충분히 긴 난수를 사용합니다. Compose가 각 값을 Web과 해당 Python 컨테이너에 같은 값으로 주입합니다. `KAKAO_CLIENT_ID`는 추천 컨테이너의 `KAKAO_REST_API_KEY`로 전달됩니다.

OCR 또는 추천 서비스 전용 설정이 필요하면 다음 파일을 별도로 만들 수 있습니다. 두 파일은 선택 사항이며 실제 값은 Git에 올리지 않습니다.

- `SoldeskProject2_Python/receipt-biz-verify/.env`: `GEMINI_API_KEY`, `UPSTAGE_API_KEY`, `NTS_SERVICE_KEY` 등
- `SoldeskProject2_Python/keyword-extraction/.env`: `FOOTTRIP_MODEL_NAME` 등

> `.env` 파일의 내용, `docker inspect`의 환경변수 출력, 토큰이 포함된 명령 결과를 채팅·이슈·커밋에 남기지 않습니다. Compose 문법만 검사할 때는 실제 값을 출력하지 않는 `docker compose config --quiet`를 사용합니다.

## 최초 빌드와 실행

추천 모델 캐시용 외부 볼륨을 먼저 만듭니다. 이미 존재해도 같은 이름을 반환하므로 다시 실행해도 안전합니다.

```powershell
docker volume create soldesk-recommendation-models
docker compose config --quiet
```

세 서비스를 모두 빌드하고 실행하려면 다음 명령을 사용합니다.

```powershell
docker compose up -d --build
docker compose ps --all
```

GPU를 사용할 수 없거나 추천 서비스가 당장 필요하지 않다면 Web과 OCR만 실행합니다.

```powershell
docker compose up -d --build web ocr-api
docker compose ps --all
```

추천 서비스만 나중에 실행할 수 있습니다.

```powershell
docker compose up -d recommendation-api
docker compose ps --all
```

OCR은 최초 시작 시 모델 준비에 시간이 걸릴 수 있습니다. 추천 서비스는 첫 이미지 빌드와 모델 로딩이 더 오래 걸릴 수 있으며 healthcheck의 시작 유예 시간이 20분으로 설정되어 있습니다.

## 상태와 로그 확인

중지된 컨테이너까지 포함한 상태를 확인합니다.

```powershell
docker compose ps --all
```

정상 실행 중인 서비스는 `running`과 `healthy` 상태가 표시됩니다. 서비스별 최근 로그와 실시간 로그는 다음과 같이 확인합니다.

```powershell
docker compose logs --tail=100 web
docker compose logs --tail=100 ocr-api
docker compose logs --tail=100 recommendation-api

docker compose logs --follow recommendation-api
```

## Compose 내부 연결 점검

아래 명령은 토큰 값을 출력하지 않고 Web 컨테이너에서 Python 서비스의 인증된 health endpoint를 호출합니다.

```powershell
docker compose exec web sh -lc 'curl --fail --silent --show-error -H X-Internal-Token:$BUSINESS_VERIFY_INTERNAL_TOKEN http://ocr-api:8000/health'
docker compose exec web sh -lc 'curl --fail --silent --show-error -H X-Internal-Token:$RECOMMENDATION_INTERNAL_TOKEN http://recommendation-api:8000/health'
```

추천 컨테이너에서 Web 내부 API로 역방향 연결도 확인할 수 있습니다. 성공 시 `200`이 출력됩니다.

```powershell
docker compose exec recommendation-api python -c "import json, os, urllib.request; body=json.dumps({'place_ids':['docker-check'],'keywords':['docker-check']}).encode(); req=urllib.request.Request('http://web:8081/internal/reviews/keyword-ratios', data=body, headers={'Content-Type':'application/json', 'X-Internal-Token':os.environ['INTERNAL_API_TOKEN']}); print(urllib.request.urlopen(req, timeout=10).status)"
```

내부 토큰을 설정한 상태에서는 토큰 없는 OCR·추천 요청이 `401 Unauthorized`가 되는 것이 정상입니다.

## 변경 후 다시 빌드하기

소스 또는 Dockerfile을 수정한 서비스만 다시 빌드해 교체할 수 있습니다.

```powershell
docker compose up -d --build web
docker compose up -d --build ocr-api
docker compose up -d --build recommendation-api
```

`.env` 값을 바꾼 경우에는 컨테이너를 재생성해야 새 값이 반영됩니다.

```powershell
docker compose up -d --force-recreate web ocr-api recommendation-api
```

## 정지와 재시작

추천 서비스만 정지하고 Web과 OCR은 유지하려면 다음 명령을 사용합니다.

```powershell
docker compose stop recommendation-api
```

모든 컨테이너를 안전하게 정지하거나 다시 시작할 수 있습니다.

```powershell
docker compose stop
docker compose start web ocr-api
```

컨테이너와 Compose 네트워크까지 제거하려면 `down`을 사용합니다. 업로드와 로그는 호스트의 `uploads/`, `logs/`에 남고 외부 추천 모델 볼륨도 유지됩니다.

```powershell
docker compose down
```

데이터를 지우려는 목적이 아니라면 `uploads/`, `logs/`, `soldesk-recommendation-models` 볼륨을 삭제하지 않습니다.

## 자주 발생하는 문제

### `external volume ... not found`

```powershell
docker volume create soldesk-recommendation-models
```

### 추천 컨테이너가 GPU 오류로 시작하지 못함

Docker Desktop의 GPU 지원과 NVIDIA 드라이버를 확인합니다. GPU 준비 전에는 `web ocr-api`만 실행할 수 있습니다.

### 추천 API가 `503`을 반환함

`Project2/.env`의 `KAKAO_CLIENT_ID`가 설정되어 있는지 확인한 뒤 추천 컨테이너를 재생성합니다. 값 자체는 터미널이나 채팅에 출력하지 않습니다.

```powershell
docker compose up -d --force-recreate recommendation-api
```

### 내부 API가 `401`을 반환함

두 내부 토큰이 비어 있지 않은지 확인합니다. OCR 토큰은 Web과 OCR에, 추천 토큰은 Web과 추천 서비스에 각각 같은 값이 들어가야 합니다. 수정 후 관련 컨테이너를 재생성합니다.

### 컨테이너가 `unhealthy` 상태임

먼저 해당 서비스 로그를 확인합니다.

```powershell
docker compose ps --all
docker compose logs --tail=200 <service-name>
```

추천 컨테이너를 `docker compose stop recommendation-api`로 정상 정지한 경우에는 `exited`와 종료 코드 `143`이 표시될 수 있습니다.
