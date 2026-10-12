package com.xingwang.touhu.auth;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.xingwang.touhu.auth.dto.LoginRequest;
import com.xingwang.touhu.auth.dto.LoginResponse;
import com.xingwang.touhu.auth.dto.RegisterRequest;
import com.xingwang.touhu.auth.dto.UserVO;
import com.xingwang.touhu.common.BizException;
import com.xingwang.touhu.user.User;
import com.xingwang.touhu.user.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 认证服务：注册、登录、查询当前用户。
 * 密码用 BCrypt 哈希存储 —— 即使数据库泄露，攻击者也拿不到明文密码。
 * 登录带简单限流：同一账号连续失败 5 次锁定 10 分钟，防口令爆破。
 */
@Service
@RequiredArgsConstructor // Lombok：自动生成带 final 字段的构造器，Spring 自动注入
public class AuthService {

  /** 登录失败锁定阈值与时长 */
  private static final int MAX_FAILS = 5;
  private static final long LOCK_MILLIS = 10 * 60 * 1000;

  private final UserMapper userMapper;
  private final JwtUtil jwtUtil;
  /** Spring 自带的 BCrypt 实现，无状态可直接 new */
  private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

  /** 登录失败计数（内存态，重启清零；100 人内部活动规模足够） */
  private record FailState(int fails, long lockUntil) {
  }

  private final Map<String, FailState> loginFails = new ConcurrentHashMap<>();

  /** 注册：账号唯一，默认角色 PLAYER */
  public UserVO register(RegisterRequest req) {
    Long exists = userMapper.selectCount(
        new LambdaQueryWrapper<User>().eq(User::getUsername, req.username()));
    if (exists > 0) {
      throw new BizException("该账号已被注册");
    }
    User user = new User();
    user.setUsername(req.username());
    user.setPasswordHash(passwordEncoder.encode(req.password()));
    user.setDisplayName(req.displayName());
    user.setDepartment(req.department());
    user.setRole("PLAYER");
    user.setStatus(1);
    userMapper.insert(user);
    return toVO(user);
  }

  /** 登录：校验密码，签发 JWT；同一账号连续失败 5 次锁定 10 分钟 */
  public LoginResponse login(LoginRequest req) {
    long now = System.currentTimeMillis();
    FailState prev = loginFails.get(req.username());
    if (prev != null && prev.lockUntil() > now) {
      long minutes = (prev.lockUntil() - now) / 60_000 + 1;
      throw new BizException(429, "登录失败次数过多，请约 " + minutes + " 分钟后再试");
    }

    User user = userMapper.selectOne(
        new LambdaQueryWrapper<User>().eq(User::getUsername, req.username()));
    if (user == null || !passwordEncoder.matches(req.password(), user.getPasswordHash())) {
      // 账号或密码错误用同一文案，避免泄露「账号是否存在」
      loginFails.compute(req.username(), (k, old) -> {
        // 锁定已过期则重新计数；未锁定则累加，达到阈值即锁定
        int fails = (old == null || (old.lockUntil() > 0 && old.lockUntil() <= now))
            ? 1 : old.fails() + 1;
        long lockUntil = fails >= MAX_FAILS ? now + LOCK_MILLIS : 0;
        return new FailState(fails, lockUntil);
      });
      throw new BizException(401, "账号或密码错误");
    }
    if (user.getStatus() != 1) {
      throw new BizException(403, "账号已停用，请联系管理员");
    }
    loginFails.remove(req.username()); // 登录成功清零失败计数
    user.setLastLoginAt(LocalDateTime.now());
    userMapper.updateById(user);
    return new LoginResponse(
        jwtUtil.createToken(user.getId(), user.getRole()),
        user.getId(), user.getDisplayName(), user.getRole());
  }

  /** 查询当前登录用户 */
  public UserVO me(Long userId) {
    User user = userMapper.selectById(userId);
    if (user == null) {
      throw new BizException(401, "登录已失效，请重新登录");
    }
    return toVO(user);
  }

  private UserVO toVO(User user) {
    return new UserVO(user.getId(), user.getUsername(), user.getDisplayName(),
        user.getDepartment(), user.getRole());
  }
}
