# GitHub 브랜치 전략 (Web 저장소: soldesk-org/SoldeskProject2_Web)

## 1. 확정된 전략 (2026-07-30)

```
feature/*  = 각자 만든 기능을 올리고 공유하는 곳
develop    = 모든 기능을 합치는 개발 통합본
main       = 실제 서비스에 배포하는 최종본 (Jenkins가 추적, VM 자동 배포 대상)
```

흐름:

```
develop
  └─ feature/xxx 생성
       └─ 기능 개발 및 push
            └─ PR: feature/xxx → develop
                 └─ 통합 테스트
                      └─ PR: develop → main
                           └─ VM 자동 배포 (Jenkins, main 브랜치 추적)
```

Jenkins는 `main` 브랜치만 추적한다(`Jenkinsfile`의 Deploy 스테이지가 `when { branch 'main' }`로
스코프되어 있음). `develop`/`feature/*`는 Jenkins 빌드 대상이 아니다 — 필요하면 별도 Job으로
분리해서 추가할 수 있으나 2026-07-30 시점엔 미구성.

## 2. main/develop 최초 정합화 작업 이력 (2026-07-30)

이 프로젝트는 로컬 저장소(`master` 브랜치)가 실제 커밋 이력 없이 관리되어 왔고, GitHub 원격에는
`develop`/`main`/`feature/*`가 이미 존재했지만 로컬 작업 내용과 크게 어긋나 있었다. 2026-07-30
CI/CD 구축 작업 중 다음을 실행:

1. `main`에 실제 애플리케이션 전체 코드(351개 파일)를 이 세션 작업 내용 기준으로 새로 커밋
   (`feat: 프론트엔드 통합 및 백엔드 전체 기능 반영 (main 배포 브랜치 초기화)`), 이어서
   Jenkinsfile 관련 수정 커밋 다수(env var 주입, war 아카이브 패턴 수정 등) 추가.
2. `feature/web-frontend-pages`, `feature/web-map-responsive`는 실제로 develop에 없던
   고유 작업이 있어 PR로 `develop`에 먼저 병합(PR #2, #3).
3. 이후 `develop → main` PR을 시도한 결과, 두 브랜치가 실질적으로 다른 이력에서 갈라져 있어
   73개 파일이 충돌하는 상태(`mergeable_state: dirty`)임을 확인. draft PR로 진단만 하고 병합은
   하지 않음.
4. 사용자 결정: **"main의 현재 내용(이 세션에서 푸시한 것)을 기준으로 확정"** — `develop`을
   `main`과 완전히 같은 커밋(`4012347...`)으로 강제 정렬(`git push origin develop --force`).
   `main`은 이 세션에서 로컬 작업 트리 전체를 한 번에 커밋한 스냅샷이라, 개별 feature 브랜치들의
   실제 코드 내용은 이미 그 안에 포함되어 있다고 판단(파일 단위 내용 기준. git 커밋 이력상의
   부모-자식 관계는 보존되지 않음).

**결과**: 2026-07-30 시점 `develop`과 `main`은 동일한 커밋을 가리킨다. 이 시점부터 위 1장의
정상 흐름(feature → develop → main)을 지킨다.

## 3. feature/* 브랜치 현황 (2026-07-30 기준)

| 브랜치 | 상태 |
|---|---|
| `feature/web-frontend-pages` | 고유 작업 있었음 → PR #2로 develop에 병합 완료 |
| `feature/web-map-responsive` | 고유 작업 있었음 → PR #3으로 develop에 병합 완료 |
| `feature/web-ai-api-integration` | 과거 작업, 내용은 main의 전체 스냅샷에 이미 반영됨 |
| `feature/web-auth-member` | 과거 작업, 내용은 main의 전체 스냅샷에 이미 반영됨 |
| `feature/web-restaurant-search` | 과거 작업, 내용은 main의 전체 스냅샷에 이미 반영됨 |
| `feature/web-notion-test` | 과거 작업(테스트 용도), 내용은 main의 전체 스냅샷에 이미 반영됨 |

기존 6개 feature 브랜치는 삭제하지 않고 남겨둠 — 이후 각 기능을 다시 손볼 때는 `develop`에서
새로 분기해서 사용한다(과거 브랜치를 그대로 재사용하면 위와 같은 이력 불일치가 다시 발생할 수 있음).

## 4. 앞으로 새 기능을 추가할 때

```bash
git checkout develop
git pull origin develop
git checkout -b feature/web-새기능이름
# 작업 및 커밋
git push origin feature/web-새기능이름
# GitHub에서 feature/web-새기능이름 → develop PR 생성 → 리뷰/통합테스트 → 병합
# 배포할 준비가 되면 develop → main PR 생성 → 병합 → Jenkins가 자동으로 빌드/테스트
```

`develop → main` PR을 만들기 전에 반드시 GitHub Compare API 또는 PR 생성 화면에서
`mergeable_state`를 확인해서 충돌이 없는지 먼저 점검할 것 — 2번의 사고(73개 파일 충돌)를
반복하지 않기 위함.
