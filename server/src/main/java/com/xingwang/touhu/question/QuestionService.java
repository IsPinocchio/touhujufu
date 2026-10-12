package com.xingwang.touhu.question;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.xingwang.touhu.common.BizException;
import com.xingwang.touhu.question.entity.SceneQuestion;
import com.xingwang.touhu.question.entity.QuizQuestion;
import com.xingwang.touhu.question.mapper.SceneQuestionMapper;
import com.xingwang.touhu.question.mapper.QuizQuestionMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 抽题服务：开局时为本局随机抽取题目。
 * 9 道不重复场景题（选项顺序打乱）+ 4 道不重复判断题（对应第 2/4/6/8 轮）。
 * 抽题结果以 JSON 存到 game_sessions.question_plan，续玩时原样返回，保证题目不变。
 */
@Service
@RequiredArgsConstructor
public class QuestionService {

  private final SceneQuestionMapper sceneMapper;
  private final QuizQuestionMapper quizMapper;
  private final ObjectMapper objectMapper = new ObjectMapper();

  /** 下发给前端的场景题（字段名与前端原题库一致，前端组件无需改动） */
  public record ScenePayload(String id, String category, Integer difficulty,
                             String scene, List<JsonNode> options, String hint) {
  }

  /** 下发给前端的判断题 */
  public record QuizPayload(String id, String category, Integer difficulty,
                            String scene, Boolean compliant, String answerNote,
                            String explain, String basis) {
  }

  /** 一局完整的抽题结果 */
  public record QuestionPlan(List<ScenePayload> scenes, Map<Integer, QuizPayload> quizzes) {
  }

  /** 随机抽一局的题目 */
  public QuestionPlan pickSessionQuestions(int sceneCount, List<Integer> quizRounds) {
    List<SceneQuestion> scenePool = sceneMapper.selectList(
        new LambdaQueryWrapper<SceneQuestion>().eq(SceneQuestion::getEnabled, true));
    if (scenePool.size() < sceneCount) {
      throw new BizException("场景题库数量不足（需要 " + sceneCount + " 道）");
    }
    Collections.shuffle(scenePool);

    List<QuizQuestion> quizPool = quizMapper.selectList(
        new LambdaQueryWrapper<QuizQuestion>().eq(QuizQuestion::getEnabled, true));
    if (quizPool.size() < quizRounds.size()) {
      throw new BizException("判断题库数量不足（需要 " + quizRounds.size() + " 道）");
    }
    Collections.shuffle(quizPool);

    List<ScenePayload> scenes = new ArrayList<>();
    for (int i = 0; i < sceneCount; i++) {
      scenes.add(toPayload(scenePool.get(i)));
    }

    Map<Integer, QuizPayload> quizzes = new LinkedHashMap<>();
    for (int i = 0; i < quizRounds.size(); i++) {
      QuizQuestion q = quizPool.get(i);
      quizzes.put(quizRounds.get(i), new QuizPayload(q.getId(), q.getCategory(), q.getDifficulty(),
          q.getScene(), q.getCompliant(), q.getAnswerNote(), q.getExplainText(), q.getBasis()));
    }

    return new QuestionPlan(scenes, quizzes);
  }

  /** 解析 question_plan JSON 回对象（续玩时用） */
  public QuestionPlan parsePlan(String json) {
    try {
      return objectMapper.readValue(json, QuestionPlan.class);
    } catch (Exception e) {
      throw new BizException("对局题目数据损坏");
    }
  }

  public String toJson(QuestionPlan plan) {
    try {
      return objectMapper.writeValueAsString(plan);
    } catch (Exception e) {
      throw new BizException("题目序列化失败");
    }
  }

  /** 转下发 payload：选项顺序打乱（记录进 plan，续玩顺序不变） */
  private ScenePayload toPayload(SceneQuestion q) {
    try {
      ArrayNode arr = (ArrayNode) objectMapper.readTree(q.getOptionsJson());
      List<JsonNode> options = new ArrayList<>();
      arr.forEach(options::add);
      Collections.shuffle(options);
      return new ScenePayload(q.getId(), q.getCategory(), q.getDifficulty(),
          q.getSceneText(), options, q.getHint());
    } catch (Exception e) {
      throw new BizException("场景题 " + q.getId() + " 选项数据损坏");
    }
  }
}
