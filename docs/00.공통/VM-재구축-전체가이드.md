
------------------------------------------------------------------------
# VM 재구축 전체 가이드 (크레딧 소진 등으로 새 Azure 계정에 처음부터 다시 만들어야 할 때)
------------------------------------------------------------------------
지금 쓰고 있는 Azure VM(`SoldeskProject1`, `72.155.72.187`)은 MariaDB + Redis(Docker) + Jenkins(CI)를
함께 올려서 팀 전체가 공유하는 단일 인프라다(`.env`로 주소만 공유, 팀원은 VM 접속 자체가 필요 없음 —
Jenkins만 예외적으로 CI/CD 관리자가 접속). 이 문서는 "VM 크레딧을 다 써서 새 Azure 계정으로 처음부터
다시 만들어야 하는 상황"을 대비해, 지금 VM에 실제로 되어 있는 설정을 전부 재현할 수 있도록 순서대로
정리한 것 — 실제로 다시 만들 때 위에서부터 그대로 따라하면 됨(Claude가 Azure 콘솔/VM에 직접 접속할 수는
없어서, 아래 절차는 사람이 직접 수행해야 함).

관련 문서: [Redis-Docker-구축-가이드.md](Redis-Docker-구축-가이드.md)(Redis/Docker 상세, 이 문서에서는 요약만),
[VM-SSH-접속-가이드.md](VM-SSH-접속-가이드.md)(여러 컴퓨터에서 접속하는 방법), [DB-테이블설계.md](DB-테이블설계.md)(테이블 스키마 자체),
[CI-CD-Jenkins-구축-가이드.md](CI-CD-Jenkins-구축-가이드.md)(Jenkins 상세, 이 문서에서는 14장에 요약만)

**이 문서의 범위**: 이 VM이 제공하는 세 가지(MariaDB, Redis, Jenkins)를 새 VM에서 재현하는 것까지만 다룬다. 그
외에 애플리케이션이 필요로 하는 값들(JWT_SECRET, 카카오/네이버/구글 OAuth 키, 메일/SMS 발송 계정,
Upstage/Gemini API 키, 팀원 Python 서버 URL 등)은 **이 VM과 무관한 별도의 외부 계정/서비스**라 이 문서로는
복구가 안 된다 — `Project2/.env.example`의 전체 항목을 보고 각 서비스에서 새로 발급/확인해야 한다. 이
문서를 다 따라해도 DB/Redis 연결까지만 살아나고, 나머지 값이 없으면 앱 자체는 안 뜬다.

------------------------------------------------------------------------
## 목차
------------------------------------------------------------------------
1. Azure VM 생성 사양
2. VM 접속 (Windows SSH)
3. MariaDB 설치 및 설정
4. Azure 네트워크 보안 그룹(NSG) 설정 — MariaDB(3306)
5. DBeaver 설치 및 MariaDB 연결
6. DB 테이블은 어떻게 만드나 — 수동 CREATE TABLE 안 씀, Spring Boot가 자동 생성
7. DB 백업/복원 (mysqldump) — VM 재구축 시 데이터를 그대로 옮기는 방법
8. Docker + Redis (요약, 상세는 별도 문서)
9. 관리자(ADMIN) 계정 다시 만들기
10. VM 운영 관리 (자동 종료, 수동 시작, 비용)
11. 트러블슈팅 기록
12. 재구축 체크리스트
13. 메모리 부족 대비 스왑(Swap) 설정 (필수 — 2026-07-30 추가)
14. Jenkins CI/CD 재구축 (2026-07-30 추가)

------------------------------------------------------------------------
## 1. Azure VM 생성 사양
------------------------------------------------------------------------
Azure Portal에서 새 VM을 만들 때 아래 표와 완전히 동일하게 선택하면 지금과 같은 VM이 나온다.

### 기본 사항
| 항목 | 값 |
| --- | --- |
| 구독 | Azure subscription 1 |
| 리소스 그룹 | Soldesk (신규) |
| 가상 머신 이름 | SoldeskProject1 |
| 지역 | Korea Central |
| 가용성 옵션 | 가용성 영역 |
| 가용성 영역 | 1 (자체 선택 영역) |
| 보안 유형 | 신뢰할 수 있는 시작 가상 머신 |
| 보안 부팅 사용 | 예 |
| vTPM 사용 | 예 |
| 무결성 모니터링 | 아니요 |
| 이미지 | Ubuntu Server 24.04 LTS - Gen2 |
| VM 아키텍처 | x64 |
| 크기 | Standard B2ats v2 (2 vcpu, 1 GiB 메모리) |
| 최대 절전 모드 사용 | 아니요 |
| 인증 형식 | SSH 공개 키 |
| 사용자 이름 | eric7378 |
| SSH 키 형식 | RSA |
| 키 쌍 이름 | SoldeskProject1_key |
| Azure 스폿 | 아니요 |

### 디스크
| 항목 | 값 |
| --- | --- |
| OS 디스크 크기 | 64GiB |
| OS 디스크 유형 | 표준 SSD LRS |
| 관리 디스크 사용 | 예 |
| VM으로 OS 디스크 삭제 | 사용 |
| 임시 OS 디스크 | 아니요 |

### 네트워킹
| 항목 | 값 |
| --- | --- |
| 가상 네트워크 | (신규) SoldeskProject1-vnet |
| 서브넷 | (새로 만드는 중) default (10.0.0.0/24) |
| 공용 IP | (신규) SoldeskProject1-ip |
| NIC 네트워크 보안 그룹 | 기본 |
| 공용 인바운드 포트 | 선택한 포트 허용 |
| 인바운드 포트 선택 | HTTP(80), HTTPS(443), SSH(22) |
| 가속화된 네트워킹 | 끄기 |
| 기존 부하 분산 솔루션 뒤에 배치 | 아니요 |
| VM 삭제 시 공용 IP 및 NIC 삭제 | 사용 |

### 관리
| 항목 | 값 |
| --- | --- |
| 클라우드용 Microsoft Defender | 기본(무료) |
| 시스템이 할당한 관리 ID | 끄기 |
| Microsoft Entra ID로 로그인 | 끄기 |
| 자동 종료 | 사용 |
| 종료 시간 | 오후 7:00:00 (KST) |
| 종료 전 알림 | 사용 |
| 알림 이메일 | juhyeog237@gmail.com |
| 백업 | 사용 안 함 |
| 정기적인 평가 사용 | 끄기 |
| 핫패치 사용 | 끄기 |
| 패치 오케스트레이션 옵션 | 이미지 기본값 |

### 모니터링
경고/부트 진단/OS 게스트 진단/애플리케이션 상태 모니터링 전부 **끄기**(비용 절감, 개발 단계라 불필요).

### 고급
확장/VM 애플리케이션/Cloud-Init/사용자 데이터/근접 배치 그룹/용량 예약 그룹 전부 **없음/아니요**. 디스크
컨트롤러 유형만 **SCSI**.

### 가격 정보 (참고용, 재구축 시점 요금은 다를 수 있음)
| 항목 | 가격 |
| --- | --- |
| Standard B2ats v2 | 0.0117 USD/hr |
| 공용 IP | 별도 요금(소액) |

------------------------------------------------------------------------
## 2. VM 접속 (Windows SSH)
------------------------------------------------------------------------
### 공용 IP 확인
Azure Portal → 리소스 그룹 `Soldesk` → `SoldeskProject1` → 개요 탭에서 공용 IP 확인 (지금 쓰고 있는 값:
`72.155.72.187` — 재구축하면 당연히 새 IP가 나온다).

### 키 파일 권한 설정 (VM 생성 시 다운로드된 `.pem` 파일)
관리자 권한 PowerShell에서:
```powershell
icacls.exe "$env:USERPROFILE\Downloads\SoldeskProject1_key.pem" /reset
icacls.exe "$env:USERPROFILE\Downloads\SoldeskProject1_key.pem" /grant:r "$($env:USERNAME):(R)"
icacls.exe "$env:USERPROFILE\Downloads\SoldeskProject1_key.pem" /inheritance:r
```

### SSH 접속
```powershell
ssh -i "$env:USERPROFILE\Downloads\SoldeskProject1_key.pem" eric7378@<공용IP>
```
최초 접속 시 호스트 신뢰 여부(`yes`/`no`)를 물으면 `yes`.

> 참고: 지금 운영 중인 VM에는 이 최초 계정(`eric7378`) 외에, 여러 컴퓨터(집/학원)에서 오가며 접속하기
> 위해 나중에(2026-07-17) `soldeskuser`라는 별도 SSH 계정을 키 인증 전용으로 추가 등록해뒀다 — 절차는
> [VM-SSH-접속-가이드.md](VM-SSH-접속-가이드.md) 참고. 재구축 시에도 최초 접속은 이 문서의 `eric7378` 계정으로
> 하고, 이후 필요하면 같은 절차로 별도 계정을 추가하면 된다.

------------------------------------------------------------------------
## 3. MariaDB 설치 및 설정
------------------------------------------------------------------------
### 설치
```bash
sudo apt update
sudo apt install -y mariadb-server
sudo systemctl status mariadb
sudo systemctl enable mariadb
```
`enable`을 해야 VM 재시작 시 MariaDB가 자동으로 같이 뜬다.

### 보안 초기화
```bash
sudo mysql_secure_installation
```
| 질문 | 응답 |
| --- | --- |
| Switch to unix_socket authentication | n |
| Change the root password | Y (비밀번호 설정) |
| Remove anonymous users | Y |
| Disallow root login remotely | Y |
| Remove test database and access to it | Y |
| Reload privilege tables now | Y |

### 외부 접속 허용 (bind-address 변경)
```bash
sudo nano /etc/mysql/mariadb.conf.d/50-server.cnf
```
```
변경 전: bind-address = 127.0.0.1
변경 후: bind-address = 0.0.0.0
```
저장(nano: `Ctrl+O` → `Enter` → `Ctrl+X`) 후:
```bash
sudo systemctl restart mariadb
sudo systemctl status mariadb
sudo ss -tlnp | grep 3306
```
`0.0.0.0:3306`으로 리스닝되는지 확인.

### 데이터베이스 및 계정 생성
```bash
sudo mysql -u root -p
```
```sql
CREATE DATABASE soldesk_project CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'team_user'@'%' IDENTIFIED BY '설정한 비밀번호';
GRANT ALL PRIVILEGES ON soldesk_project.* TO 'team_user'@'%';
FLUSH PRIVILEGES;
EXIT;
```
이 시점에서 DB는 **테이블이 하나도 없는 빈 스키마**다 — 테이블을 여기서 손으로 만들지 않는다(6장 참고).

### VM 내부 방화벽(ufw) 확인
```bash
sudo ufw status
```
`inactive`면 별도 조치 불필요(현재 운영 중인 VM 상태). 활성화돼 있으면 `sudo ufw allow 3306/tcp && sudo ufw reload`.

------------------------------------------------------------------------
## 4. Azure 네트워크 보안 그룹(NSG) 설정 — MariaDB(3306)
------------------------------------------------------------------------
Azure Portal → `SoldeskProject1` → 네트워킹 → 네트워크 설정 → 인바운드 포트 규칙 추가:

| 항목 | 값 |
| --- | --- |
| 포트 | 3306 |
| 프로토콜 | TCP |
| 소스 | 모든(현재 설정 — 추후 팀원 IP로 제한 권장, 실제로는 안 좁혀놓은 상태) |
| 동작 | Allow |
| 우선순위 | 310 |
| 이름 | Allow-MariaDB-3306 |

"모든 소스 허용"에 대한 보안 경고 아이콘이 뜨지만, 팀 프로젝트 진행을 위해 그대로 유지 중(비밀번호로
방어). Redis용 6379 포트를 여는 절차도 완전히 동일한 패턴 — [Redis-Docker-구축-가이드.md](Redis-Docker-구축-가이드.md)
5장 참고.

------------------------------------------------------------------------
## 5. DBeaver 설치 및 MariaDB 연결
------------------------------------------------------------------------
### 환경 조건
Windows 10/11 x86_64, DBeaver Community 25.1.0 이상 권장.

### 설치 순서
1. https://dbeaver.io/download/ 에서 Windows용 설치 파일 다운로드
2. Installer Language → 한국어 → OK
3. 사용권 계약(Apache License 2.0) 동의
4. Choose Users → For me (현재 사용자) → 다음
5. 구성 요소: DBeaver Community(필수), Include Java(체크 권장)
6. 기본 설치 폴더 확인 → 다음 → 기본 시작 메뉴 폴더명 확인 → 설치
7. 압축 해제 진행 → Create Desktop Shortcut 체크 → 마침

### 새 데이터베이스 연결 생성
Database Navigator → 새 연결 아이콘 → Connect to a database

### 드라이버 선택
All → SQL 카테고리 → MariaDB 선택 → 다음(최초 연결 시 드라이버 자동 다운로드될 수 있음)

### 접속 정보 입력
| 항목 | 값 |
| --- | --- |
| Host | VM 공용 IP (예: 72.155.72.187) |
| Port | 3306 |
| Database | soldesk_project |
| Username | team_user |
| Password | 3장에서 설정한 비밀번호 |

### 연결 테스트 및 완료
Test Connection → 성공 메시지 확인 → 완료

### 연결 확인
Database Navigator에서 `soldesk_project - <IP>:3306` 트리 확인 시 Databases / Users / Administer /
System Info 하위 항목이 보이면 정상. (재구축 직후엔 테이블이 하나도 없는 빈 스키마로 보이는 게 정상 —
6장 참고)

------------------------------------------------------------------------
## 6. DB 테이블은 어떻게 만드나 — 수동 CREATE TABLE 안 씀, Spring Boot가 자동 생성
------------------------------------------------------------------------
**이 프로젝트는 테이블을 SQL 스크립트로 손수 만들지 않는다.** `Project2/src/main/resources/application.yml`에
아래 설정이 있고:
```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: update
```
이 값이 `update`라서, **Spring Boot 애플리케이션을 처음 실행하는 순간 Hibernate가 코드의 `@Entity`
클래스들을 스캔해서 필요한 테이블/컬럼을 자동으로 만든다.** 5장까지 마친 뒤(빈 DB + 계정만 있는 상태)
해야 할 일은:

1. `Project2/.env`에 새 VM 접속 정보 채우기(`DB_URL=jdbc:mariadb://<새IP>:3306/soldesk_project`,
   `DB_USERNAME=team_user`, `DB_PASSWORD=...`, 그리고 Redis 값도 8장 참고해서 채움)
2. 로컬에서 평소처럼 서버를 한 번 실행:
   ```bash
   ./mvnw.cmd spring-boot:run
   ```
3. 콘솔에 `Hibernate: create table ...` 로그가 각 테이블마다 쭉 찍히면서, DB에 40개 테이블(2026-07-24
   기준, `docs/00.공통/DB-테이블설계.md`와 `docs/00.공통/DB-ERD-2026-07-24.png` 참고)이 전부 자동으로
   만들어진다 — 이후 DBeaver로 다시 보면 테이블이 채워져 있음.
4. 새 기능이 추가되면서 엔티티에 컬럼/테이블이 늘어날 때도 마찬가지로, 그냥 서버를 재시작하기만 하면
   `ddl-auto=update`가 알아서 `ALTER TABLE`/`CREATE TABLE`을 실행한다 — 이 프로젝트 전체에서 지금까지
   한 번도 수동으로 `CREATE TABLE`/`ALTER TABLE`을 실행한 적이 없다(19.오픈채팅의 `chat_rooms` 등 4개
   테이블, 18.추천-피드백의 `recommendation_histories` 컬럼 추가 등 전부 이 방식으로 생성됨).

**주의할 점**:
- `ddl-auto=update`는 컬럼을 "추가"만 하고 "삭제"는 안 한다 — 안전하지만, 엔티티에서 필드를 지워도 DB
  컬럼은 안 지워지고 남는다(이 프로젝트에서도 몇몇 죽은 컬럼이 이런 식으로 남아있음, 문제 되면 그때
  수동으로 정리).
- 이미 데이터가 있는 테이블에 `NOT NULL` 컬럼을 기본값 없이 추가하려고 하면 실패한다(`ChatRoom.maxMembers`
  추가 때 실제로 겪은 문제) — 그런 경우는 JPA `@Column(columnDefinition = "... DEFAULT ...")`으로 DB
  기본값을 같이 지정해야 한다(`docs/19.오픈채팅/001-02` 2-13장 참고).
- 운영 서비스라면 `ddl-auto=update`를 계속 쓰는 게 위험할 수 있지만(자동 스키마 변경), 이 프로젝트는
  아직 개발/팀 프로젝트 단계라 지금까지 이 방식으로 문제없이 운영해왔다.

------------------------------------------------------------------------
## 7. DB 백업/복원 (mysqldump) — VM 재구축 시 데이터를 그대로 옮기는 방법
------------------------------------------------------------------------
1장 "관리" 표의 "백업 | 사용 안 함"은 **Azure VM 레벨의 자동 백업 기능**(디스크 스냅샷을 Azure가 관리)을
안 쓴다는 뜻이고, 이 장에서 다루는 건 그거와 다른, **MariaDB 표준 도구(`mysqldump`)로 직접 뜨는 수동
백업**이다(2026-07-27 정리, 실제로 실행은 아직 안 해봄 — 필요할 때 아래 절차 그대로 실행). VM을 삭제하고
새로 만들 때, 6장처럼 Hibernate가 테이블 구조는 다시 만들어주지만 **데이터(회원/리뷰/주차장 동기화
결과 등)는 하나도 복구가 안 된다** — 데이터까지 옮기고 싶으면 이 절차가 필요하다.

### 7-1. 백업 (기존 VM에서)
로컬 PC(또는 VM에 직접 SSH로 들어가서)에서 MariaDB 클라이언트 도구(`mysqldump`)가 필요하다 — Windows엔
기본으로 없어서 [MariaDB 공식 다운로드](https://mariadb.org/download/)에서 "MariaDB Server"가 아니라
**"Command-line client / connectors"만** 받아도 된다(서버 전체를 설치할 필요 없음).
```bash
mysqldump -h 72.155.72.187 -u team_user -p --single-transaction soldesk_project > backup_2026-07-27.sql
```
- `--single-transaction`: 백업 도중에도 서비스가 계속 DB를 쓰고 있을 때(실 운영 중) 테이블을 잠그지
  않고 일관된 스냅샷을 뜨기 위한 옵션 — InnoDB 테이블(이 프로젝트 전부 InnoDB)에서만 의미 있음, 꼭 포함할 것
- 비밀번호는 `-p` 뒤에 바로 붙이지 말고(쉘 히스토리에 평문으로 남음) 프롬프트가 뜨면 입력하는 방식 권장
- 결과물은 `CREATE TABLE`/`INSERT INTO` 등 표준 SQL문으로 구성된 사람이 읽을 수 있는 `.sql` 파일 — 다른
  버전 MariaDB/MySQL로 옮겨도 이식성이 좋음
- 파일 크기는 그 시점 데이터 양에 비례한다(15.주차장-정보 전체 동기화처럼 수십만 건 단위 데이터가 있으면
  파일도 그만큼 커짐) — 백업 시점을 언제로 할지는 상황에 맞게 선택

### 7-2. 복원 (새 VM에서)
3장대로 새 VM에 MariaDB 설치 + `soldesk_project` 빈 DB/`team_user` 계정까지 만든 직후(테이블은 아직
없는 상태), **6장의 "Spring Boot로 테이블 자동 생성" 대신** 이 백업 파일로 한 번에 복원하면 테이블+데이터가
전부 그대로 살아난다:
```bash
mysql -h {새 VM 공용 IP} -u team_user -p soldesk_project < backup_2026-07-27.sql
```
이후 애플리케이션 엔티티가 백업 시점 이후로 바뀌었다면(새 컬럼 추가 등), 평소처럼 서버를 한 번 실행하면
`ddl-auto=update`가 차액만 `ALTER TABLE`로 채워준다(6장과 동일한 동작) — 백업 복원과 자동 스키마 생성은
서로 배타적이지 않고 이어서 쓸 수 있다.

### 7-3. 정기 백업으로 만들고 싶다면 (참고, 미구현)
지금은 필요할 때 수동으로 위 명령을 실행하는 것만 정리해뒀다. 나중에 "매일 새벽 자동 백업" 같은 걸
원하면, VM 안에서 `mysqldump`를 cron으로 스케줄링하고 결과 파일을 VM 밖(예: Azure Blob Storage, 팀
드라이브 등)으로 옮기는 별도 스크립트가 필요함 — 15(주차장-정보)의 `ParkingSyncScheduler`처럼 이
프로젝트 안(Spring `@Scheduled`)에 만드는 방식이 아니라 VM 자체의 OS 레벨 작업이라 별도 구축이 필요하다.

------------------------------------------------------------------------
## 8. Docker + Redis (요약)
------------------------------------------------------------------------
상세 절차는 [Redis-Docker-구축-가이드.md](Redis-Docker-구축-가이드.md)에 전부 있음 — 재구축 시 그 문서
2장부터 그대로 따라가면 됨. 요약만 적으면:

1. `curl -fsSL https://get.docker.com | sudo sh` 로 Docker 설치, `sudo usermod -aG docker $USER` 후 SSH
   재접속
2. `~/redis/` 디렉터리에 `.env`(`REDIS_PASSWORD=...`)와 `docker-compose.yml`(이미지 `redis:7-alpine`,
   컨테이너명 `soldesk-redis`, `--requirepass ${REDIS_PASSWORD}`) 작성
3. `docker compose up -d` 로 실행, `docker exec -it soldesk-redis redis-cli -a <비밀번호> PING` 으로
   VM 내부에서 확인
4. Azure NSG에 6379 인바운드 규칙 추가(이 문서 4장의 3306 규칙과 같은 방식)
5. 로컬 PC에서 `redis-cli -h <IP> -p 6379 -a <비밀번호> PING`으로 외부 접속 확인
6. `Project2/.env`에 `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD` 채우기

Spring Boot 쪽은 이미 `pom.xml`에 `spring-boot-starter-data-redis`가 있고 코드도 다 되어 있으니, 새
VM의 접속 정보만 `.env`에 채우면 로그인 실패 잠금/refresh token/OAuth state 등이 그대로 다시 동작한다.

------------------------------------------------------------------------
## 9. 관리자(ADMIN) 계정 다시 만들기
------------------------------------------------------------------------
새 DB는 완전히 빈 상태로 시작하므로(6장), 회원가입을 아무리 해도 전부 일반 회원(`USER`)일 뿐 `ADMIN`
권한을 가진 계정은 하나도 없다 — 14(관리자-권한) 이후의 관리자 페이지(`admin-test.html`,
`/api/admin/**`)를 쓰려면 최소 1명은 직접 승격시켜야 한다. 두 가지 방법(상세는
[docs/14.관리자-권한/001-04](../14.관리자-권한/001-04.관리자-권한-가이드.md) 2장):

**(A) 이미 정상적으로 회원가입한 계정을 승격** — 가장 간단, DBeaver SQL 편집기에서:
```sql
UPDATE members SET role = 'ADMIN' WHERE email = '{승격할 이메일}';
```
이미 로그인되어 있던 세션은 role이 반영 안 된 옛날 accessToken을 그대로 쓰고 있으므로, **반드시
재로그인**해야 새 권한이 실제로 적용된다(JWT에 role이 로그인 시점에 박히기 때문).

**(B) 테스트용으로 회원가입 절차 없이 바로 ADMIN 계정 생성** — `docs/14.관리자-권한/001-04.관리자-권한-가이드.md`
2-2장에 Node 스크립트 예시가 있음(Argon2 해시 계산 후 `members`/`member_credentials`에 직접 INSERT).

------------------------------------------------------------------------
## 10. VM 운영 관리 (자동 종료, 수동 시작, 비용)
------------------------------------------------------------------------
### 자동 종료
매일 오후 7시(KST) 자동 종료, 30분 전 알림 메일 발송(1장 "관리" 표 참고).

### 수동 시작
Azure Portal → 리소스 그룹 `Soldesk` → `SoldeskProject1` → 개요 상단 "시작" 클릭 (약 30초~1분 소요).
또는:
```powershell
az login
az vm start --resource-group Soldesk --name SoldeskProject1
```

### 공용 IP 변동 가능성
공용 IP가 동적이면, VM을 완전히 중지했다 다시 시작할 때 IP가 바뀔 수 있다 — 바뀌면 `.env`(DB_URL,
REDIS_HOST)와 DBeaver 연결 설정을 전부 갱신해야 함. 고정(Static) IP로 바꾸면 이 번거로움이 없어짐:
`SoldeskProject1-ip` → 구성 → 할당: 동적 → 고정 → 저장.

### MariaDB/Redis 자동 기동
`systemctl enable mariadb`(3장)와 Docker Compose의 `restart: unless-stopped`(8장) 덕분에, VM이
재시작되면 둘 다 별도 조작 없이 자동으로 같이 뜬다.
```bash
sudo systemctl status mariadb
docker compose -f ~/redis/docker-compose.yml ps
```

### 비용
Azure Portal에서 정상적으로 "중지(할당 해제)"하면 컴퓨팅 비용은 꺼져있는 동안 청구 안 됨(자동 종료도
항상 이 방식). 다만 OS 디스크(64GiB SSD)와 공용 IP는 VM이 꺼져 있어도 계속 소액 과금됨. 가상
네트워크/NSG는 무료. 비용 확인: Azure Portal → 비용 관리 + 청구 → 리소스 그룹 `Soldesk`로 필터.

------------------------------------------------------------------------
## 11. 트러블슈팅 기록
------------------------------------------------------------------------
| 증상 | 원인 | 해결 |
| --- | --- | --- |
| SSH 접속 시 키 교환 알고리즘 오류 | 잘못된 IP로 접속 시도 | Azure Portal에서 정확한 공용 IP 재확인 |
| `bind-address` 설정 후 MariaDB 재시작 실패 | nano에서 `0.0.0.0` 입력 시 점(.) 대신 쉼표(,)가 잘못 입력되어 `0,0,0,0`으로 저장됨 | 정확한 점(.) 형식으로 재수정 |
| DBeaver 원격 연결 시 Connection timed out | MariaDB/VM 방화벽은 정상이었으나 Azure NSG에 3306 인바운드 규칙이 없었음 | NSG에 3306 허용 규칙 추가(4장) |
| DBeaver GUI "새 테이블 만들기"에서 컬럼 0개로 저장 시 SQL 문법 오류 | DBeaver GUI 자체의 동작(컬럼 최소 1개 필요) | 컬럼 최소 1개 정의 후 저장하거나 SQL 편집기에서 `CREATE TABLE` 직접 실행 — 다만 이 프로젝트는 6장처럼 애초에 수동 테이블 생성을 안 함 |
| DBeaver에서 Users 노드 펼칠 때 `mysql.user` 조회 권한 오류 | `team_user` 계정에 시스템 테이블 조회 권한이 없음(정상적인 권한 제한) | 실제 작업엔 영향 없음, 무시 가능 |
| `mysql_secure_installation` 실행 중 명령어 붙여넣기 오류 | PowerShell → SSH 세션에 여러 줄을 한 번에 붙여넣으면 특수문자(`^[[200~` 등)가 같이 입력됨 | 한 줄씩 직접 입력 |
| SSH 접속 시 `Permission denied (publickey)` | 비밀번호 로그인 시도(이 VM은 키 인증만 허용) 또는 `-i` 옵션 누락 | `-i` 옵션으로 올바른 키 파일 지정 |
| Redis 관련: `az` 명령이 VM 안(SSH 세션)에서 실행돼서 에러 | `az`는 로컬 PowerShell 전용, `docker`/`redis-cli`는 VM 안에서 실행 | 지금 어느 터미널인지 프롬프트로 확인 후 맞는 쪽에서 실행 |

------------------------------------------------------------------------
## 12. 재구축 체크리스트
------------------------------------------------------------------------
- [ ] 1장 사양대로 새 Azure VM 생성
- [ ] 2장 SSH 접속 확인
- [ ] 3장 MariaDB 설치 + `soldesk_project` DB/`team_user` 계정 생성 (테이블은 아직 안 만듦)
- [ ] 4장 NSG에 3306 포트 허용
- [ ] 5장 DBeaver로 연결 확인(빈 스키마로 보이는 게 정상)
- [ ] (데이터도 옮기고 싶으면) 7장대로 `mysqldump` 백업 파일을 새 DB에 먼저 복원 — 안 하면 6장대로
      테이블만 자동 생성되고 데이터는 비어있는 채로 시작함
- [ ] 8장 Docker + Redis 컨테이너 구성, NSG에 6379 포트 허용
- [ ] `Project2/.env`에 새 `DB_URL`/`DB_USERNAME`/`DB_PASSWORD`/`REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`
      전부 채우기(팀원 전체에게도 새 값 공지)
- [ ] `.env.example`의 나머지 항목(JWT_SECRET, OAuth 키, 메일/SMS, 외부 API 키 등 — VM과 무관, 서두 참고)도
      비어있지 않은지 확인
- [ ] 6장대로 로컬에서 서버 실행 → Hibernate가 테이블 자동 생성(또는 백업 복원분에 차액 반영)되는지 로그로
      확인 → DBeaver에서 테이블 채워졌는지 재확인
- [ ] 9장대로 본인 계정(또는 팀원 계정)을 `ADMIN`으로 승격 + 재로그인 확인
- [ ] (선택) VM 공용 IP를 고정(Static)으로 전환해서 이후 재시작 시 IP 안 바뀌게
- [ ] 회원가입 → 로그인 등 기본 API 한 번 호출해서 실제로 DB/Redis에 정상 반영되는지 최종 확인
- [ ] 13장대로 스왑(swap) 설정 — 이 VM 사양(1GiB 메모리)은 스왑 없이 Jenkins/Maven 빌드를 돌리면
      SSH 응답 없음 상태로 멈추는 문제를 실제로 여러 번 겪었음, 재구축 시 가장 먼저 해두는 게 안전
- [ ] (Jenkins CI/CD도 재구축하려면) 14장 + `CI-CD-Jenkins-구축-가이드.md` 전체 절차 진행

------------------------------------------------------------------------
## 13. 메모리 부족 대비 스왑(Swap) 설정 (필수 — 2026-07-30 추가)
------------------------------------------------------------------------
이 VM(`Standard B2ats v2`, 1GiB 메모리, 실사용 가능 메모리는 약 846MB)은 Jenkins 설치, 플러그인 설치,
Maven 첫 빌드 도중 **메모리 부족으로 VM 자체가 완전히 응답 없는 상태(SSH TCP는 열려있지만 배너 응답 없음)에
빠지는 문제를 이 프로젝트에서 실제로 세 번 겪었다** — Azure Portal에서 수동으로 VM을 재시작해야만 복구됨.
스왑을 만들어두면 이 문제가 재발하지 않는다(다만 근본적으로 메모리가 작다는 한계 자체가 사라지는 건 아님 —
빌드 속도는 느릴 수 있음).

**재구축 시 3장(MariaDB 설치) 직후, Jenkins를 설치하기 전에 미리 해둘 것을 권장**.

```bash
# 2GB 스왑 파일 생성
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# 재부팅 후에도 유지되도록 /etc/fstab에 등록
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 확인
free -h
swapon --show
```
`free -h`의 `Swap` 행에 `2.0Gi`가 보이면 정상.

------------------------------------------------------------------------
## 14. Jenkins CI/CD 재구축 (2026-07-30 추가)
------------------------------------------------------------------------
이 VM에는 MariaDB/Redis 외에 **Jenkins(CI/CD)도 같은 VM에 함께 설치되어 있다** — GitHub(`soldesk-org/SoldeskProject2_Web`,
`main` 브랜치)에 push하면 웹훅으로 Jenkins가 자동으로 Build+Test+Archive+**Deploy(systemd 재시작)까지**
수행해서, 실제로 서비스가 재배포된다(빌드 #10에서 라이브 확인 완료).

재구축 시 Jenkins 설치/설정 전체 절차(Java 17+21 동시 설치, Jenkins apt 저장소 키 문제, systemd 오버라이드,
플러그인 목록, Credentials 34개 목록, Job 생성, GitHub 웹훅 연결, Deploy 단계용 systemd 서비스/sudoers
설정, 겪었던 트러블슈팅 전체)는 **이 문서가 아니라 [CI-CD-Jenkins-구축-가이드.md](CI-CD-Jenkins-구축-가이드.md)에
전부 정리되어 있다**(특히 11장이 Deploy 단계 사전 준비) — 재구축 시 그 문서를 그대로 따라가면 됨. 그
문서의 3장이 위 13장과 같은 스왑 설정을 다시 한 번 다루고 있으니 중복으로 헷갈리지 말 것(같은 내용, 이
문서에도 체크리스트 상 먼저 해두라고 요약만 남겨둔 것).

브랜치 전략(`feature/*` → `develop` → `main` → Jenkins 자동 빌드)은
[GitHub-브랜치전략.md](GitHub-브랜치전략.md)와 [Web-저장소-브랜치-구조.md](Web-저장소-브랜치-구조.md) 참고.
