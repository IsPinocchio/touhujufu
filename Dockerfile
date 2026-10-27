# 前端镜像：nginx 伺候 dist 静态文件 + 反代 /api 到后端
# 基础镜像为多架构镜像，ARM 机器上自动获得 ARM 版本
FROM nginx:alpine

# 构建产物（需先在宿主机执行 npm run build）
# 放到 ldxq 子目录：与部署子路径 https://www.maas.com/ldxq 对应
COPY dist/ /usr/share/nginx/html/ldxq/

# 覆盖 nginx 默认站点配置：静态服务 + /api 反向代理
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
