# Web 저장소(SoldeskProject2_Web) 브랜치 구조

## 1. 기본 전략

```
feature/* = 각자 만든 기능을 올리고 공유하는 곳
develop   = 모든 기능을 합치는 개발 통합본
main      = 실제 서비스에 배포하는 최종본
```

```
develop
  └─ feature/login 생성
       └─ 기능 개발 및 push
            └─ PR: feature/login → develop
                 └─ 통합 테스트
                      └─ PR: develop → main
                           └─ VM 자동 배포
```

## 2. Web 저장소 feature 브랜치 구조

```
develop
  ├─ feature/web-ai-api-integration 생성
  │    └─ AI API 연동 기능 개발 및 push
  │         └─ PR: feature/web-ai-api-integration → develop
  │
  ├─ feature/web-auth-member 생성
  │    └─ 회원 인증 기능 개발 및 push
  │         └─ PR: feature/web-auth-member → develop
  │
  ├─ feature/web-frontend-pages 생성
  │    └─ 프론트엔드 페이지 개발 및 push
  │         └─ PR: feature/web-frontend-pages → develop
  │
  ├─ feature/web-map-responsive 생성
  │    └─ 지도 반응형 기능 개발 및 push
  │         └─ PR: feature/web-map-responsive → develop
  │
  ├─ feature/web-notion-test 생성
  │    └─ 노션 테스트 기능 개발 및 push
  │         └─ PR: feature/web-notion-test → develop
  │
  └─ feature/web-restaurant-search 생성
       └─ 음식점 검색 기능 개발 및 push
            └─ PR: feature/web-restaurant-search → develop

모든 기능을 develop에서 통합 및 테스트
  └─ PR: develop → main
       └─ main 병합
            └─ VM에 Web 서비스 자동 배포
```

## 3. 2026-07-30 시점 각 브랜치의 실제 상태

| 브랜치 | 실제 상태 |
|---|---|
| `feature/web-frontend-pages` | Yunj3 팀원이 2026-07-30에 실제 작업 → **PR #2로 develop에 병합 완료** |
| `feature/web-map-responsive` | 장우진 팀원이 2026-07-30에 실제 작업(음BTI 추천 결과/검색 데이터 확장) → **PR #3으로 develop에 병합 완료** |
| `feature/web-ai-api-integration` | 2026-07-16 생성 후 방치되어 있던 빈 브랜치를 **develop 최신 코드로 강제 업데이트**(2026-07-30) — 앞으로 이 기능을 다시 작업할 사람은 이 브랜치에서 바로 이어서 개발 가능 |
| `feature/web-auth-member` | 위와 동일 — develop 최신 코드로 강제 업데이트 완료 |
| `feature/web-restaurant-search` | 위와 동일 — develop 최신 코드로 강제 업데이트 완료 |
| `feature/web-notion-test` | 개인 테스트용으로 만든 브랜치(2026-07-16)라 그대로 둠 — 최신화 대상 아님 |

**결론**: `web-notion-test`를 제외한 5개 feature 브랜치 + `develop` + `main`이 전부 같은 최신 코드를 담고 있다.
`web-frontend-pages`/`web-map-responsive`는 팀원의 실제 작업이 PR로 반영된 것이고, 나머지 3개는 옛날
빈 뼈대 상태였던 걸 최신 코드로 강제 동기화한 것 — 이제부터 그 기능을 이어서 개발할 사람은 각자
브랜치에서 바로 작업을 시작하면 된다. 자세한 배경은 [GitHub-브랜치전략.md](GitHub-브랜치전략.md) 참고.

## 4. develop → main

`develop`과 `main`은 2026-07-30 기준 완전히 동일한 커밋을 가리킨다(정합화 이력은
[GitHub-브랜치전략.md](GitHub-브랜치전략.md) 2장 참고). 이 시점부터는 위 1~2장 구조대로
새 feature 브랜치 → develop PR → main PR 흐름을 따른다.
