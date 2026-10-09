package com.xingwang.touhu.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * JWT 工具：签发与校验登录令牌。
 * 原理：登录成功后，服务端用密钥把「用户ID + 角色 + 过期时间」签名成一个字符串（令牌）发给前端；
 * 之后前端每次请求带上它，服务端验签通过即认为已登录 —— 无需在服务器存会话，天然支持多人并发。
 */
@Component
public class JwtUtil {

  private final SecretKey key;
  private final long expireMillis;

  public JwtUtil(@Value("${touhu.jwt.secret}") String secret,
                 @Value("${touhu.jwt.expire-days}") long expireDays) {
    this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    this.expireMillis = expireDays * 24 * 3600 * 1000;
  }

  /** 签发令牌：subject 存用户ID，role 存角色 */
  public String createToken(Long userId, String role) {
    Date now = new Date();
    return Jwts.builder()
        .subject(String.valueOf(userId))
        .claim("role", role)
        .issuedAt(now)
        .expiration(new Date(now.getTime() + expireMillis))
        .signWith(key)
        .compact();
  }

  /** 校验并解析令牌；令牌无效或过期会抛异常（由拦截器统一处理） */
  public Claims parse(String token) {
    return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
  }
}
