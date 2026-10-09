package com.xingwang.touhu.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xingwang.touhu.auth.JwtUtil;
import com.xingwang.touhu.auth.UserContext;
import com.xingwang.touhu.common.Result;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 登录拦截器：每个请求进入 Controller 之前执行。
 * 1. 从 Header 取 Authorization: Bearer <token>，验签解析出用户ID与角色，写入 UserContext
 * 2. 无令牌/令牌过期 → 401
 * 3. 方法标了 @RequireAdmin 但用户不是管理员 → 403
 */
@Component
@RequiredArgsConstructor
public class AuthInterceptor implements HandlerInterceptor {

  private final JwtUtil jwtUtil;
  private final ObjectMapper objectMapper = new ObjectMapper();

  @Override
  public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
      throws Exception {
    // 非 Controller 方法（如静态资源）直接放行
    if (!(handler instanceof HandlerMethod handlerMethod)) {
      return true;
    }

    String header = request.getHeader("Authorization");
    if (header == null || !header.startsWith("Bearer ")) {
      writeError(response, 401, "未登录或登录已过期");
      return false;
    }
    try {
      Claims claims = jwtUtil.parse(header.substring(7));
      UserContext.set(Long.valueOf(claims.getSubject()), claims.get("role", String.class));
    } catch (Exception e) {
      writeError(response, 401, "未登录或登录已过期");
      return false;
    }

    if (handlerMethod.hasMethodAnnotation(RequireAdmin.class) && !UserContext.isAdmin()) {
      writeError(response, 403, "需要管理员权限");
      return false;
    }
    return true;
  }

  @Override
  public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                              Object handler, Exception ex) {
    // 请求结束清理 ThreadLocal，防止线程池复用导致串号
    UserContext.clear();
  }

  private void writeError(HttpServletResponse response, int httpStatus, String message)
      throws Exception {
    response.setStatus(httpStatus);
    response.setContentType("application/json;charset=UTF-8");
    response.getWriter().write(objectMapper.writeValueAsString(Result.error(httpStatus, message)));
  }
}
