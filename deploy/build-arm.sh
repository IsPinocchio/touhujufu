#!/usr/bin/env bash
# ============================================================
# ARM 离线部署包构建脚本（在 Windows Git Bash 中执行，需先启动 Docker Desktop）
#
# 产出 deploy/images/ 下三个 ARM64 镜像 tar 包，
# 连同 docker-compose.yml、.env.example、deploy/ 目录一起拷贝给部署同事：
#   1. docker load -i deploy/images/xxx.tar （导入三个 tar）
#   2. 复制 .env.example 为 .env 填写密码
#   3. docker compose up -d
#
# 注意：执行前请关闭 VSCode（其 Java 插件会锁定 target/*.jar 导致 mvn clean 失败）
# ============================================================
set -e
cd "$(dirname "$0")/.." # 回到项目根目录

echo "==> [1/4] 构建后端 jar"
(cd server && mvn -q clean package -DskipTests)

echo "==> [2/4] 构建前端 dist"
npm run build

echo "==> [3/4] 构建 ARM64 镜像并直接导出为 docker 格式 tar"
# 说明：
# - --provenance=false：buildx 默认附加的溯源清单会破坏导出，必须关掉
# - 用 --output type=docker,dest=... 直接产出 tar，而不是 --load + docker save：
#   镜像仓库加速器可能拉回残缺的清单索引，导致 docker save 报
#   "unable to create manifests file: NotFound"，直接导出可绕开本地镜像库
# - -t 必须带上，否则 tar 里没有镜像名标签，docker load 后是 <none>
docker buildx build --platform linux/arm64 --provenance=false \
  -t touhu-server:1.0.0 \
  --output type=docker,dest=deploy/images/touhu-server-1.0.0-arm64.tar ./server

docker buildx build --platform linux/arm64 --provenance=false \
  -t touhu-web:1.0.0 \
  --output type=docker,dest=deploy/images/touhu-web-1.0.0-arm64.tar .

# MySQL 同理：用一个仅含 FROM 的临时 Dockerfile 套一层导出，规避 docker save 问题
TMPDIR_MYSQL="$(mktemp -d)"
printf 'FROM mysql:8.4\n' > "$TMPDIR_MYSQL/Dockerfile"
docker buildx build --platform linux/arm64 --provenance=false \
  -t mysql:8.4 \
  --output type=docker,dest=deploy/images/mysql-8.4-arm64.tar "$TMPDIR_MYSQL"
rm -rf "$TMPDIR_MYSQL"

echo "==> [4/4] 校验 tar 内架构（应均为 arm64）"
for f in deploy/images/*.tar; do
  cfg=$(tar -xOf "$f" manifest.json | grep -o '"Config":"[^"]*"' | cut -d'"' -f4)
  arch=$(tar -xOf "$f" "$cfg" | grep -o '"architecture":"[^"]*"' | cut -d'"' -f4)
  echo "$f -> $arch"
done

echo "完成。将 docker-compose.yml、.env.example、deploy/ 整个目录交给部署同事。"
