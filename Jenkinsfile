// 잇티웨이(SoldeskProject2_Web) CI 파이프라인
// 브랜치 전략(2026-07-30 확정): feature/* = 팀원별 기능 개발, develop = 템플릿/통합,
// main = 배포 전용(이 Jenkins가 추적하는 브랜치, VM으로 CI/CD 배포).
// 이 시점에는 실제 배포 스크립트가 정해지지 않아 Build+Test까지만 자동화하고,
// Deploy 단계는 뼈대만 남겨둔다(주석 처리) — 배포 방식이 정해지면 그때 채운다.
// 소스는 저장소 루트, Spring Boot 프로젝트는 Project2/ 하위(Gradle이 아니라 Maven, pom.xml/mvnw 사용).
pipeline {
    agent any

    options {
        // 같은 브랜치의 이전 빌드가 남아있으면 새 빌드 시작 시 취소(빌드 큐 낭비 방지)
        disableConcurrentBuilds()
        // 콘솔 로그가 무한정 쌓이지 않도록 최근 20개 빌드만 보관
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    environment {
        PROJECT_DIR = 'Project2'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build') {
            steps {
                dir("${PROJECT_DIR}") {
                    sh 'chmod +x mvnw'
                    // 테스트는 별도 스테이지에서 실행하므로 빌드 단계에서는 건너뛴다
                    sh './mvnw clean package -DskipTests'
                }
            }
        }

        stage('Test') {
            steps {
                dir("${PROJECT_DIR}") {
                    // application.yml의 DB_URL 등은 .env가 아니라 실제 환경변수로 주입해야 하므로,
                    // Jenkins Credentials에 등록한 값들을 여기서 환경변수로 바인딩한다(값은 하드코딩 금지).
                    withCredentials([
                        string(credentialsId: 'soldesk-db-url', variable: 'DB_URL'),
                        string(credentialsId: 'soldesk-db-username', variable: 'DB_USERNAME'),
                        string(credentialsId: 'soldesk-db-password', variable: 'DB_PASSWORD'),
                        string(credentialsId: 'soldesk-jwt-secret', variable: 'JWT_SECRET'),
                        string(credentialsId: 'soldesk-jwt-expiration-minutes', variable: 'JWT_EXPIRATION_MINUTES'),
                        string(credentialsId: 'soldesk-jwt-refresh-expiration-days', variable: 'JWT_REFRESH_EXPIRATION_DAYS'),
                        string(credentialsId: 'soldesk-jwt-refresh-expiration-hours-short', variable: 'JWT_REFRESH_EXPIRATION_HOURS_SHORT'),
                        string(credentialsId: 'soldesk-redis-host', variable: 'REDIS_HOST'),
                        string(credentialsId: 'soldesk-redis-port', variable: 'REDIS_PORT'),
                        string(credentialsId: 'soldesk-redis-password', variable: 'REDIS_PASSWORD'),
                        string(credentialsId: 'soldesk-mail-username', variable: 'MAIL_USERNAME'),
                        string(credentialsId: 'soldesk-mail-app-password', variable: 'MAIL_APP_PASSWORD'),
                        string(credentialsId: 'soldesk-mail-from-address', variable: 'MAIL_FROM_ADDRESS'),
                        string(credentialsId: 'soldesk-phone-aes-key', variable: 'PHONE_AES_KEY'),
                        string(credentialsId: 'soldesk-phone-hash-key', variable: 'PHONE_HASH_KEY'),
                        string(credentialsId: 'soldesk-ppurio-account', variable: 'PPURIO_ACCOUNT'),
                        string(credentialsId: 'soldesk-ppurio-auth-key', variable: 'PPURIO_AUTH_KEY'),
                        string(credentialsId: 'soldesk-ppurio-sender-number', variable: 'PPURIO_SENDER_NUMBER'),
                        string(credentialsId: 'soldesk-business-verify-base-url', variable: 'BUSINESS_VERIFY_BASE_URL'),
                        string(credentialsId: 'soldesk-kakao-client-id', variable: 'KAKAO_CLIENT_ID'),
                        string(credentialsId: 'soldesk-kakao-client-secret', variable: 'KAKAO_CLIENT_SECRET'),
                        string(credentialsId: 'soldesk-kakao-redirect-uri', variable: 'KAKAO_REDIRECT_URI'),
                        string(credentialsId: 'soldesk-naver-client-id', variable: 'NAVER_CLIENT_ID'),
                        string(credentialsId: 'soldesk-naver-client-secret', variable: 'NAVER_CLIENT_SECRET'),
                        string(credentialsId: 'soldesk-naver-redirect-uri', variable: 'NAVER_REDIRECT_URI'),
                        string(credentialsId: 'soldesk-google-client-id', variable: 'GOOGLE_CLIENT_ID'),
                        string(credentialsId: 'soldesk-google-client-secret', variable: 'GOOGLE_CLIENT_SECRET'),
                        string(credentialsId: 'soldesk-google-redirect-uri', variable: 'GOOGLE_REDIRECT_URI'),
                        string(credentialsId: 'soldesk-smbiz-store-service-key', variable: 'SMBIZ_STORE_SERVICE_KEY'),
                        string(credentialsId: 'soldesk-parking-data-service-key', variable: 'PARKING_DATA_SERVICE_KEY'),
                        string(credentialsId: 'soldesk-seoul-parking-service-key', variable: 'SEOUL_PARKING_SERVICE_KEY'),
                        string(credentialsId: 'soldesk-ncp-maps-client-id', variable: 'NCP_MAPS_CLIENT_ID'),
                        string(credentialsId: 'soldesk-ncp-maps-client-secret', variable: 'NCP_MAPS_CLIENT_SECRET'),
                        string(credentialsId: 'soldesk-ssl-key-store-password', variable: 'SSL_KEY_STORE_PASSWORD'),
                        string(credentialsId: 'soldesk-https-connector-enabled', variable: 'HTTPS_CONNECTOR_ENABLED'),
                    ]) {
                        sh './mvnw test'
                    }
                }
            }
            post {
                always {
                    junit testResults: "${PROJECT_DIR}/target/surefire-reports/*.xml", allowEmptyResults: true
                }
            }
        }

        stage('Archive') {
            steps {
                // 이 프로젝트는 war 패키징(pom.xml)이라 산출물이 .jar가 아니라 .war로 나온다.
                archiveArtifacts artifacts: "${PROJECT_DIR}/target/*.war", fingerprint: true
            }
        }

        // ---------------------------------------------------------------
        // Deploy 단계 (2026-07-30 기준 배포 대상 미확정 — 뼈대만 남겨둠)
        // 배포 방식이 정해지면 이 stage의 주석을 풀고 실제 대상에 맞게 채운다.
        // 참고: docs/00.공통/CI-CD-Jenkins-구축-가이드.md 5장
        // ---------------------------------------------------------------
        // stage('Deploy') {
        //     when { branch 'main' }
        //     steps {
        //         sh """
        //             scp -o StrictHostKeyChecking=no ${PROJECT_DIR}/target/*.jar deploy@<VM_IP>:/home/deploy/soldesk-app.jar
        //             ssh -o StrictHostKeyChecking=no deploy@<VM_IP> 'sudo systemctl restart soldesk-app.service'
        //         """
        //     }
        // }
    }

    post {
        failure {
            echo '빌드 또는 테스트 실패 — Slack/이메일 알림 연동 지점(미구성)'
        }
    }
}
