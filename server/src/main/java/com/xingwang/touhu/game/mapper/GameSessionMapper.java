package com.xingwang.touhu.game.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.xingwang.touhu.game.entity.GameSession;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

public interface GameSessionMapper extends BaseMapper<GameSession> {

  /** MySQL 命名锁：防止同一用户并发开局（双击/网络重试产生两局 PLAYING） */
  @Select("SELECT GET_LOCK(#{name}, 5)")
  Integer getLock(@Param("name") String name);

  @Select("SELECT RELEASE_LOCK(#{name})")
  Integer releaseLock(@Param("name") String name);
}
