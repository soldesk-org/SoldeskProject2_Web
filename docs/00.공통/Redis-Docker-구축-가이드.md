
------------------------------------------------------------------------
# Redis / Docker 구축 가이드
------------------------------------------------------------------------
2026-07-17 논의: 프로젝트 차원에서 Redis/Docker 사용을 확정함 (팀원 5명, 학원/집 등 작업 장소가 자주 바뀜).
환경: **Azure VM**, 기존에 MariaDB(`72.155.72.187`)가 이미 떠 있는 바로 그 VM, OS는 **Ubuntu/Debian 계열**.
관련 배경: [002 로그인 001-05 7장](../02.로그인/001-05.부족한-내용.md#7-확정된-방향-미착수-redis--docker-도입-계획)

이 문서는 **실행 가이드(runbook)**다. 위에서부터 순서대로 VM에 SSH로 접속해서 그대로 따라하면 됨. (Claude가 VM에 직접 접속할 수는 없어서, 아래 명령어를 직접 실행해야 함)

> **2026-07-17 구축 완료.** VM에 Redis 컨테이너가 떠 있고(`soldesk-redis`), Azure NSG(`SoldeskProject1-nsg`)에 6379 인바운드 규칙(`Allow-Redis-6379`)이 열려 있으며, 외부(개발 PC)에서 `AUTH`+`PING`까지 성공 확인함. `Project2/.env`/`.env.example`에도 `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD` 반영 완료. 아래 내용은 그대로 두되(재구축 시 참고용), 9장 체크리스트를 최신 상태로 갱신함. 다른 컴퓨터(학원 등)에서 VM에 접속하는 방법은 별도 문서 [VM-SSH-접속-가이드.md](VM-SSH-접속-가이드.md) 참고.
>
> 진행 중 겪었던 이슈(팀원이 새로 VM 접속할 때 참고):
> - VM의 원래 SSH 계정명을 아무도 몰라서, `az vm user update`로 신규 계정(`soldeskuser`)을 SSH 공개키와 함께 새로 등록해서 해결함 (비밀번호 인증은 이 VM에서 막혀있어 `Permission denied (publickey)`가 남, 키 등록이 필수)
> - Windows에서 `az` CLI는 `winget install Microsoft.AzureCLI`로 설치 후 **반드시 새 PowerShell 창**을 열어야 PATH가 인식됨
> - `az` 관련 명령은 **로컬 PowerShell**에서, Redis 컨테이너 관련 명령은 **SSH로 접속한 VM 안**에서 실행해야 함 — 창을 헷갈리면 전부 실패함

------------------------------------------------------------------------
## 1. 결정한 방향 (요약)
------------------------------------------------------------------------
**팀원 각자 로컬에 Redis를 설치/실행하지 않는다.** 대신:

1. **공용 원격 Redis 서버 1개**를 기존 MariaDB VM에 Docker로 띄우고, 팀 전체가 그 주소 하나를 `.env`의 `REDIS_HOST`/`REDIS_PORT`로 바라본다.
   → 이미 MariaDB를 이 방식(`72.155.72.187:3306`, `.env`의 `DB_URL`)으로 쓰고 있으므로 **완전히 같은 패턴**.
2. `docker-compose.yml`은 프로젝트 레포에도 커밋해서, 필요하면 누구나 로컬에서도 똑같은 Redis를 띄울 수 있게 해둔다 (평소엔 안 씀, 오프라인 개발 등 예외 상황용).

------------------------------------------------------------------------
## 2. VM 접속 및 사전 확인
------------------------------------------------------------------------
```bash
ssh <사용자>@72.155.72.187

# OS 확인 (Ubuntu/Debian 계열이어야 아래 명령이 그대로 동작)
cat /etc/os-release

# Docker가 이미 설치되어 있는지 확인 (MariaDB가 컨테이너로 떠 있다면 이미 있을 수 있음)
docker --version
docker compose version
```
`docker: command not found`가 뜨면 3장부터, 이미 있으면 3장을 건너뛰고 4장부터 진행.

------------------------------------------------------------------------
## 3. Docker 설치 (아직 없는 경우만)
------------------------------------------------------------------------
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```
`usermod` 실행 후에는 **SSH 세션을 한 번 끊고 다시 접속**해야 `sudo` 없이 `docker` 명령이 먹힌다 (그룹 권한이 새 로그인 세션부터 적용됨).

```bash
# 재접속 후 확인
docker --version
docker compose version
```

------------------------------------------------------------------------
## 4. Redis 컨테이너 구성
------------------------------------------------------------------------
### 4-1. 작업 디렉터리 생성
```bash
mkdir -p ~/redis && cd ~/redis
```

### 4-2. 비밀번호 정하고 `.env` 작성
Redis는 기본값이면 인증 없이 누구나 접속 가능하므로, 인터넷에 포트를 여는 이상 비밀번호는 필수.
```bash
nano .env
```
파일 내용 (팀에서 정한 비밀번호로 교체, DB 비밀번호와는 다른 값 사용 권장):
```bash
REDIS_PASSWORD=팀에서_정한_강력한_비밀번호
```

### 4-3. `docker-compose.yml` 작성
```bash
nano docker-compose.yml
```
파일 내용:
```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: soldesk-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: ["redis-server", "--requirepass", "${REDIS_PASSWORD}"]
    volumes:
      - redis-data:/data

volumes:
  redis-data:
```
- `restart: unless-stopped`: VM이 재부팅돼도 Redis가 자동으로 다시 뜸
- `redis-data` 볼륨: 컨테이너를 지웠다 다시 만들어도 데이터 유지

### 4-4. 실행
```bash
docker compose up -d
docker compose ps
```
`STATUS`가 `Up`이면 정상. 로그 확인은 `docker compose logs -f` (Ctrl+C로 빠져나오기).

### 4-5. VM 내부에서 접속 테스트
```bash
docker exec -it soldesk-redis redis-cli -a 팀에서_정한_비밀번호 PING
# PONG 이 나오면 정상
```

------------------------------------------------------------------------
## 5. Azure NSG(Network Security Group)에서 6379 포트 열기
------------------------------------------------------------------------
Redis는 VM 내부에서는 떠 있어도, Azure의 방화벽 역할을 하는 NSG에서 6379 포트를 막고 있으면 팀원들이 외부에서 접속할 수 없다. MariaDB용 3306 포트를 열어둔 것과 동일한 절차를 6379에도 적용.

### 방법 A: Azure Portal (클릭으로 진행, 처음이면 이 방법 추천)
1. [portal.azure.com](https://portal.azure.com) 접속 → 이 VM이 속한 **가상 머신** 리소스로 이동
2. 왼쪽 메뉴에서 **네트워킹(Networking)** 클릭
3. **인바운드 포트 규칙(Inbound port rules)** 탭 → **포트 규칙 추가(Add inbound port rule)**
4. 아래처럼 입력:
   - **소스(Source)**: `Any` (팀원 IP가 자주 바뀌면 `Any`가 현실적, 대신 Redis 쪽 비밀번호로 방어) 또는 팀원들 IP 대역을 안다면 `IP Addresses`로 제한
   - **소스 포트 범위**: `*`
   - **대상 포트 범위(Destination port ranges)**: `6379`
   - **프로토콜**: `TCP`
   - **동작(Action)**: `Allow`
   - **우선순위(Priority)**: 3306 규칙과 겹치지 않는 숫자 (예: 3306 규칙이 320이면 321 등, Portal이 자동으로 빈 번호 추천해줌)
   - **이름(Name)**: `Allow-Redis-6379` 등 알아보기 쉬운 이름
5. **추가(Add)** 클릭

### 방법 B: Azure CLI (설치되어 있다면 더 빠름)
```bash
# 리소스 그룹/NSG 이름 확인 (이미 3306을 열 때 썼던 값과 동일)
az network nsg list --output table

# 규칙 추가 (아래 <리소스그룹>, <NSG이름>은 실제 값으로 교체)
az network nsg rule create \
  --resource-group <리소스그룹> \
  --nsg-name <NSG이름> \
  --name Allow-Redis-6379 \
  --priority 321 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --destination-port-ranges 6379 \
  --source-address-prefixes '*'
```
`<리소스그룹>`/`<NSG이름>`을 모르면 `az network nsg list --output table`로 목록에서 확인하거나, MariaDB 3306 포트를 열 때 사용했던 것과 같은 NSG를 그대로 쓰면 됨.

------------------------------------------------------------------------
## 6. 외부(개발 PC)에서 접속 테스트
------------------------------------------------------------------------
로컬에 `redis-cli`가 있는 경우:
```bash
redis-cli -h 72.155.72.187 -p 6379 -a 팀에서_정한_비밀번호 PING
# PONG
```
`redis-cli`가 없으면 (Windows에서 흔함) 아래처럼 Node.js로 즉석 테스트 가능:
```bash
node -e "
const net = require('net');
const s = net.connect(6379, '72.155.72.187', () => {
  s.write('PING\r\n');
});
s.on('data', d => { console.log(d.toString()); s.end(); });
"
```
(간단 연결 확인용. 실제 인증까지 테스트하려면 `redis-cli`나 Spring Boot 연동 후 확인 권장)

------------------------------------------------------------------------
## 7. 프로젝트 `.env` / `.env.example`에 값 추가
------------------------------------------------------------------------
DB와 동일한 패턴으로 `Project2/.env`(실제 값, gitignore 처리됨)와 `Project2/.env.example`(빈 값, 레포에 커밋)에 추가.

```bash
REDIS_HOST=72.155.72.187
REDIS_PORT=6379
REDIS_PASSWORD=팀에서_정한_비밀번호
```

Spring Boot 연동은 2026-07-17에 완료됨 — `spring-boot-starter-data-redis` 의존성 추가, 로그인 실패 카운트/잠금과 refresh token을 Redis로 구현. 상세: [002 로그인 001-03 6장](../02.로그인/001-03.로그인-구현-테스트.md#6-4차-구현-2026-07-17-redis-연동-일괄-반영).

------------------------------------------------------------------------
## 8. 로컬 개발용 docker-compose.yml (선택 사항)
------------------------------------------------------------------------
평소에는 VM의 공용 Redis를 쓰고, 인터넷이 안 되는 곳에서 작업하거나 공용 서버에 영향 없이 실험하고 싶을 때만 사용.

```yaml
# docker-compose.local.yml (레포 루트에 커밋)
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```
로컬에서 쓰고 싶으면 `.env`의 `REDIS_HOST`만 `localhost`로 바꾸면 됨.

------------------------------------------------------------------------
## 9. 체크리스트
------------------------------------------------------------------------
- [x] VM SSH 접속, OS/Docker 설치 여부 확인 (2장) — 2026-07-17, Ubuntu 24.04 확인, 신규 계정 `soldeskuser`(SSH 키 인증) 등록
- [x] Docker 설치 (필요시, 3장) — 2026-07-17, `get.docker.com` 스크립트로 설치 완료 (Docker 29.6.2, Compose v5.3.1)
- [x] `~/redis/docker-compose.yml` + `.env` 작성, `docker compose up -d` (4장) — 2026-07-17, 컨테이너명 `soldesk-redis`
- [x] VM 내부에서 `redis-cli PING` 성공 확인 (4-5) — 2026-07-17
- [x] Azure NSG에 6379 인바운드 규칙 추가 (5장) — 2026-07-17, `SoldeskProject1-nsg`에 `Allow-Redis-6379`(우선순위 321) 추가
- [x] 개발 PC에서 외부 접속 테스트 성공 (6장) — 2026-07-17, `Test-NetConnection` + `AUTH`/`PING` 모두 성공
- [x] `Project2/.env`, `.env.example`에 `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD` 추가 (7장) — 2026-07-17
- [ ] (선택) `docker-compose.local.yml` 레포에 커밋 (8장) — 미착수, 필요할 때 진행
- [x] `pom.xml`에 `spring-boot-starter-data-redis` 추가 — 2026-07-17, 로그인 실패 카운트/잠금 + refresh token 구현과 함께 완료
- [ ] Redis 비밀번호를 `DB_PASSWORD`와 다른 값으로 교체 검토 (현재 동일 값 사용 중, 급하지 않지만 권장)
