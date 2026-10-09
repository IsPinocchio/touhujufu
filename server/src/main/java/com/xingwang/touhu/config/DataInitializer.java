package com.xingwang.touhu.config;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.xingwang.touhu.user.User;
import com.xingwang.touhu.user.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * 启动初始化：服务每次启动时检查并创建内置管理员账号。
 * 默认账号 admin / admin123 —— 上线后请立即登录修改或停用！
 * 之所以在 Java 里创建而不是写进 schema.sql：BCrypt 哈希必须程序实时生成，写死容易出错。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

  private final UserMapper userMapper;
  private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

  @Override
  public void run(String... args) {
    Long exists = userMapper.selectCount(
        new LambdaQueryWrapper<User>().eq(User::getUsername, "admin"));
    if (exists == 0) {
      User admin = new User();
      admin.setUsername("admin");
      admin.setPasswordHash(passwordEncoder.encode("admin123"));
      admin.setDisplayName("管理员");
      admin.setRole("ADMIN");
      admin.setStatus(1);
      userMapper.insert(admin);
      log.info("已创建内置管理员账号 admin（初始密码 admin123，请尽快修改）");
    }
  }
}
