# 后端镜像：只装 Java 运行时的官方镜像 + 可执行 jar
# 基础镜像为多架构镜像，在 ARM 机器上构建/拉取时自动获得 ARM 版本
FROM eclipse-temurin:17-jre

WORKDIR /app

# 通配符匹配，版本号变化时无需改这里
COPY target/touhu-server-*.jar app.jar

# 外挂配置目录（挂载点）：
# 将自定义 application.yml 挂载到 /app/config/ 即可覆盖 jar 内默认配置，
# 例如：docker run -v /宿主机/config:/app/config ...
# 或在 docker-compose.yml 中配置 volumes
EXPOSE 8080

# optional: 前缀保证不挂载配置时也能正常启动（回退到 jar 内配置 + 环境变量）
ENTRYPOINT ["java", "-jar", "app.jar", "--spring.config.additional-location=optional:file:/app/config/"]
