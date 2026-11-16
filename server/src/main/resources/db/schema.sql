-- ============================================================================
-- 投壶拒腐 · 数据库建表脚本
-- 数据库：MySQL 8.x，字符集 utf8mb4（支持中文与 emoji）
-- 执行方式：服务启动时自动执行（application.yml 中 spring.sql.init 配置），
--           所有语句均为 IF NOT EXISTS，重复执行无副作用。
--
-- 机制口径（书记审定 2026-11）：
--  1. 每轮一道情景题，ABC 三选项只有唯一正确项；选错该题 0 分。
--  2. 选对后投壶定分：三个壶为固定难度档位 易=10 / 中=15 / 难=20，
--     投中得壶分，未中保底 5 分。
--  3. 答题与投壶一体上报，throw_records 每轮一行：
--     答错时 pot_type/pointer_pos/in_zone/hit 为 NULL，score_gained = 0。
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 用户表：登录账号
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            BIGINT       PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
  username      VARCHAR(32)  NOT NULL UNIQUE COMMENT '登录账号（唯一）',
  password_hash VARCHAR(72)  NOT NULL COMMENT 'BCrypt 密码哈希，绝不明文存储',
  display_name  VARCHAR(32)  NOT NULL COMMENT '显示姓名（排行榜展示用）',
  department    VARCHAR(64)  DEFAULT NULL COMMENT '部门（可选）',
  role          VARCHAR(16)  NOT NULL DEFAULT 'PLAYER' COMMENT '角色：PLAYER 玩家 / ADMIN 管理员',
  status        TINYINT      NOT NULL DEFAULT 1 COMMENT '状态：1 正常 / 0 停用',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
  last_login_at DATETIME     DEFAULT NULL COMMENT '最近登录时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- ---------------------------------------------------------------------------
-- 对局表：每玩一局产生一行
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS game_sessions (
  id              BIGINT      PRIMARY KEY AUTO_INCREMENT COMMENT '对局ID',
  user_id         BIGINT      NOT NULL COMMENT '玩家用户ID',
  status          VARCHAR(16) NOT NULL DEFAULT 'PLAYING' COMMENT '状态：PLAYING 进行中 / FINISHED 已完结 / ABANDONED 中途放弃',
  current_round   INT         NOT NULL DEFAULT 1 COMMENT '当前进行到的轮次（1~9，10 表示已完成全部投掷）',

  -- —— 结算结果（由服务端根据明细重算，不信客户端上报值，防作弊） ——
  final_score     INT         NOT NULL DEFAULT 0 COMMENT '清算后最终得分',
  breeze_tokens   INT         NOT NULL DEFAULT 0 COMMENT '清风令数量（答题获得）',

  -- —— 本局抽题结果（JSON：9 道场景题 + 4 道判断题，含已打乱的选项顺序） ——
  -- MEDIUMTEXT：9 道场景全文 + 选项 + 解析为中文 UTF-8（3 字节/字），TEXT 的 64KB 上限有撑爆风险
  question_plan   MEDIUMTEXT  DEFAULT NULL COMMENT '本局抽题结果 JSON，开局时生成，续玩时原样返回',

  started_at      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '开局时间',
  finished_at     DATETIME    DEFAULT NULL COMMENT '完结时间',

  INDEX idx_user (user_id),
  -- 排行榜查询：已完结，按分数倒序
  INDEX idx_leaderboard (status, final_score DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='对局表';

-- ---------------------------------------------------------------------------
-- 轮次记录表：每轮作答（+答对时的投壶）一行，审计与清算的事实依据
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS throw_records (
  id             BIGINT       PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
  session_id     BIGINT       NOT NULL COMMENT '所属对局ID',
  round_no       INT          NOT NULL COMMENT '轮次 1~9',
  scene_id       VARCHAR(32)  DEFAULT NULL COMMENT '本轮场景题ID（前端题库里的 id）',

  -- —— 选项作答 ——
  option_key     VARCHAR(8)   NOT NULL COMMENT '玩家选择的选项编号（a/b/c）',
  option_correct TINYINT      NOT NULL COMMENT '选项是否答对：1 是 / 0 否（答错本题 0 分，不投壶）',

  -- —— 投壶（仅答对时产生，答错为 NULL） ——
  pot_type       VARCHAR(16)  DEFAULT NULL COMMENT '所投的壶：EASY 易(10分) / MID 中(15分) / HARD 难(20分)',
  pointer_pos    DECIMAL(4,3) DEFAULT NULL COMMENT '松手时指针位置 0~1',
  in_zone        TINYINT      DEFAULT NULL COMMENT '指针是否落在高亮区间：1 是 / 0 否',
  hit            TINYINT      DEFAULT NULL COMMENT '是否命中：1 是 / 0 否',

  score_gained   INT          NOT NULL DEFAULT 0 COMMENT '本轮得分（答错 0 / 未中保底 5 / 命中 10/15/20）',
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '记录时间',

  -- 同一局同一轮只允许一条记录：客户端重试/网络重发不会产生脏数据
  UNIQUE KEY uk_session_round (session_id, round_no),
  INDEX idx_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='轮次记录表';

-- ---------------------------------------------------------------------------
-- 答题记录表：第 2/4/6/8 轮的法规判断题（清风令）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_records (
  id         BIGINT      PRIMARY KEY AUTO_INCREMENT COMMENT '记录ID',
  session_id BIGINT      NOT NULL COMMENT '所属对局ID',
  round_no   INT         NOT NULL COMMENT '轮次（2/4/6/8）',
  quiz_id    VARCHAR(32) DEFAULT NULL COMMENT '题目ID（前端题库里的 id）',
  correct    TINYINT     NOT NULL COMMENT '是否答对：1 是 / 0 否（答对得 1 枚清风令）',
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '答题时间',

  UNIQUE KEY uk_session_round (session_id, round_no),
  INDEX idx_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='答题记录表';

-- ---------------------------------------------------------------------------
-- 场景题表：投壶情景题（每轮一道，ABC 三选项只有唯一正确项）
-- options_json 为 JSON 数组：[{"key":"a","text":"...","correct":true|false}, ...]
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scene_questions (
  id          VARCHAR(8)  PRIMARY KEY COMMENT '题目编号（SC + 三位序号）',
  category    VARCHAR(32) NOT NULL COMMENT '廉洁风险类别',
  difficulty  TINYINT     NOT NULL DEFAULT 1 COMMENT '难度：1 直观 / 2 警醒 / 3 边界',
  scene_text  TEXT        NOT NULL COMMENT '情景描述',
  options_json TEXT       NOT NULL COMMENT '选项 JSON（含 correct 正确项标记）',
  hint        TEXT        DEFAULT NULL COMMENT '教育点解析（答错时展示）',
  source      VARCHAR(32) DEFAULT NULL COMMENT '题目来源',
  enabled     TINYINT     NOT NULL DEFAULT 1 COMMENT '是否启用：1 是 / 0 否'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='场景题库';

-- ---------------------------------------------------------------------------
-- 判断题表：法规判断题（第 2/4/6/8 轮，答对得清风令）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_questions (
  id          VARCHAR(8)  PRIMARY KEY COMMENT '题目编号（QZ + 三位序号）',
  category    VARCHAR(32) NOT NULL COMMENT '法规类别',
  difficulty  TINYINT     NOT NULL DEFAULT 1 COMMENT '难度：1 一眼违规 / 2 反直觉 / 3 边界',
  scene       TEXT        NOT NULL COMMENT '题干（情景描述或条例表述）',
  qtype       VARCHAR(16) NOT NULL DEFAULT 'scenario' COMMENT '题型：scenario 情景判断 / statement 条例判断',
  compliant   TINYINT     NOT NULL COMMENT '情景题：1 可以做 / 0 违规；条例题：1 表述正确 / 0 表述错误',
  answer_note VARCHAR(64) DEFAULT NULL COMMENT '一句话答案',
  explain_text TEXT       DEFAULT NULL COMMENT '讲解（列名不用 explain，它是 MySQL 保留字）',
  basis       TEXT        DEFAULT NULL COMMENT '纪律依据（法规名称 + 条号 + 条文关键原文）',
  enabled     TINYINT     NOT NULL DEFAULT 1 COMMENT '是否启用：1 是 / 0 否'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='判断题库';

-- 注：内置管理员账号由服务端启动时创建（DataInitializer），
--     因为 BCrypt 哈希必须由程序实时生成，写死在 SQL 里容易出错。
