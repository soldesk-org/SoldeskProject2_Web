package com.foodtrip.foodsearch.common.config;

import java.io.File;

import org.apache.catalina.connector.Connector;
import org.apache.tomcat.util.net.SSLHostConfig;
import org.apache.tomcat.util.net.SSLHostConfigCertificate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.tomcat.servlet.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Configuration;

// 로그인/회원정보수정 등에서 비밀번호·전화번호가 평문 HTTP로만 전송되던 문제 해결(13.HTTPS-전송암호화).
// 기존 HTTP 커넥터(server.port, 8081)는 그대로 유지한다 — 소셜로그인(06) 콜백 URL이 각 플랫폼 개발자
// 콘솔에 http://localhost:8081/oauth/{provider}로 이미 등록되어 있어, 그 포트의 프로토콜을 바꾸면 그
// 콜백이 전부 깨진다(001-02 2-1장 참고). 대신 같은 애플리케이션에 TLS 전용 커넥터를 하나 더 추가한다.
@Configuration
public class HttpsConnectorConfig implements WebServerFactoryCustomizer<TomcatServletWebServerFactory> {

    @Value("${https-connector.enabled:false}")
    private boolean enabled;

    @Value("${https-connector.port:8443}")
    private int port;

    @Value("${https-connector.key-store:./keystore/localhost.p12}")
    private String keyStore;

    @Value("${https-connector.key-store-password:}")
    private String keyStorePassword;

    @Value("${https-connector.key-store-type:PKCS12}")
    private String keyStoreType;

    @Value("${https-connector.key-alias:localhost}")
    private String keyAlias;

    @Override
    public void customize(TomcatServletWebServerFactory factory) {
        if (!enabled) {
            return;
        }

        Connector connector = new Connector(TomcatServletWebServerFactory.DEFAULT_PROTOCOL);
        connector.setPort(port);
        connector.setScheme("https");
        connector.setSecure(true);
        connector.setProperty("SSLEnabled", "true");

        SSLHostConfig sslHostConfig = new SSLHostConfig();
        SSLHostConfigCertificate certificate =
                new SSLHostConfigCertificate(sslHostConfig, SSLHostConfigCertificate.Type.UNDEFINED);
        certificate.setCertificateKeystoreFile(new File(keyStore).getAbsolutePath());
        certificate.setCertificateKeystorePassword(keyStorePassword);
        certificate.setCertificateKeystoreType(keyStoreType);
        certificate.setCertificateKeyAlias(keyAlias);
        sslHostConfig.addCertificate(certificate);
        connector.addSslHostConfig(sslHostConfig);

        factory.addAdditionalConnectors(connector);
    }
}
