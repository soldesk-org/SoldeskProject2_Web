package com.foodtrip.foodsearch.mail.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import com.foodtrip.foodsearch.common.exception.CustomException;
import com.foodtrip.foodsearch.common.exception.ErrorCode;

import jakarta.mail.internet.MimeMessage;

@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final JavaMailSender mailSender;

    // spring.mail.username은 SMTP 인증 아이디(Daum은 도메인 없는 "eattyway")라 From 헤더에 못 쓴다.
    // 실제 표시할 메일 주소는 별도 프로퍼티로 관리한다.
    @Value("${mail-sender.from-address}")
    private String fromAddress;

    public MailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendVerificationCode(String toEmail, String code) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "UTF-8");
            helper.setFrom("Eattyway <" + fromAddress + ">");
            helper.setTo(toEmail);
            helper.setSubject("[Eattyway] 이메일 인증번호 안내");
            helper.setText(buildHtml(code), true);
            mailSender.send(mimeMessage);
        } catch (MailException | jakarta.mail.MessagingException e) {
            log.error("메일 발송 실패 (to={})", toEmail, e);
            throw new CustomException(ErrorCode.MAIL_SEND_FAIL);
        }
    }

    public void sendPasswordResetMail(String toEmail, String resetUrl) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "UTF-8");
            helper.setFrom("Eattyway <" + fromAddress + ">");
            helper.setTo(toEmail);
            helper.setSubject("[Eattyway] 비밀번호 재설정 안내");
            helper.setText(buildResetHtml(resetUrl), true);
            mailSender.send(mimeMessage);
        } catch (MailException | jakarta.mail.MessagingException e) {
            log.error("메일 발송 실패 (to={})", toEmail, e);
            throw new CustomException(ErrorCode.MAIL_SEND_FAIL);
        }
    }

    private String buildHtml(String code) {
        return "요청하신 이메일 인증번호는 [<b>" + code + "</b>] 입니다.<br>"
                + "인증번호는 발급 후 5분간 유효합니다.";
    }

    private String buildResetHtml(String resetUrl) {
        return "아래 링크에서 비밀번호를 재설정해주세요.<br>"
                + "<a href=\"" + resetUrl + "\">" + resetUrl + "</a><br>"
                + "이 링크는 발급 후 1시간 동안만 유효합니다.";
    }
}
