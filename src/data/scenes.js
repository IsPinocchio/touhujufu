/**
 * 场景题库（投壶情景题）
 *
 * 数据格式约定（与后端接口对齐）：
 * {
 *   id:         string  题目唯一编号，格式 SC + 三位序号
 *   category:   string  廉洁风险类别（用于分维度统计答题数据）
 *   difficulty: number  难度 1（直观）~ 3（边界），参考题库配比：简单 60% / 警醒 25% / 反直觉 15%
 *   scene:      string  情景描述（第二人称，项目一线真实纠结场景）
 *   options:    array   三个选项，分别映射三个壶：
 *                       corrupt = 腐败壶（违规）、edge = 擦边壶（灰色）、clean = 廉洁壶（合规）
 *                       key 为选项编号，顺序与 pot 的对应关系固定，展示时随机打乱
 *   hint:       string  教育点解析，投掷后展示
 *   source:     string  题目来源，便于回溯审核
 * }
 */

export const SCENE_CATEGORIES = [
  '礼品礼金',
  '宴请旅游',
  '采购招标',
  '利益输送',
  '数据造假',
  '履职验收',
  '津贴补贴',
  '商业秘密',
  '人事关系',
]

export const scenes = [
  {
    id: 'SC001',
    category: '礼品礼金',
    difficulty: 1,
    scene:
      '项目验收在即，长期合作的供应商负责人私下递来一张购物卡，笑着说：“就是过节的一点心意，不影响验收，您放心。”',
    options: [
      { key: 'a', text: '收下，反正是老供应商，验收按标准来，不影响公事。', pot: 'corrupt' },
      { key: 'b', text: '不收卡，但让对方折算成项目里的“增值服务”补回来。', pot: 'edge' },
      { key: 'c', text: '明确拒绝，并提醒对方这是违规送礼，验收会严格按合同执行。', pot: 'clean' },
    ],
    hint: '违规收受礼品礼金违反中央八项规定精神，“不影响验收”本身就是影响——拿了东西，标准就难再硬。',
    source: 'internal',
  },
  {
    id: 'SC002',
    category: '采购招标',
    difficulty: 2,
    scene:
      '立项论证时你发现，只有 A 公司的产品“恰好”完全满足技术参数，其他厂商都差一点，而你清楚这套参数是上任按 A 公司产品量身写的。',
    options: [
      { key: 'a', text: '维持参数不变，直接走单一来源采购 A 公司，省事省力。', pot: 'corrupt' },
      { key: 'b', text: '名义上组织询价，但参数不动，等于内定 A 公司。', pot: 'edge' },
      { key: 'c', text: '重新论证参数合理性，去掉排他性条款，真正开放竞争。', pot: 'clean' },
    ],
    hint: '为特定供应商“量身定制”参数属于规避竞争、涉嫌利益输送，违反采购与廉洁从业相关规定。',
    source: 'internal',
  },
  {
    id: 'SC003',
    category: '宴请旅游',
    difficulty: 1,
    scene:
      '外包团队负责人请你吃饭，席间频频举杯，最后委婉提出：“下一期项目还想继续跟您合作，还请多关照。”',
    options: [
      { key: 'a', text: '欣然应允，暗示只要“意思到位”，下期合作没问题。', pot: 'corrupt' },
      { key: 'b', text: '饭照吃，话不说死，只说“按流程来”，让对方觉得有空间。', pot: 'edge' },
      { key: 'c', text: '主动结账或拒绝宴请，说明合作只看能力与报价，不接受私下请托。', pot: 'clean' },
    ],
    hint: '违规接受可能影响公正履职的宴请属于违规吃喝。吃人的嘴软，含糊其辞本身就是默许。',
    source: 'internal',
  },
  {
    id: 'SC004',
    category: '履职验收',
    difficulty: 2,
    scene:
      '项目赶工，供应商主动提出：“反正功能都实现了，验收文档我们帮您一起‘处理’，保证通过，您也省心。”',
    options: [
      { key: 'a', text: '让供应商代写验收材料，自己只负责签字，图个清闲。', pot: 'corrupt' },
      { key: 'b', text: '自己写主报告，但默许供应商“优化”测试用例和数据。', pot: 'edge' },
      { key: 'c', text: '拒绝代笔，坚持亲自核验功能并如实撰写验收结论。', pot: 'clean' },
    ],
    hint: '验收造假、让被监督对象代写结论，既失职渎职又埋下质量隐患，一旦出事责任全在你。',
    source: 'internal',
  },
  {
    id: 'SC005',
    category: '数据造假',
    difficulty: 2,
    scene:
      '数据标注外包方提出，可以“优化”一下人效数据，让季度报表的投入产出比更好看，领导满意、部门加分。',
    options: [
      { key: 'a', text: '同意优化，报表好看最重要，反正不影响业务实质。', pot: 'corrupt' },
      { key: 'b', text: '不直接造假，但对明显虚高的数据睁一只眼闭一只眼。', pot: 'edge' },
      { key: 'c', text: '坚决拒绝，坚持用真实数据，必要时主动向上级说明情况。', pot: 'clean' },
    ],
    hint: '数据造假、虚报业绩违反诚实守信与如实报告义务，是典型的弄虚作假，一查必究。',
    source: 'internal',
  },
  {
    id: 'SC006',
    category: '利益输送',
    difficulty: 1,
    scene:
      '云资源采购谈判中，供应商私下提出：“按采购额给您返点，直接打到您亲属账户，绝对安全，合规无忧。”',
    options: [
      { key: 'a', text: '把返点打入亲属账户，认为“不是自己名下”就没事。', pot: 'corrupt' },
      { key: 'b', text: '不直接收钱，但让对方以“合作咨询费”名义支付给亲属。', pot: 'edge' },
      { key: 'c', text: '当场拒绝并留存证据，向上级或纪检部门报告该供应商。', pot: 'clean' },
    ],
    hint: '通过亲属账户收受回扣是典型商业贿赂，“打别人账户”改变不了受贿性质，甚至更恶劣。',
    source: 'internal',
  },
  {
    id: 'SC007',
    category: '商业秘密',
    difficulty: 2,
    scene: '投标截止前，你收到一份匿名快递，里面是竞争对手的详细报价单，明显是有人想“帮”你。',
    options: [
      { key: 'a', text: '打开研究并据此调整自家报价，认为“机会来了”。', pot: 'corrupt' },
      { key: 'b', text: '不主动使用，但不销毁、不报告，揣在手里当“备胎”。', pot: 'edge' },
      { key: 'c', text: '原封不动上报纪检或招投标监督部门，绝不利用。', pot: 'clean' },
    ],
    hint: '利用非法获取的商业秘密属于不正当竞争，知情不报、留存待用同样是违纪的“灰色”操作。',
    source: 'internal',
  },
  {
    id: 'SC008',
    category: '人事关系',
    difficulty: 2,
    scene: '上级领导打电话：“某家供应商技术确实不错，这次你多关照一下，别让我为难。”',
    options: [
      { key: 'a', text: '照领导意思办，直接向该供应商倾斜，反正“有领导担着”。', pot: 'corrupt' },
      { key: 'b', text: '给个“象征性”机会，但暗中在评分上给予照顾。', pot: 'edge' },
      { key: 'c', text: '如实说明会按制度和程序公平评审，并做好相关记录备查。', pot: 'clean' },
    ],
    hint: '领导干部违规插手干预采购是明令禁止的，“有领导担着”不成立，经办人同样要担责。',
    source: 'internal',
  },
  {
    id: 'SC009',
    category: '津贴补贴',
    difficulty: 2,
    scene: '项目奖金分配时，你是牵头人，团队里没人会细算，“给自己多留一点，反正没人知道”这个念头闪过。',
    options: [
      { key: 'a', text: '做两套账，给自己多报一块，神不知鬼不觉。', pot: 'corrupt' },
      { key: 'b', text: '不虚报，但把团队贡献有意往自己头上多算几分。', pot: 'edge' },
      { key: 'c', text: '按实际贡献和既定规则公开、公平分配，接受大家监督。', pot: 'clean' },
    ],
    hint: '“没人知道”是最危险的侥幸。克扣、侵占团队应得利益，是违纪也是失德。',
    source: 'internal',
  },
  {
    id: 'SC010',
    category: '宴请旅游',
    difficulty: 1,
    scene: '供应商邀请你参加“技术考察”，行程单上除了半天参观，剩下五天都是三亚的酒店和景点。',
    options: [
      { key: 'a', text: '愉快前往，反正是对方出钱，“考察”只是名目。', pot: 'corrupt' },
      { key: 'b', text: '婉拒全程，但同意让供应商承担往返和住宿“考察”费用。', pot: 'edge' },
      { key: 'c', text: '拒绝此类变相旅游，如确有需要，按规定由本单位审批并承担费用。', pot: 'clean' },
    ],
    hint: '以考察之名行旅游之实，属于变相公款旅游、接受可能影响公正履职的安排，违反中央八项规定精神。',
    source: 'internal',
  },
  {
    id: 'SC011',
    category: '履职验收',
    difficulty: 1,
    scene: '验收时发现几处功能缺陷，供应商拍胸脯：“小问题，先签了，我们后面保证补上。”',
    options: [
      { key: 'a', text: '直接签字通过，反正是“小问题”，后面补不补再说。', pot: 'corrupt' },
      { key: 'b', text: '签字但口头约定限期整改，不写入验收记录。', pot: 'edge' },
      { key: 'c', text: '拒签，将缺陷书面记录并要求整改完成后再验收。', pot: 'clean' },
    ],
    hint: '“先签后补”往往“签了就没了”。验收放水是失职，口头承诺不落纸等于没有约束。',
    source: 'internal',
  },
  {
    id: 'SC012',
    category: '履职验收',
    difficulty: 2,
    scene: '你发现外包团队报上来的工作量明显虚高，但“大家都这样”，前任也这么默许过来了。',
    options: [
      { key: 'a', text: '默许虚报，甚至配合在确认单上签字，大家心照不宣。', pot: 'corrupt' },
      { key: 'b', text: '不签字但也不纠正，装作没看见，维持现状。', pot: 'edge' },
      { key: 'c', text: '核实真实工作量，坚决核减虚报部分，并向相关负责人说明。', pot: 'clean' },
    ],
    hint: '“大家都这样”不能成为违纪理由。对虚报失察、默许，属于监督失职，可能被认定为共谋。',
    source: 'internal',
  },
  {
    id: 'SC013',
    category: '利益输送',
    difficulty: 2,
    scene: '供应商提出：“我们有一笔‘咨询费’，按合规流程走，直接打到您亲属账户，您放心。”',
    options: [
      { key: 'a', text: '答应下来，认为“合规流程”四个字就是护身符。', pot: 'corrupt' },
      { key: 'b', text: '不拒绝，但先“观望”，等供应商把流程“做漂亮”了再收。', pot: 'edge' },
      { key: 'c', text: '识破这是变相利益输送，明确拒绝并远离。', pot: 'clean' },
    ],
    hint: '“合规流程”是行贿话术，绕过本人收受亲属账户财物，本质仍是受贿，且是处心积虑的隐蔽形式。',
    source: 'internal',
  },
  {
    id: 'SC014',
    category: '履职验收',
    difficulty: 3,
    scene: '项目结算时，你发现财务系统里有一笔费用重复计了，金额不小，而财务尚未察觉。',
    options: [
      { key: 'a', text: '默不作声，事后想办法把多出的钱“处理”到自己的渠道。', pot: 'corrupt' },
      { key: 'b', text: '不主动揭发，但也不动这笔钱，等它自己“过去”。', pot: 'edge' },
      { key: 'c', text: '立即指出重复计费，主动纠正，避免国有资产损失。', pot: 'clean' },
    ],
    hint: '发现差错不纠正、甚至想据为己有，性质从失察滑向侵占，一念之差就是违纪与犯罪的界线。',
    source: 'internal',
  },
  {
    id: 'SC015',
    category: '商业秘密',
    difficulty: 2,
    scene: '手头能导出大量客户数据，你觉得“脱敏了应该没事”，想拿来做自己接的私活项目。',
    options: [
      { key: 'a', text: '直接导出使用，认为脱敏后“谁也查不出来”。', pot: 'corrupt' },
      { key: 'b', text: '只导出“看起来”不敏感的字段，自认为安全。', pot: 'edge' },
      { key: 'c', text: '严守数据权限，不因私利触碰任何客户数据，涉及使用一律走合规审批。', pot: 'clean' },
    ],
    hint: '违规使用、泄露数据违反数据安全与保密规定，“脱敏”不等于“安全”，一旦泄露追责到个人。',
    source: 'internal',
  },
  {
    id: 'SC016',
    category: '采购招标',
    difficulty: 3,
    scene: '技术选型上你清楚 A 方案明显更优，但 B 厂商与你有私下的利益往来，天平在心里悄悄偏了。',
    options: [
      { key: 'a', text: '在评审报告中把 B 写成更优，让“技术论证”为私利背书。', pot: 'corrupt' },
      { key: 'b', text: '不明确偏向，但在评分细节上给 B 找“合理理由”加分。', pot: 'edge' },
      { key: 'c', text: '如实按技术优劣与成本效益做结论，主动回避涉及利益关系的厂商。', pot: 'clean' },
    ],
    hint: '用专业话语包装利益输送，是最隐蔽也最危险的腐败。技术决策一旦夹带私货，损害的是公共利益。',
    source: 'internal',
  },
  {
    id: 'SC017',
    category: '津贴补贴',
    difficulty: 2,
    scene: '供应商私下说：“你们团队加班辛苦，加班费我们想办法从项目里‘补贴’，别走正规流程了。”',
    options: [
      { key: 'a', text: '同意让供应商以项目款名义变相发补贴。', pot: 'corrupt' },
      { key: 'b', text: '不直接同意，但默许供应商给个别骨干“单独表示”。', pot: 'edge' },
      { key: 'c', text: '拒绝，说明加班费应按规定由单位足额发放，不接受变相补贴。', pot: 'clean' },
    ],
    hint: '以项目款变相发放补贴，绕开财务制度，是违规发放津补贴与利益输送的叠加。',
    source: 'internal',
  },
  {
    id: 'SC018',
    category: '礼品礼金',
    difficulty: 1,
    scene: '项目刚中标，供应商送来一套“纪念品”，包装精美，说“纯属感谢，不值钱，就是份心意”。',
    options: [
      { key: 'a', text: '收下纪念品，觉得“中标是公平竞争，收点心意无所谓”。', pot: 'corrupt' },
      { key: 'b', text: '先收下，等看清价值再决定是否退回。', pot: 'edge' },
      { key: 'c', text: '婉拒并退回，说明廉洁纪律要求不收受供应商任何礼品。', pot: 'clean' },
    ],
    hint: '中标后收受供应商礼品，是“事后感谢”式利益输送，看似小事，实则打开了围猎的口子。',
    source: 'internal',
  },
]
