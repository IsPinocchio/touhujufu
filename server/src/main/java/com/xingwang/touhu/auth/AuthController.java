package com.xingwang.touhu.auth;

import com.xingwang.touhu.auth.dto.LoginRequest;
import com.xingwang.touhu.auth.dto.LoginResponse;
import com.xingwang.touhu.auth.dto.RegisterRequest;
import com.xingwang.touhu.auth.dto.UserVO;
import com.xingwang.touhu.common.Result;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 认证接口：
 *   POST /api/auth/register  注册
 *   POST /api/auth/login     登录
 *   GET  /api/auth/me        当前登录用户（需带令牌）
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

  private final AuthService authService;

  @PostMapping("/register")
  public Result<UserVO> register(@Valid @RequestBody RegisterRequest req) {
    return Result.ok(authService.register(req));
  }

  @PostMapping("/login")
  public Result<LoginResponse> login(@Valid @RequestBody LoginRequest req) {
    return Result.ok(authService.login(req));
  }

  @GetMapping("/me")
  public Result<UserVO> me() {
    // 走到这里说明已通过拦截器校验，UserContext 里一定有用户ID
    return Result.ok(authService.me(UserContext.getUserId()));
  }
}
