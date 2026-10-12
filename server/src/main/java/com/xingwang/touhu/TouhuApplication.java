package com.xingwang.touhu;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

/**
 * 应用入口：相当于前端的 main.js。
 * - @SpringBootApplication：开启 Spring Boot 自动配置
 * - @MapperScan：告诉 MyBatis-Plus 去哪些包里找数据库 Mapper 接口
 * - @EnableScheduling：开启定时任务（大清洗用）
 */
@SpringBootApplication
@EnableScheduling
@MapperScan({"com.xingwang.touhu.**.mapper", "com.xingwang.touhu.user"})
public class TouhuApplication {

  /** 全业务统一时区：排行榜自然周分界、大清洗 cron、对局起止时间都以东八区为准 */
  public static final String BIZ_ZONE = "Asia/Shanghai";

  public static void main(String[] args) {
    TimeZone.setDefault(TimeZone.getTimeZone(BIZ_ZONE));
    SpringApplication.run(TouhuApplication.class, args);
  }
}
