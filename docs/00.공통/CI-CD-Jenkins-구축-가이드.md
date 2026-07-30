
------------------------------------------------------------------------
# CI/CD (Jenkins + GitHub Webhook) 구축 가이드 (2026-07-30 작성, 실제 구축 완료 기준)
------------------------------------------------------------------------
2026-07-30에 GitHub 저장소(`soldesk-org/SoldeskProject2_Web`) 기준으로 Jenkins CI/CD 파이프라인을
Build→Test→Archive→**Deploy까지 전부** 실제로 끝까지 구축 완료함 — Azure VM에 SSH로 직접 설치, GitHub
Webhook 실제 등록, 실제 push 한 번으로 자동 빌드+배포까지 라이브 검증 완료(빌드 #10, SUCCESS, 배포된
앱이 8081 포트에서 실제로 HTTP 200 응답하는 것까지 확인). VM을 나중에 재설치(`VM-재구축-전체가이드.md`)
하게 되면 이 문서를 그대로 다시 따라 하면 됨.

------------------------------------------------------------------------
## 1. 전체 구조 (실제 동작 확인됨)
------------------------------------------------------------------------
```
GitHub (soldesk-org/SoldeskProject2_Web, main 브랜치 push)
   │
   ▼ Webhook (POST http://72.155.72.187:8080/github-webhook/)
Jenkins (SoldeskProject1 VM, 같은 VM에 MariaDB/Redis와 같이 설치)
   ├─ 1. Checkout   (git checkout, credential: github-pat)
   ├─ 2. Build      (Project2/mvnw clean package -DskipTests)
   ├─ 3. Test        (Project2/mvnw test — .env의 모든 필수 환경변수를 Jenkins Credentials로 주입)
   ├─ 4. Archive     (Project2/target/*.war 아카이빙 — 이 프로젝트는 war 패키징)
   └─ 5. Deploy      (같은 VM 안에서 systemd 재시작 — Jenkins가 이 VM 자체에서 실행되므로 scp/ssh 불필요)
```
Job 이름: `soldesk-web-ci` (Pipeline, `Jenkinsfile` = 저장소 루트, `*/main` 브랜치 추적)

------------------------------------------------------------------------
## 2. Jenkins 설치 (Azure VM, Ubuntu 24.04, 실제 성공한 절차)
------------------------------------------------------------------------
```powershell
ssh -i "<pem 또는 soldesk_vm 키>" <VM 관리자 계정>@72.155.72.187
```

```bash
sudo apt update
sudo apt install -y fontconfig openjdk-17-jdk   # Spring Boot 앱 빌드용(주의: -jre 아니라 -jdk 설치해야 컴파일 됨)
sudo apt install -y openjdk-21-jdk              # Jenkins 자체 구동용 — Jenkins 최신 LTS는 Java 21 이상 필수(17로는 기동 실패)

sudo mkdir -p /etc/apt/keyrings
sudo wget -q -O /etc/apt/keyrings/jenkins-keyring.asc https://pkg.jenkins.io/debian-stable/jenkins.io-2026.key
echo "deb [signed-by=/etc/apt/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" | sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null
sudo apt update
sudo apt install -y jenkins
```

**Jenkins가 기본으로 Java 17을 잡아서 기동 실패하는 문제** — systemd override로 Java 21을 명시적으로
지정해야 함:
```bash
sudo mkdir -p /etc/systemd/system/jenkins.service.d
sudo tee /etc/systemd/system/jenkins.service.d/override.conf > /dev/null <<'EOF'
[Service]
Environment="JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64"
ExecStart=
ExecStart=/usr/lib/jvm/java-21-openjdk-amd64/bin/java -Djava.awt.headless=true -Djenkins.install.runSetupWizard=false -jar /usr/share/java/jenkins.war --webroot=/var/cache/jenkins/war --httpPort=8080
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now jenkins
```
`-Djenkins.install.runSetupWizard=false`로 초기 설정 마법사(브라우저 클릭)를 건너뛰고, 대신 관리자 계정을
Groovy 초기화 스크립트로 자동 생성함:
```bash
sudo mkdir -p /var/lib/jenkins/init.groovy.d
sudo tee /var/lib/jenkins/init.groovy.d/basic-security.groovy > /dev/null <<'EOF'
import jenkins.model.*
import hudson.security.*
def instance = Jenkins.getInstance()
def hudsonRealm = new HudsonPrivateSecurityRealm(false)
hudsonRealm.createAccount("admin", "<비밀번호>")
instance.setSecurityRealm(hudsonRealm)
def strategy = new FullControlOnceLoggedInAuthorizationStrategy()
strategy.setAllowAnonymousRead(false)
instance.setAuthorizationStrategy(strategy)
instance.save()
EOF
sudo chown jenkins:jenkins /var/lib/jenkins/init.groovy.d/basic-security.groovy
sudo systemctl restart jenkins
```
**관리자 비밀번호는 이 문서에 적지 않음** — 팀 내부적으로 별도 안전한 방법(1Password 등)으로 공유하거나,
잊어버리면 이 Groovy 스크립트를 다시 실행해서(다른 비밀번호로) 재설정하면 됨.

------------------------------------------------------------------------
## 3. 메모리 부족(OOM) 문제와 스왑 추가 (매우 중요 — 실제로 반복 발생했던 문제)
------------------------------------------------------------------------
`SoldeskProject1` VM은 **전체 메모리가 846MB**로 매우 작은 사양(B1s급 추정)인데, 여기에 MariaDB +
Redis(Docker) + Jenkins를 같이 띄우니 메모리가 계속 부족해서 **SSH 접속 자체가 응답 없이 멈추는 증상이
반복적으로 발생**했음(Jenkins 설치 중, 플러그인 설치 중, 첫 Maven 빌드 중 각각 한 번씩, 총 3차례 VM을
Azure Portal에서 강제 재시작해야 했음). TCP 포트는 열려 있는데 SSH 배너 교환 자체가 멈추는 증상이면
십중팔구 이 문제임.

**해결책 — 2GB 스왑 파일 추가**(디스크는 58GB 중 여유가 넉넉해서 비용 없이 바로 적용 가능):
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab   # 재부팅해도 유지되도록 등록
free -h   # Swap: 2.0Gi 확인
```
스왑 추가 후로는 빌드 중 메모리가 부족해도(`free -h`로 확인하면 Available이 수십 MB까지 떨어짐) VM이
완전히 멈추지 않고 스왑으로 버팀 — 다만 근본적으로 VM 사양이 작다는 점은 그대로라, **나중에 CPU/메모리
사용률이 계속 빠듯하면 VM 사양 자체를 올리는 것도 고려**(현재는 임시방편).

**VM을 재설치할 때 잊지 말 것**: 새 VM에는 스왑이 없으니, Jenkins 설치 전에 이 스왑 설정을 제일 먼저
해두는 게 안전함(설치 도중 멈추는 걸 원천 방지).

------------------------------------------------------------------------
## 4. Azure NSG 포트 규칙 (Jenkins 웹 UI + Webhook 수신용 8080, 앱 접속용 8081)
------------------------------------------------------------------------
Azure Portal에서 직접 추가(Azure CLI가 없는 환경에서도 가능한 방법):
1. 리소스 그룹 `Soldesk` → `SoldeskProject1-nsg` → **인바운드 보안 규칙** → **+ 추가**
2. **서비스**를 반드시 **"사용자 지정"(Custom)** 으로 바꿔야 포트를 직접 입력할 수 있음(기본값
   "DNS(TCP)" 등으로 되어 있으면 포트가 53으로 고정되는 함정이 있었음 — 실제로 겪은 실수)
3. 대상 포트 범위: `8080`, 프로토콜: TCP, 원본: Any, 작업: 허용, 이름: `Allow-Jenkins-8080`

Azure CLI가 있는 환경이면:
```powershell
az network nsg rule create `
  --resource-group Soldesk --nsg-name SoldeskProject1-nsg `
  --name Allow-Jenkins-8080 --priority 322 --access Allow --protocol Tcp `
  --direction Inbound --source-address-prefixes '*' --destination-port-ranges 8080
```

**앱 접속용 8081도 별도로 열어야 함** (2026-07-30 추가) — Deploy 단계(11장)까지 완료되어 앱이 VM에서
실제로 돌아가더라도, **NSG에 8081을 안 열어두면 외부에서 `http://<VM_IP>:8081/`로 접속이 안 됨**
(로컬 SSH 세션 안에서 `curl localhost:8081`은 되는데 외부에서는 타임아웃 — 실제로 겪은 문제, VM 방화벽이
아니라 Azure NSG 레벨에서 막혀있던 것이었음). 위와 동일한 절차로 대상 포트만 `8081`, 이름
`Allow-App-8081`, 우선순위 `323`으로 추가.

**추후 계획**: 도메인을 연결하게 되면 8081 대신 **80번 포트**(NSG에 이미 열려있음, VM 최초 생성 시
기본 인바운드 규칙)로 전환할 예정 — Nginx 등 리버스 프록시를 앞단에 두고 80(그리고 443)이 내부적으로
8081로 라우팅하도록 구성하면, 사용자는 포트 번호 없이 `http://api.eattyway.com/` 같은 깔끔한 주소로
접속 가능(`AI-서버-배포-아키텍처-계획.md`에서 논의 중인 서브도메인 프록시 구조와 같은 패턴). 이 경우
8081은 외부 노출 없이 VM 내부(Nginx→localhost:8081)에서만 쓰이게 되므로, 도메인 연결 시점에 NSG에서
`Allow-App-8081` 규칙을 다시 제거하는 것도 고려할 것(불필요한 직접 노출 최소화).

------------------------------------------------------------------------
## 5. Jenkins 플러그인 설치 (실제로 필요했던 것 — 하나라도 빠지면 파이프라인이 중간에 실패함)
------------------------------------------------------------------------
Jenkins 관리 → 플러그인 관리에서 설치(또는 `pluginManager/installNecessaryPlugins` API로 자동화 가능):
- `git` — Git 저장소 체크아웃
- `workflow-aggregator` — Pipeline(Jenkinsfile) 기능 전체
- `github`, `github-branch-source` — GitHub 연동/Webhook 트리거(`GitHubPushTrigger`)
- `pipeline-stage-view` — 파이프라인 단계별 시각화(선택이지만 유용)
- **`junit`** — Jenkinsfile의 `junit` 스텝(테스트 결과 리포트)에 필수. **이거 하나 빠뜨려서
  "No such DSL method 'junit'" 에러로 한 번 실패했었음** — workflow-aggregator에 자동으로 안 딸려오니
  꼭 따로 설치.

플러그인 설치/삭제 후에는 **반드시 Jenkins 재시작**(`safeRestart`)해야 반영됨.

------------------------------------------------------------------------
## 6. GitHub Webhook 등록 (실제로 완료됨)
------------------------------------------------------------------------
저장소 `soldesk-org/SoldeskProject2_Web` → Settings → Webhooks → Add webhook (또는 GitHub API
`POST /repos/{owner}/{repo}/hooks`로 자동화 가능, `repo` scope PAT면 충분):
- Payload URL: `http://72.155.72.187:8080/github-webhook/`
- Content type: `application/json`
- Event: `push`

실제로 main에 push 한 번 → 웹훅이 Jenkins에 알림 → 새 빌드가 자동으로 큐에 들어가는 것까지 라이브로
확인함(수동 "지금 빌드" 클릭 없이).

------------------------------------------------------------------------
## 7. Jenkins Credentials — 실제 앱 구동에 필요한 전체 목록
------------------------------------------------------------------------
`Project2/.env`에 있는 값 중 Spring 컨텍스트 로딩(테스트 포함)에 실제로 필요한 건 DB/Redis/JWT뿐만이
아니었음 — `PhoneCryptoService`(전화번호 암호화) 같은 `@Component`가 기동 시점에 즉시 생성되면서
`PHONE_AES_KEY` 등이 없으면 **컨텍스트 로딩 자체가 실패**함(`Project2ApplicationTests.contextLoads`
테스트가 이걸 검증). 그래서 결국 `.env`의 거의 전체 항목을 Jenkins Credentials(Secret text)로 등록해야
했음:

`soldesk-db-url`, `soldesk-db-username`, `soldesk-db-password`, `soldesk-jwt-secret`,
`soldesk-jwt-expiration-minutes`, `soldesk-jwt-refresh-expiration-days`,
`soldesk-jwt-refresh-expiration-hours-short`, `soldesk-redis-host`, `soldesk-redis-port`,
`soldesk-redis-password`, `soldesk-mail-username`, `soldesk-mail-app-password`,
`soldesk-mail-from-address`, `soldesk-phone-aes-key`, `soldesk-phone-hash-key`,
`soldesk-ppurio-account`, `soldesk-ppurio-auth-key`, `soldesk-ppurio-sender-number`,
`soldesk-business-verify-base-url`, `soldesk-kakao-client-id`, `soldesk-kakao-client-secret`,
`soldesk-kakao-redirect-uri`, `soldesk-naver-client-id`, `soldesk-naver-client-secret`,
`soldesk-naver-redirect-uri`, `soldesk-google-client-id`, `soldesk-google-client-secret`,
`soldesk-google-redirect-uri`, `soldesk-smbiz-store-service-key`, `soldesk-parking-data-service-key`,
`soldesk-seoul-parking-service-key`, `soldesk-ncp-maps-client-id`, `soldesk-ncp-maps-client-secret`,
`soldesk-ssl-key-store-password`, `soldesk-https-connector-enabled`

+ GitHub 저장소 접근용 `github-pat`(Username with password 타입, password 자리에 PAT — private repo라서
필수).

이 목록은 저장소 루트 `Jenkinsfile`의 Test 단계 `withCredentials` 블록과 정확히 짝을 이룸 — `.env`에
새 항목이 추가되고 그게 앱 기동에 필수라면, 여기에도 같이 추가해야 다음 빌드가 안 깨짐.

**주의**: 실제 시크릿 값은 이 문서나 Jenkinsfile에 절대 하드코딩하지 않음 — 전부 Credential ID로만 참조.

------------------------------------------------------------------------
## 8. Jenkins Job 생성
------------------------------------------------------------------------
1. 새 Item → Pipeline, 이름 `soldesk-web-ci`
2. Pipeline → Definition: `Pipeline script from SCM`
3. SCM: Git, Repository URL: `https://github.com/soldesk-org/SoldeskProject2_Web.git`,
   Credentials: `github-pat`, Branch Specifier: `*/main`, Script Path: `Jenkinsfile`(저장소 루트)
4. Build Triggers → "GitHub hook trigger for GITScm polling" 체크
5. Job의 `config.xml`을 API로 직접 만들 경우 **description에 한글을 넣으면 인코딩 깨진 문자가 섞여
   XML 파싱 에러(500, "An invalid XML character")가 날 수 있었음** — 자동화 스크립트로 만들 땐 영문
   설명 권장.

------------------------------------------------------------------------
## 9. 실제로 겪은 파이프라인 실패 → 수정 순서 (트러블슈팅 기록)
------------------------------------------------------------------------
같은 문제를 VM 재설치 후 또 겪지 않도록, 실제 겪었던 순서 그대로 기록:
1. `Unable to find Jenkinsfile` — main 브랜치에 Jenkinsfile 자체가 없었음(로컬 작업 브랜치가 origin과
   연결 안 된 상태였음). → Jenkinsfile을 실제로 main에 커밋/푸시.
2. `chmod: cannot access 'mvnw': No such file` — main에 Jenkinsfile만 있고 실제 Project2 애플리케이션
   코드가 없었음. → 전체 코드를 main에 커밋/푸시.
3. `PlaceholderResolutionException: Could not resolve placeholder 'PHONE_AES_KEY'` — 7장 문제, Jenkins
   Credentials에 DB/Redis/JWT만 등록해뒀던 게 부족했음 → `.env` 전체 항목 등록.
4. `No such DSL method 'junit'` — junit 플러그인 누락 → 설치 후 재시작.
5. `'Project2/target/*.jar' doesn't match anything` — war 패키징 프로젝트인데 jar 패턴으로 찾고 있었음
   → `archiveArtifacts` 패턴을 `*.war`로 수정.
6. 위 5개를 전부 고친 뒤 빌드 #6 SUCCESS, 이어서 실제 push → Webhook → 빌드 #7 자동 트리거 SUCCESS까지
   확인.
7. (Deploy 단계 추가 후, 같은 날) `Stage "Deploy" skipped due to when conditional` — Jenkinsfile에
   `when { branch 'main' }`을 걸어뒀는데, 이 Job이 Multibranch Pipeline이 아니라 Branch Specifier
   (`*/main`)로 고정된 일반 Pipeline Job이라 `env.BRANCH_NAME`이 채워지지 않아 조건이 항상 거짓으로
   평가됨 → 이 Job 자체가 main만 추적하므로 `when` 조건을 제거.
8. `ERROR: script returned exit code 1`로 빌드는 실패했는데 실제로는 war 복사/서비스 재시작까지는
   이미 성공한 상태였음 — 원인은 배포 스크립트 마지막 진단용 `sudo systemctl status ... --no-pager`가
   sudoers에 등록해둔 명령(`--no-pager` 옵션 없이 등록)과 정확히 일치하지 않아 비밀번호를 요구하며
   실패했고, 그게 스크립트의 마지막 명령이라 전체 종료 코드에 반영된 것 → 진단용 상태 확인 명령 자체를
   배포 스크립트에서 제거(배포 성공 여부는 필요하면 SSH로 직접 확인).
9. 앱이 재시작 직후 계속 크래시-재시작을 반복(`Caused by: java.io.FileNotFoundException:
   /opt/soldesk-app/./keystore/localhost.p12`) — 배포 `.env`에 `HTTPS_CONNECTOR_ENABLED=true`가
   그대로 들어가 있었는데, HTTPS용 자체 서명 인증서 파일(13.HTTPS-전송암호화 참고, 개인키라 git에
   커밋 안 됨)이 이 VM엔 없었기 때문 → 배포용 `.env`에서는 `HTTPS_CONNECTOR_ENABLED=false`를 하드코딩.
10. 위 3개(7~9)를 전부 고친 뒤 빌드 #10 SUCCESS, `curl http://localhost:8081/` → `HTTP 200`으로 실제
    배포된 앱이 정상 응답하는 것까지 라이브 확인.

------------------------------------------------------------------------
## 10. 브랜치 전략 (2026-07-30 확정 — GitFlow 유사 구조)
------------------------------------------------------------------------
```
feature/*  = 팀원 각자 기능 개발 브랜치 (develop에서 분기, PR로 develop에 병합)
develop    = 전체 기능 통합/통합테스트 브랜치
main       = 배포 전용 브랜치 (Jenkins가 이 브랜치를 추적, push되면 자동 Build+Test)
```
흐름: `feature/xxx` 개발 → PR(`feature/xxx → develop`) → develop에서 통합 테스트 →
PR(`develop → main`) → main 병합 → Jenkins가 자동으로 Build+Test+Archive+**Deploy**까지 실행(11장).

이 구조는 `docs/00.공통/GitHub-브랜치전략.md`(정합화 작업 이력)와
`docs/00.공통/Web-저장소-브랜치-구조.md`(feature 브랜치별 다이어그램 및 실제 상태)에 더 자세히
정리해둠.

------------------------------------------------------------------------
## 11. Deploy 단계 사전 준비 (VM에서 1회 수동 설정, 재구축 시 반드시 필요)
------------------------------------------------------------------------
Jenkins가 이 VM(`SoldeskProject1`) 위에서 직접 실행되고 있어서(agent any = 이 VM 자체), Deploy 단계는
별도 서버로 scp/ssh 하지 않고 **로컬 파일 복사 + systemd 재시작**으로 동작한다. 이게 동작하려면 VM에
아래 3가지가 미리 준비되어 있어야 한다(재구축 시 Jenkins 설치 이후, 아래 순서대로 1회만 실행).

### 11-1. 배포 디렉터리
```bash
sudo mkdir -p /opt/soldesk-app
sudo chown jenkins:jenkins /opt/soldesk-app
sudo chmod 750 /opt/soldesk-app
```

### 11-2. systemd 서비스 유닛
```bash
sudo tee /etc/systemd/system/soldesk-app.service > /dev/null << 'UNIT'
[Unit]
Description=Soldesk Web Application (Project2)
After=network.target mariadb.service docker.service

[Service]
Type=simple
User=jenkins
WorkingDirectory=/opt/soldesk-app
ExecStart=/usr/lib/jvm/java-17-openjdk-amd64/bin/java -jar /opt/soldesk-app/soldesk-app.war
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable soldesk-app
```
- `User=jenkins`로 실행 — 별도 배포 전용 계정을 만들지 않고, 이미 war 파일을 빌드/복사하는 jenkins
  계정이 그대로 앱도 실행하게 함(작은 팀 프로젝트 규모에 맞는 실용적 선택, 프로덕션 서비스라면 별도
  계정 분리를 검토할 것).
- `.env` 파일은 systemd `EnvironmentFile`을 쓰지 않는다 — 이 프로젝트의 `application.yml`이
  `spring.config.import: optional:file:.env[.properties]`로 **Spring Boot가 직접 `.env` 파일을
  읽도록** 되어 있어서, `WorkingDirectory`에 `.env`만 놓으면 별도 설정 없이 그대로 적용된다(로컬 개발
  환경과 완전히 동일한 방식).
- Java는 17을 명시적으로 지정(`java-17-openjdk-amd64`) — Jenkins 자체는 Java 21로 구동 중이지만(2장),
  이 앱은 로컬 개발 환경과 동일하게 17에서 실행한다.

### 11-3. jenkins 계정 sudoers 규칙 (systemctl 재시작 전용, 비밀번호 없이)
Jenkins 서비스 계정(`jenkins`)은 기본적으로 sudo 권한이 없다. war 복사(`/opt/soldesk-app`이 jenkins
소유라 sudo 불필요)까지는 문제없지만, **서비스 재시작만큼은 root 권한이 필요**해서 아래 규칙을 추가한다
— 전체 sudo가 아니라 정확히 이 4개 명령(옵션 없이, 인자까지 정확히 일치해야 매칭됨 — 9장 트러블슈팅 8번
참고)만 허용:
```bash
sudo tee /etc/sudoers.d/jenkins-deploy > /dev/null << 'SUDOERS'
jenkins ALL=(root) NOPASSWD: /usr/bin/systemctl restart soldesk-app.service, /usr/bin/systemctl start soldesk-app.service, /usr/bin/systemctl stop soldesk-app.service, /usr/bin/systemctl status soldesk-app.service
SUDOERS
sudo chmod 440 /etc/sudoers.d/jenkins-deploy
sudo visudo -c   # 문법 검증 — "parsed OK"가 나와야 함
```
**주의**: 이 규칙은 정확한 명령 문자열(인자 포함)만 매칭한다 — `systemctl status soldesk-app.service`는
되지만 `systemctl status soldesk-app.service --no-pager`처럼 옵션이 하나라도 붙으면 매칭 실패로
비밀번호를 요구한다(9장 트러블슈팅 8번에서 실제로 겪은 문제). Jenkinsfile Deploy 단계 스크립트에서
`systemctl restart`만 쓰고 그 뒤에 별도 `status` 확인은 넣지 않는 이유이기도 하다.

### 11-4. 확인
```bash
systemctl is-enabled soldesk-app   # "enabled" 나와야 함
```
이후 Jenkinsfile의 Deploy 단계(저장소 루트 `Jenkinsfile` 참고)가 매 `main` 빌드마다 war 복사 →
`.env` 재생성(Jenkins Credentials 값 기반) → `sudo systemctl restart soldesk-app.service`를 실행한다.
배포 후 확인은 `curl http://localhost:8081/`(또는 `sudo systemctl status soldesk-app` — VM에 직접
SSH로 들어가서 실행할 때는 `--no-pager` 옵션을 붙여도 무방, 사람이 직접 sudo 비밀번호를 입력하면 되므로).

------------------------------------------------------------------------
## 12. 참고 — 아직 안 된 것 / 알려진 한계
------------------------------------------------------------------------
- **VM 사양**: 846MB는 Jenkins+DB+Redis+Spring Boot 앱을 전부 계속 안정적으로 돌리기엔 작음 — 스왑으로
  버티고는 있지만 근본 해결은 아님. 배포 직후 앱 프로세스가 200~300MB대를 쓰는 것을 실측 확인함
  (`docs/00.공통/AI-서버-배포-아키텍처-계획.md`에서 다루는 추가 Python 서버 배포 여부를 검토할 때 이
  여유 용량을 반드시 고려할 것).
- **배포 계정 분리**: 앱이 `jenkins` 계정으로 실행됨 — CI 계정과 런타임 계정이 같은 건 작은 팀
  프로젝트라 감수한 단순화이지, 정석은 아님.
- **무중단 배포 아님**: `systemctl restart`는 기존 프로세스를 완전히 종료하고 새로 띄우는 방식이라,
  재시작 도중(수 초~수십 초) 짧은 다운타임이 발생한다 — 블루/그린 배포 등은 이 프로젝트 규모에서는
  과함으로 판단해 적용하지 않음.
