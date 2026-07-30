/* ============================================================
   主旋律的工作台 - 核心应用逻辑
   公考备考 PWA · 数据互通 · 跨端同步
   ============================================================ */

// ============ 数据层 ============
const Store = {
  KEY: 'gongkaotai_data_v1',

  init() {
    if (!localStorage.getItem(this.KEY)) {
      const data = {
        tasks: this._seedTasks(),
        wrongQuestions: [],
        favorites: [],
        notes: {},
        stats: { studyTime: {} },
        lastSync: Date.now()
      };
      this.save(data);
    }
  },

  get() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || {}; }
    catch { return {}; }
  },

  save(data) {
    data.lastSync = Date.now();
    localStorage.setItem(this.KEY, JSON.stringify(data));
    // 触发倒计时/概览更新事件
    window.dispatchEvent(new CustomEvent('store:update', { detail: data }));
  },

  // ===== 倒计时管理 =====
  getCountdown() {
    const data = this.get();
    return data.countdown || null;
  },

  setCountdown(cd) {
    const data = this.get();
    data.countdown = cd;
    this.save(data);
  },

  clearCountdown() {
    const data = this.get();
    data.countdown = null;
    this.save(data);
  },

  // ===== 背诵打卡 =====
  addRecite(num) {
    const data = this.get();
    const today = new Date().toISOString().slice(0,10);
    if (data.reciteDate !== today) {
      data.reciteDate = today;
      data.reciteToday = num;
    } else {
      data.reciteToday = (data.reciteToday || 0) + num;
    }
    this.save(data);
  },

  resetRecite() {
    const data = this.get();
    data.reciteToday = 0;
    data.reciteDate = new Date().toISOString().slice(0,10);
    this.save(data);
  },

  // 云同步模拟 - 跨端数据同步
  sync() {
    const data = this.get();
    data.lastSync = Date.now();
    this.save(data);
    return data.lastSync;
  },

  // ===== 任务管理 =====
  getTasks() { return this.get().tasks || []; },

  addTask(task) {
    const data = this.get();
    task.id = 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    task.createdAt = Date.now();
    task.completed = false;
    task.pinned = false;
    task.status = task.status || 'pending'; // pending, overdue, completed, today
    data.tasks.unshift(task);
    this.save(data);
    return task;
  },

  updateTask(id, updates) {
    const data = this.get();
    const t = data.tasks.find(t => t.id === id);
    if (t) { Object.assign(t, updates); this.save(data); }
  },

  deleteTask(id) {
    const data = this.get();
    data.tasks = data.tasks.filter(t => t.id !== id);
    this.save(data);
  },

  toggleTask(id) {
    const data = this.get();
    const t = data.tasks.find(t => t.id === id);
    if (t) {
      t.completed = !t.completed;
      if (t.completed) t.completedAt = Date.now();
      this.save(data);
    }
  },

  togglePin(id) {
    const data = this.get();
    const t = data.tasks.find(t => t.id === id);
    if (t) { t.pinned = !t.pinned; this.save(data); }
  },

  _seedTasks() {
    const today = new Date();
    const fmt = (d) => {
      const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
      return `${y}-${m}-${day}`;
    };
    return [
      { id:'t_seed1', name:'行测资料分析速算练习', duration:60, deadline: fmt(today)+' 21:00', subject:'资料分析', notes:'重点练习增长率与比重计算', createdAt: Date.now()-3600000, completed:false, pinned:true, status:'today' },
      { id:'t_seed2', name:'申论大作文练习', duration:90, deadline: fmt(today)+' 20:00', subject:'申论', notes:'主题：基层治理创新', createdAt: Date.now()-7200000, completed:false, pinned:false, status:'today' },
      { id:'t_seed3', name:'判断推理-图形推理专项', duration:45, deadline: fmt(new Date(Date.now()+86400000))+' 18:00', subject:'判断推理', notes:'', createdAt: Date.now()-86400000, completed:false, pinned:false, status:'pending' },
      { id:'t_seed4', name:'数量关系公式记忆', duration:30, deadline: fmt(new Date(Date.now()-86400000))+' 18:00', subject:'数量关系', notes:'行程问题+工程问题公式', createdAt: Date.now()-172800000, completed:true, completedAt: Date.now()-86400000, pinned:false, status:'completed' }
    ];
  },

  // ===== 错题本 =====
  addWrongQuestion(q) {
    const data = this.get();
    q.id = 'wq_' + Date.now();
    q.addedAt = Date.now();
    data.wrongQuestions = data.wrongQuestions || [];
    data.wrongQuestions.unshift(q);
    this.save(data);
  },

  getWrongQuestions() { return this.get().wrongQuestions || []; },

  // ===== 收藏 =====
  addFavorite(item) {
    const data = this.get();
    item.id = 'fav_' + Date.now();
    item.addedAt = Date.now();
    data.favorites = data.favorites || [];
    data.favorites.unshift(item);
    this.save(data);
  },

  getFavorites() { return this.get().favorites || []; },

  removeFavorite(id) {
    const data = this.get();
    data.favorites = (data.favorites||[]).filter(f => f.id !== id);
    this.save(data);
  },

  // ===== 统计 =====
  recordStudy(subject, minutes) {
    const data = this.get();
    const today = new Date().toISOString().slice(0,10);
    data.stats = data.stats || {};
    data.stats.studyTime = data.stats.studyTime || {};
    data.stats.studyTime[today] = data.stats.studyTime[today] || {};
    data.stats.studyTime[today][subject] = (data.stats.studyTime[today][subject] || 0) + minutes;
    this.save(data);
  }
};

// ============ 工具函数 ============
const Utils = {
  todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  },

  isToday(deadline) {
    if (!deadline) return false;
    return deadline.startsWith(this.todayStr());
  },

  isOverdue(deadline) {
    if (!deadline) return false;
    const d = new Date(deadline.replace(' ', 'T'));
    return d < new Date() && !this.isToday(deadline);
  },

  isThisWeek(dateStr) {
    if (!dateStr) return false;
    const d = new Date(dateStr.replace(' ', 'T'));
    const now = new Date();
    const dayOfWeek = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek + 1);
    monday.setHours(0,0,0,0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23,59,59,999);
    return d >= monday && d <= sunday;
  },

  relativeTime(ts) {
    const diff = Date.now() - ts;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff/60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff/3600000) + '小时前';
    return Math.floor(diff/86400000) + '天前';
  },

  formatDuration(min) {
    if (!min) return '0分钟';
    if (min < 60) return min + '分钟';
    const h = Math.floor(min/60), m = min%60;
    return m ? `${h}小时${m}分` : `${h}小时`;
  },

  subjectColor(subject) {
    const map = {
      '言语理解': 'pink', '判断推理': 'blue', '数量关系': 'yellow',
      '资料分析': 'green', '政治理论': 'pink', '常识': 'gray', '申论': 'blue'
    };
    return map[subject] || 'pink';
  },

  toast(msg) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2200);
  }
};

// ============ 题库数据 ============
const QuizBank = {
  // 言语理解
  yanyu: [
    { q: "下列各句中，没有语病的一句是？", options: ["通过这次活动，使我们增强了团队合作意识", "他的学习成绩有了很大的提高", "能否坚持锻炼，是身体健康的保证", "我们要防止不发生安全事故"], answer: 1, analysis: "A项缺主语；C项两面对一面；D项否定不当。" },
    { q: "依次填入横线处的词语，最恰当的一组是：\n这篇小说构思巧妙，语言____，人物形象____，不愧为一篇佳作。", options: ["精炼；丰满", "精制；丰富", "精巧；充足", "精美；充实"], answer: 0, analysis: "精炼指语言简洁精要；丰满指人物形象立体饱满。" },
    { q: "下列加点词语使用正确的一句是？", options: ["他的一番话震聋发聩，让我恍然大悟", "这篇文章观点陈旧，纯属老生常谭", "他做事总是首鼠两端，从不果断", "面对困难，我们应当一往无前"], answer: 3, analysis: "A应为振聋发聩；B应为老生常谈；C首鼠两端意为犹豫不决，此处可通，但D最恰当。" },
    { q: "填入横线处最恰当的成语是：\n他虽然身体残疾，但____，在学术上取得了非凡成就。", options: ["身强力壮", "身残志坚", "体弱多病", "力不从心"], answer: 1, analysis: "身残志坚指身体残疾但意志坚定，最符合语境。" },
    { q: "下列句子中标点符号使用正确的是？", options: ["我不知道他去哪里了？", "老师说：同学们，请注意安全。", "《红楼梦》是中国四大名著之一。", "这是一个令人值得思考的问题。"], answer: 2, analysis: "A陈述句不能用问号；B冒号后引语完整应加引号；D语义矛盾。" }
  ],

  // 图形推理
  tuxing: [
    { q: "观察图形规律，下列选项中应该填入问号处的是？\n（描述：图形按顺时针方向每次旋转90度）", options: ["顺时针旋转90°后的图形", "逆时针旋转90°后的图形", "旋转180°后的图形", "不旋转的图形"], answer: 0, analysis: "图形规律为每次顺时针旋转90度。" },
    { q: "一组图形中，元素数量依次为1,2,3,4,?，问号处应为？", options: ["3", "4", "5", "6"], answer: 2, analysis: "数量递增规律，1-2-3-4-5。" },
    { q: "图形中黑白方块交替出现，规律为？", options: ["黑色增多", "白色增多", "黑白交替", "颜色随机"], answer: 2, analysis: "黑白交替规律。" },
    { q: "观察图形对称性，下一个图形应该是？", options: ["轴对称图形", "中心对称图形", "不对称图形", "旋转对称图形"], answer: 0, analysis: "规律为轴对称交替。" }
  ],

  // 逻辑判断
  luoji: [
    { q: "所有哺乳动物都是恒温动物，鲸鱼是哺乳动物，所以鲸鱼是恒温动物。这个推理属于？", options: ["归纳推理", "演绎推理", "类比推理", "概率推理"], answer: 1, analysis: "三段论属于演绎推理，由一般到特殊。" },
    { q: "如果今天下雨，我就不去爬山。今天没有下雨。由此可以推出？", options: ["我去爬山了", "我没去爬山", "我去不去爬山不确定", "今天下雨了"], answer: 2, analysis: "否定前件不能否定后件，属于逻辑错误，结论不确定。" },
    { q: "某班学生中，喜欢数学的都喜欢物理。小明喜欢数学。由此可推出？", options: ["小明喜欢物理", "小明不喜欢物理", "小明只喜欢数学", "无法确定"], answer: 0, analysis: "充分条件假言推理，肯定前件必肯定后件。" },
    { q: "下列哪项如果为真，能削弱论证\"吃核桃能提高记忆力\"？", options: ["核桃营养丰富", "实验样本量小且未设置对照组", "很多人喜欢吃核桃", "核桃价格便宜"], answer: 1, analysis: "实验设计缺陷可削弱论证。" }
  ],

  // 定义判断
  dingyi: [
    { q: "定义：角色冲突是指一个人在同时承担多种社会角色时，因角色期望不一致而产生的内心矛盾。下列属于角色冲突的是？", options: ["老师既是学生的教育者又是朋友", "领导安排了冲突的工作", "一个人既想看电影又想睡觉", "员工对工资不满意"], answer: 0, analysis: "老师同时承担教育者和朋友两种角色，角色期望不一致。" },
    { q: "定义：晕轮效应指对一个人某特征的好印象影响到对此人其他特征的评价。下列属于晕轮效应？", options: ["因为成绩好就认为他什么都好", "因为某人不诚实就全盘否定", "对陌生人保持警惕", "因不了解而判断失误"], answer: 0, analysis: "从成绩好扩展到什么都好，属于晕轮效应。" },
    { q: "定义：破窗效应指一个窗户破了不修，会有更多窗户被打破。比喻？", options: ["小问题不解决会引发更大问题", "窗户质量差", "犯罪率上升", "维修费用高"], answer: 0, analysis: "破窗效应指小问题不解决会导致更大问题。" }
  ],

  // 类比推理
  leibi: [
    { q: "医生：医院  相当于  老师：？", options: ["学校", "学生", "课本", "课堂"], answer: 0, analysis: "医生在医院工作，老师在学校工作，职业与场所关系。" },
    { q: "树木：森林  相当于  沙粒：？", options: ["沙漠", "河流", "山脉", "海洋"], answer: 0, analysis: "部分与整体关系，树木组成森林，沙粒组成沙漠。" },
    { q: "勤奋：成功  相当于  ？：？", options: ["懒惰；失败", "努力；收获", "聪明；成绩", "以上都是"], answer: 3, analysis: "因果关系，勤奋导致成功，各选项均为因果关系。" },
    { q: "笔：写字  相当于  眼睛：？", options: ["看", "听", "说", "走"], answer: 0, analysis: "工具与功能关系，笔用来写字，眼睛用来看。" }
  ],

  // 数量关系
  shuliang: [
    { q: "某商品先涨价20%，再降价20%，最终价格比原价？", options: ["高", "低", "相同", "无法确定"], answer: 1, analysis: "1×1.2×0.8=0.96，比原价低4%。" },
    { q: "甲乙两人从A、B两地相向而行，甲速60km/h，乙速40km/h，两地相距200km，几小时后相遇？", options: ["1小时", "2小时", "2.5小时", "3小时"], answer: 1, analysis: "200÷(60+40)=2小时。" },
    { q: "一项工程，甲单独做需10天，乙单独做需15天，两人合作需几天？", options: ["5天", "6天", "7天", "8天"], answer: 1, analysis: "1÷(1/10+1/15)=1÷(1/6)=6天。" },
    { q: "某班级男女生比例3:2，男生比女生多6人，全班共多少人？", options: ["20", "25", "30", "35"], answer: 2, analysis: "3x-2x=6→x=6, 3×6+2×6=30人。" },
    { q: "一个水池有进水管和出水管，进水管单独3小时注满，出水管单独5小时排完，同时开几小时注满？", options: ["7.5小时", "8小时", "6小时", "15小时"], answer: 0, analysis: "1÷(1/3-1/5)=1÷(2/15)=7.5小时。" }
  ],

  // 资料分析
  ziliao: [
    { q: "2023年某地GDP为12000亿元，2022年为10000亿元，增长率为？", options: ["15%", "20%", "25%", "18%"], answer: 1, analysis: "(12000-10000)/10000=20%。" },
    { q: "某产品产量上半年占全年的55%，下半年产量为450万件，全年产量为？", options: ["1000万件", "900万件", "818万件", "950万件"], answer: 0, analysis: "450÷(1-0.55)=1000万件。" },
    { q: "已知某行业利润2023年比上年增长12%，2022年比2021年增长8%，两年相比2021年增长约？", options: ["20%", "20.96%", "21%", "19%"], answer: 1, analysis: "1.12×1.08-1=20.96%。" },
    { q: "下列关于同比和环比的说法，正确的是？", options: ["同比是与去年同期比，环比是与上月比", "同比是与上月比", "环比是与去年比", "两者相同"], answer: 0, analysis: "同比与上年同期比较，环比与上一期比较。" }
  ],

  // 常识-法律
  falv: [
    { q: "我国宪法规定，中华人民共和国的根本制度是？", options: ["社会主义制度", "人民代表大会制度", "民主集中制", "多党合作制"], answer: 0, analysis: "宪法第一条：社会主义制度是根本制度。" },
    { q: "下列哪项不属于公民的基本权利？", options: ["选举权", "受教育权", "依法纳税", "人身自由权"], answer: 2, analysis: "依法纳税是基本义务，不是权利。" },
    { q: "我国民法中规定完全民事行为能力人的年龄是？", options: ["16周岁", "18周岁", "20周岁", "16周岁以自己劳动收入为主要生活来源视为完全民事行为能力人"], answer: 3, analysis: "18周岁为完全民事行为能力人，16周岁以上以劳动收入为主要生活来源的视为完全民事行为能力人。" }
  ],

  // 常识-人文
  renwen: [
    { q: "中国古代四大发明是？", options: ["造纸术、印刷术、火药、指南针", "造纸术、火药、指南针、地动仪", "印刷术、火药、指南针、瓷器", "造纸术、印刷术、火药、丝绸"], answer: 0, analysis: "四大发明：造纸术、印刷术、火药、指南针。" },
    { q: "《论语》是记录谁的言行的著作？", options: ["孟子", "孔子及其弟子", "老子", "庄子"], answer: 1, analysis: "《论语》记录孔子及其弟子言行，由孔子弟子及再传弟子编撰。" },
    { q: "下列属于唐宋八大家的是？", options: ["李白", "杜甫", "苏轼", "白居易"], answer: 2, analysis: "唐宋八大家：韩愈、柳宗元、欧阳修、苏洵、苏轼、苏辙、王安石、曾巩。" }
  ],

  // 常识-科技
  keji: [
    { q: "世界第一颗人造地球卫星是哪个国家发射的？", options: ["美国", "苏联", "中国", "英国"], answer: 1, analysis: "1957年苏联发射了第一颗人造地球卫星斯普特尼克1号。" },
    { q: "DNA的双螺旋结构是谁发现的？", options: ["爱因斯坦", "沃森和克里克", "达尔文", "孟德尔"], answer: 1, analysis: "1953年沃森和克里克发现DNA双螺旋结构。" },
    { q: "下列属于可再生能源的是？", options: ["煤炭", "石油", "太阳能", "天然气"], answer: 2, analysis: "太阳能属于可再生能源。" }
  ],

  // 常识-地理
  dili: [
    { q: "世界上最长的河流是？", options: ["长江", "亚马逊河", "尼罗河", "密西西比河"], answer: 2, analysis: "尼罗河约6650公里，是世界最长河流。" },
    { q: "我国领土最南端是？", options: ["曾母暗沙", "海南岛", "南沙群岛", "西沙群岛"], answer: 0, analysis: "曾母暗沙是中国领土最南端。" },
    { q: "下列属于我国四大高原的是？", options: ["黄土高原", "云贵高原", "青藏高原", "以上都是"], answer: 3, analysis: "四大高原：青藏高原、内蒙古高原、黄土高原、云贵高原。" }
  ],

  // 常识-时政
  shizheng: [
    { q: "中国式现代化的本质特征是？", options: ["中国共产党领导", "全体人民共同富裕", "物质文明和精神文明相协调", "以上都是"], answer: 3, analysis: "中国式现代化五个特征：人口规模巨大、全体人民共同富裕、物质文明和精神文明相协调、人与自然和谐共生、走和平发展道路。" },
    { q: "新发展理念包括？", options: ["创新、协调", "绿色、开放", "共享", "以上都是"], answer: 3, analysis: "新发展理念：创新、协调、绿色、开放、共享。" },
    { q: "我国社会主要矛盾已经转化为？", options: ["人民日益增长的物质文化需要与落后社会生产之间的矛盾", "人民日益增长的美好生活需要和不平衡不充分的发展之间的矛盾", "经济发展与环境保护的矛盾", "城乡发展不平衡的矛盾"], answer: 1, analysis: "十九大提出：人民日益增长的美好生活需要和不平衡不充分的发展之间的矛盾。" }
  ]
};

// 知识点速记数据
const KnowledgeBase = {
  yanyu: [
    { title: '主旨概括题', content: '找中心句，关注关联词（但是、因此、总之），首尾句往往是重点。' },
    { title: '意图判断题', content: '在主旨基础上合理推断作者意图，关注对策性表述（应该、需要、必须）。' },
    { title: '细节理解题', content: '选项与原文逐一比对，注意偷换概念、无中生有、时态矛盾。' },
    { title: '语句排序题', content: '看关联词、指代词、逻辑顺序（时间、因果、总分），确定首尾句。' },
    { title: '逻辑填空', content: '辨析词义轻重、侧重、搭配习惯，结合语境语境语境！' },
    { title: '常见成语辨析', content: '不以为然≠不以为意；无可厚非≠无可非议；首当其冲≠首先。' }
  ],
  tuxing: [
    { title: '位置规律', content: '平移、旋转、翻转。注意方向和步数。' },
    { title: '样式规律', content: '相加、相减、求同、求异。遍历式运算。' },
    { title: '数量规律', content: '点、线、角、面、素。数数找等差、等比或乱序规律。' },
    { title: '空间重构', content: '相对面、相邻面、公共棱。利用排除法。' }
  ],
  luoji: [
    { title: '翻译推理', content: '前推后（充分），后推前（必要）。逆否等价：A→B ⟺ ¬B→¬A。' },
    { title: '真假推理', content: '找矛盾关系（A且非A）、反对关系（所有是/所有不是）。矛盾必一真一假。' },
    { title: '加强削弱', content: '加强：肯定论据、建立联系、排除他因。削弱：否定论据、切断联系、另有他因。' },
    { title: '分析推理', content: '排除法、列表法、假设法。注意最大信息优先。' }
  ],
  dingyi: [
    { title: '核心要素法', content: '提取主体、条件、方式、目的、结果，与选项逐一比对。' },
    { title: '常见错误', content: '扩大/缩小范围、偷换主体、条件缺失。' }
  ],
  leibei: [
    { title: '语义关系', content: '近义、反义、象征义。如：狼狈为奸=互相勾结。' },
    { title: '逻辑关系', content: '全同、包含、交叉、并列。注意包容关系与组成关系的区别。' },
    { title: '语法关系', content: '主谓、动宾、偏正。看词性与结构一致性。' }
  ],
  shuliang: [
    { title: '行程问题', content: '路程=速度×时间。相遇：路程和=速度和×时间。追及：路程差=速度差×时间。' },
    { title: '工程问题', content: '工作总量=效率×时间。赋值法：总量设为公倍数。' },
    { title: '利润问题', content: '利润=售价-成本。利润率=利润/成本×100%。打折：售价=定价×折扣。' },
    { title: '排列组合', content: '排列有序A(n,m)，组合无序C(n,m)。分类用加法，分步用乘法。' },
    { title: '容斥原理', content: '两集合：|A∪B|=|A|+|B|-|A∩B|。三集合公式需记忆。' },
    { title: '常用公式', content: '等差数列和=(首项+末项)×项数/2。几何：勾股定理a²+b²=c²。圆面积=πr²。' }
  ],
  ziliao: [
    { title: '增长率', content: '增长量/基期值×100%。(现期-基期)/基期。' },
    { title: '增长量', content: '现期-基期。或 基期×增长率。' },
    { title: '比重', content: '部分/整体×100%。比重差=部分增长率-整体增长率（近似）。' },
    { title: '平均数', content: '总数/份数。平均增长率≈总增长率-份数增长率。' },
    { title: '速算技巧', content: '首数法、尾数法、有效数字法、特征数字法（1/7≈14.3%等）。' },
    { title: '常见陷阱', content: '时间范围偷换、单位不一致、基期与现期混淆、年均与同比混淆。' }
  ],
  falv: [
    { title: '宪法', content: '国家根本大法，具有最高法律效力。公民基本权利与义务。' },
    { title: '民法典', content: '2021年1月1日施行。总则、物权、合同、人格权、婚姻家庭、继承、侵权责任。' },
    { title: '刑法', content: '罪刑法定、法律面前人人平等、罪责刑相适应。已满16岁完全负刑事责任。' },
    { title: '行政法', content: '行政许可法、行政处罚法、行政复议法、行政诉讼法。' }
  ],
  renwen: [
    { title: '诸子百家', content: '儒家（孔孟荀）、道家（老庄）、法家（韩非）、墨家（墨子）。' },
    { title: '唐宋八大家', content: '韩愈、柳宗元（唐）；欧阳修、苏洵、苏轼、苏辙、王安石、曾巩（宋）。' },
    { title: '四大名著', content: '《三国演义》罗贯中、《水浒传》施耐庵、《西游记》吴承恩、《红楼梦》曹雪芹。' }
  ],
  keji: [
    { title: '航天成就', content: '神舟系列载人飞船、嫦娥探月工程、天问火星探测、北斗导航系统。' },
    { title: '信息技术', content: '5G通信、量子计算、人工智能、大数据、区块链。' }
  ],
  dili: [
    { title: '中国地理', content: '国土面积约960万平方公里。四大高原、三大平原、四大盆地。' },
    { title: '气候类型', content: '热带季风、亚热带季风、温带季风、温带大陆性、高原山地气候。' }
  ],
  shizheng: [
    { title: '中国式现代化', content: '5个特征：人口规模巨大、全体人民共同富裕、物质文明和精神文明相协调、人与自然和谐共生、走和平发展道路。' },
    { title: '新发展理念', content: '创新、协调、绿色、开放、共享。' },
    { title: '社会主要矛盾', content: '人民日益增长的美好生活需要和不平衡不充分的发展之间的矛盾。' },
    { title: '两个一百年', content: '建党百年全面建成小康社会；建国百年建成社会主义现代化强国。' },
    { title: '乡村振兴战略', content: '产业兴旺、生态宜居、乡风文明、治理有效、生活富裕。' }
  ]
};

// 申论素材库
const ShenlunMaterials = {
  templates: [
    { title: '归纳概括题模板', content: '总括句+分条列举。要点需全面、准确、有条理。每条以动宾结构开头，如"完善...制度"、"加强...监管"。' },
    { title: '综合分析题模板', content: '亮明观点+多角度分析（原因/影响/合理性/不足）+提出对策/总结。层次分明，逻辑清晰。' },
    { title: '对策建议题模板', content: '问题导向，针对性提出对策。主体+手段+内容+目的。如"政府应通过立法手段，完善XX制度，以实现XX目标"。' },
    { title: '应用文写作模板', content: '标题+称谓+正文（背景+主体内容+结语）+落款。格式分不可丢。' },
    { title: '大作文模板', content: '标题+开头（引题+亮观点）+分论段（3个：分论点+论据+分析+回扣）+结尾（升华主题）。' }
  ],
  materials: [
    { title: '基层治理', content: '基层是国家治理的基石。要坚持党建引领，推动重心下移、资源下沉，激发基层活力，走好新时代党的群众路线。', tags: ['治理', '党建'] },
    { title: '科技创新', content: '科技是第一生产力，创新是引领发展的第一动力。要打好关键核心技术攻坚战，实现高水平科技自立自强。', tags: ['创新', '发展'] },
    { title: '生态文明', content: '绿水青山就是金山银山。坚持人与自然和谐共生，走生产发展、生活富裕、生态良好的文明发展道路。', tags: ['环保', '发展'] },
    { title: '乡村振兴', content: '民族要复兴，乡村必振兴。要走中国特色社会主义乡村振兴道路，促进农业高质高效、乡村宜居宜业、农民富裕富足。', tags: ['三农', '发展'] },
    { title: '人民至上', content: '江山就是人民，人民就是江山。始终把人民放在心中最高位置，把人民对美好生活的向往作为奋斗目标。', tags: '民生', tags: ['民生'] },
    { title: '文化自信', content: '文化是一个国家、一个民族的灵魂。坚定文化自信，推动中华优秀传统文化创造性转化、创新性发展。', tags: ['文化'] },
    { title: '依法治国', content: '全面依法治国是国家治理的一场深刻革命。坚持法治国家、法治政府、法治社会一体建设。', tags: ['法治'] },
    { title: '人类命运共同体', content: '构建人类命运共同体，建设持久和平、普遍安全、共同繁荣、开放包容、清洁美丽的世界。', tags: ['外交'] }
  ],
  essays: [
    { title: '以人民为中心 谱写时代新篇', excerpt: '"治国有常，而利民为本。"人民是历史的创造者，是决定党和国家前途命运的根本力量...' },
    { title: '创新驱动发展 逐梦科技强国', excerpt: '苟日新，日日新，又日新。创新是民族进步之魂，科技是国家强盛之基...' },
    { title: '守护绿水青山 建设美丽中国', excerpt: '天地与我并生，而万物与我为一。生态文明建设是关系中华民族永续发展的根本大计...' }
  ]
};

// ============ 导航 ============
const Nav = {
  pages: [
    { id: 'home',       num: '1', icon: '📊', text: '言语理解',   section: '行测' },
    { id: 'panduan',    num: '2', icon: '🧩', text: '判断推理',   section: '行测' },
    { id: 'shuliang',   num: '3', icon: '🔢', text: '数量关系',   section: '行测' },
    { id: 'ziliao',     num: '4', icon: '📈', text: '资料分析',   section: '行测' },
    { id: 'zhengzhi',   num: '5', icon: '📚', text: '政治&常识',   section: '综合' },
    { id: 'shenlun',    num: '6', icon: '✍️', text: '申论·综应',   section: '综合' },
    { id: 'overview',   num: '7', icon: '📋', text: '全局总览',   section: '总览' }
  ],

  current: 'overview',

  render() {
    const sections = {};
    this.pages.forEach(p => {
      if (!sections[p.section]) sections[p.section] = [];
      sections[p.section].push(p);
    });

    const list = document.getElementById('navList');
    let html = '';
    for (const [section, items] of Object.entries(sections)) {
      html += `<div class="nav-section-label">${section}</div>`;
      items.forEach(p => {
        const badge = p.id === 'overview' ? `<span class="nav-badge" id="navTaskCount">0</span>` : '';
        html += `
          <div class="nav-item ${p.id === this.current ? 'active' : ''}" data-page="${p.id}">
            <span class="nav-num">${p.num}</span>
            <span class="nav-text">${p.text}</span>
            ${badge}
          </div>`;
      });
    }
    list.innerHTML = html;

    list.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => this.go(item.dataset.page));
    });
  },

  go(pageId) {
    this.current = pageId;
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === pageId);
    });
    document.querySelectorAll('.page').forEach(el => {
      el.classList.toggle('active', el.id === 'page-' + pageId);
    });
    const page = this.pages.find(p => p.id === pageId);
    const mhTitle = document.getElementById('mobileHeaderTitle');
    if (mhTitle) mhTitle.textContent = page ? page.text : '';
    // 移动端关闭侧边栏
    if (window.innerWidth <= 768) {
      document.getElementById('sidebar').classList.remove('show');
      document.getElementById('sidebarOverlay').classList.remove('show');
    }
    // 滚动到顶部
    document.querySelector('.content').scrollTop = 0;
    // 渲染对应页面
    if (pageId === 'overview') PageRouter.renderOverview();
    else PageRouter.render(pageId);
  },

  updateBadge() {
    const tasks = Store.getTasks().filter(t => !t.completed);
    const el = document.getElementById('navTaskCount');
    if (el) el.textContent = tasks.length;
  }
};

// ============ 倒计时设置弹窗 ============
const CountdownModal = {
  open() {
    const cd = Store.getCountdown();
    document.getElementById('cdName').value = cd?.name || '';
    document.getElementById('cdDate').value = cd?.targetDate || '';
    document.getElementById('countdownModal').classList.add('show');
  },

  close() {
    document.getElementById('countdownModal').classList.remove('show');
  },

  submit() {
    const name = document.getElementById('cdName').value.trim();
    const date = document.getElementById('cdDate').value;
    if (!name || !date) { Utils.toast('请输入考试名称和日期'); return; }
    Store.setCountdown({ name, targetDate: date });
    Utils.toast('考试倒计时已设定');
    this.close();
    if (Nav.current === 'overview') PageRouter.renderOverview();
  },

  clear() {
    if (!confirm('确定要清除倒计时吗？')) return;
    Store.clearCountdown();
    Utils.toast('已清除倒计时');
    this.close();
    if (Nav.current === 'overview') PageRouter.renderOverview();
  }
};

// ============ 添加任务弹窗（跨页面通用）============
const TaskModal = {
  open(prefill = {}) {
    const modal = document.getElementById('taskModal');
    document.getElementById('taskName').value = prefill.name || '';
    document.getElementById('taskDuration').value = prefill.duration || '';
    document.getElementById('taskDeadline').value = prefill.deadline || '';
    document.getElementById('taskSubject').value = prefill.subject || '';
    document.getElementById('taskNotes').value = prefill.notes || '';
    document.getElementById('taskStatus').value = prefill.status || 'today';
    document.getElementById('taskEditId').value = prefill.id || '';
    modal.classList.add('show');
  },

  close() {
    document.getElementById('taskModal').classList.remove('show');
  },

  submit() {
    const id = document.getElementById('taskEditId').value;
    const task = {
      name: document.getElementById('taskName').value.trim(),
      duration: parseInt(document.getElementById('taskDuration').value) || 0,
      deadline: document.getElementById('taskDeadline').value,
      subject: document.getElementById('taskSubject').value,
      notes: document.getElementById('taskNotes').value.trim(),
      status: document.getElementById('taskStatus').value
    };

    if (!task.name) { Utils.toast('请输入任务名称'); return; }

    if (id) {
      Store.updateTask(id, task);
      Utils.toast('任务已更新');
    } else {
      Store.addTask(task);
      Utils.toast('任务已创建');
    }
    this.close();
    Nav.updateBadge();
    if (Nav.current === 'overview') PageRouter.renderOverview();
    else if (Nav.current === 'home') PageRouter.renderHome();
  }
};

// ============ 页面路由 ============
const PageRouter = {
  render(pageId) {
    switch(pageId) {
      case 'home':      this.renderHome(); break;
      case 'panduan':   this.renderPanduan(); break;
      case 'shuliang':  this.renderShuliang(); break;
      case 'ziliao':    this.renderZiliao(); break;
      case 'zhengzhi':  this.renderZhengzhi(); break;
      case 'shenlun':   this.renderShenlun(); break;
      case 'overview':  this.renderOverview(); break;
    }
  },

  // ===== 首页：全局总览 =====
  renderOverview() {
    const tasks = Store.getTasks();
    const today = tasks.filter(t => Utils.isToday(t.deadline) && !t.completed);
    const pending = tasks.filter(t => t.status === 'pending' && !t.completed && !Utils.isToday(t.deadline) && !Utils.isOverdue(t.deadline));
    const overdue = tasks.filter(t => (Utils.isOverdue(t.deadline) || t.status === 'overdue') && !t.completed);
    const completed = tasks.filter(t => t.completed);
    const todayCompleted = tasks.filter(t => t.completed && t.completedAt && Utils.isToday(new Date(t.completedAt).toISOString().slice(0,10))).length;

    // 倒计时数据
    const cd = Store.getCountdown();
    const todayStr = new Date();
    let countdownHtml = '';
    if (cd && cd.targetDate) {
      const diffDays = Math.ceil((new Date(cd.targetDate) - todayStr) / 86400000);
      const days = Math.max(0, diffDays);
      countdownHtml = `
        <div class="countdown-hero">
          <div class="countdown-label">距离考试</div>
          <div class="countdown-name">${cd.name || '考试目标'}</div>
          <div class="countdown-days">${days}<span class="countdown-unit">天</span></div>
          <div class="countdown-date">考试日期：${cd.targetDate}</div>
          <button class="btn btn-ghost btn-sm" onclick="CountdownModal.open()" style="margin-top:10px;">✏️ 设定/修改倒计时</button>
        </div>
      `;
    } else {
      countdownHtml = `
        <div class="countdown-hero empty">
          <div class="countdown-label">还没有设定考试倒计时</div>
          <div class="countdown-empty-tip">点击下方按钮设定你的考试目标，每天激励自己</div>
          <button class="btn btn-primary" onclick="CountdownModal.open()" style="margin-top:14px;">⏱ 设定考试倒计时</button>
        </div>
      `;
    }

    // 月学习时长统计
    const monthMinutes = this._calcMonthMinutes();
    const monthGoal = Store.get().monthGoal || 120; // 默认120小时/月
    const monthProgress = Math.min(100, Math.round(monthMinutes / (monthGoal * 60) * 100));

    // 今日背诵条目
    const reciteCount = Store.get().reciteToday || 0;
    const reciteGoal = Store.get().reciteGoal || 20;

    // 各科目本周进度
    const weekMinutesBySubject = this._calcWeekMinutesBySubject();

    const html = `
      <div class="page-header">
        <div class="page-title">全局总览</div>
        <div class="page-subtitle">一目了然 · 今日备考一站掌握</div>
      </div>

      ${countdownHtml}

      <!-- 数据卡片网格 -->
      <div class="overview-grid">
        <!-- 今日待办 -->
        <div class="overview-card">
          <div class="overview-card-label">今日待办</div>
          <div class="overview-card-value">${today.length}<span class="overview-card-suffix">项</span></div>
          <div class="overview-card-progress">已完成 <strong>${todayCompleted}</strong> · 逾期 ${overdue.length}</div>
          <div class="overview-card-bar"><div class="overview-card-fill" style="width:${today.length ? Math.round(todayCompleted/(today.length+todayCompleted)*100) : 0}%"></div></div>
        </div>

        <!-- 月学习进度 -->
        <div class="overview-card">
          <div class="overview-card-label">月目标 ${Math.round(monthMinutes/60)}h/${monthGoal}h</div>
          <div class="overview-card-value">${monthProgress}<span class="overview-card-suffix">%</span></div>
          <div class="overview-card-progress">已学习 <strong>${Utils.formatDuration(monthMinutes)}</strong></div>
          <div class="overview-card-bar"><div class="overview-card-fill" style="width:${monthProgress}%"></div></div>
        </div>

        <!-- 今日背诵条目 -->
        <div class="overview-card">
          <div class="overview-card-label">今日背诵条目</div>
          <div class="overview-card-value">${reciteCount}<span class="overview-card-suffix">/${reciteGoal}目</span></div>
          <div class="overview-card-progress">
            <button class="btn btn-ghost btn-sm" onclick="PageRouter.addRecite()">+ 添加</button>
          </div>
          <div class="overview-card-bar"><div class="overview-card-fill" style="width:${Math.min(100, Math.round(reciteCount/reciteGoal*100))}%"></div></div>
        </div>

        <!-- 待完成任务 -->
        <div class="overview-card">
          <div class="overview-card-label">待完成任务</div>
          <div class="overview-card-value">${pending.length + overdue.length}<span class="overview-card-suffix">项</span></div>
          <div class="overview-card-progress">逾期 <strong style="color:var(--pink-500);">${overdue.length}</strong></div>
          <div class="overview-card-bar"><div class="overview-card-fill" style="width:${Math.min(100, (pending.length+overdue.length)*10)}%;background:var(--yellow);"></div></div>
        </div>
      </div>

      <!-- 各科目周学习进度 -->
      <div class="card" style="margin-top:18px;">
        <div class="card-title">📊 各科目本周学习进度</div>
        ${Object.keys(weekMinutesBySubject).length === 0 
          ? '<div style="font-size:13px;color:var(--text-3);text-align:center;padding:16px;">本周还没有学习记录，开始做题或添加任务来记录</div>'
          : Object.entries(weekMinutesBySubject).map(([subj, mins]) => {
            const goal = (Store.get().subjectGoals || {})[subj] || 10; // 默认10小时/周
            const pct = Math.min(100, Math.round(mins / (goal*60) * 100));
            return `
              <div class="subject-row">
                <div class="subject-row-name"><span class="tag tag-${Utils.subjectColor(subj)}">${subj}</span></div>
                <div class="subject-row-bar"><div class="subject-row-fill" style="width:${pct}%;"></div></div>
                <div class="subject-row-stat">${Utils.formatDuration(mins)} · ${pct}%</div>
              </div>
            `;
          }).join('')
        }
      </div>

      <!-- 任务管理入口 -->
      <div class="card" style="margin-top:18px;">
        <div class="card-title">📝 任务管理</div>
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
          <div style="font-size:13px;color:var(--text-3);">当前任务总数：<strong style="color:var(--pink-500);">${tasks.length}</strong>（未完成 ${tasks.filter(t=>!t.completed).length} · 已完成 ${completed.length}）</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn btn-outline btn-sm" onclick="PageRouter.openTaskList()">📋 查看任务列表</button>
            <button class="btn btn-primary btn-sm" onclick="TaskModal.open()">+ 新建任务</button>
          </div>
        </div>
      </div>

      <!-- 倒计时设定按钮（底部） -->
      <div style="text-align:center;margin-top:20px;">
        <button class="btn btn-outline" onclick="CountdownModal.open()">⏱ ${cd ? '修改' : '设定'}考试倒计时</button>
      </div>
    `;

    document.getElementById('page-overview').innerHTML = html;
  },

  _calcMonthMinutes() {
    const data = Store.get();
    const studyTime = (data.stats && data.stats.studyTime) || {};
    let total = 0;
    const now = new Date();
    Object.entries(studyTime).forEach(([date, subjects]) => {
      const d = new Date(date + 'T00:00:00');
      if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
        Object.values(subjects).forEach(m => total += m);
      }
    });
    Store.getTasks().forEach(t => {
      if (t.completed && t.completedAt) {
        const d = new Date(t.completedAt);
        if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
          total += t.duration || 0;
        }
      }
    });
    return total;
  },

  _calcWeekMinutesBySubject() {
    const data = Store.get();
    const studyTime = (data.stats && data.stats.studyTime) || {};
    const result = {};
    Object.entries(studyTime).forEach(([date, subjects]) => {
      if (Utils.isThisWeek(date + 'T00:00:00')) {
        Object.entries(subjects).forEach(([s, m]) => {
          result[s] = (result[s] || 0) + m;
        });
      }
    });
    return result;
  },

  openTaskList() {
    // 显示任务列表弹窗
    document.getElementById('taskListModal').classList.add('show');
    this._renderTaskListModal('today');
    // 绑定tab切换
    document.querySelectorAll('#taskListTabs .tab').forEach(t => {
      t.onclick = () => {
        document.querySelectorAll('#taskListTabs .tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        this._renderTaskListModal(t.dataset.filter);
      };
    });
  },

  addRecite() {
    const val = prompt('今天背诵了多少条目？', '0');
    if (val === null) return;
    const num = parseInt(val);
    if (isNaN(num) || num < 0) { Utils.toast('请输入有效数字'); return; }
    const data = Store.get();
    data.reciteToday = (data.reciteToday || 0) + num;
    this.save(data);
    Utils.toast(`已记录 +${num} 条`);
    this.renderOverview();
  },

  _renderTaskListModal(filter) {
    const tasks = Store.getTasks();
    let list;
    switch(filter) {
      case 'today':    list = tasks.filter(t => Utils.isToday(t.deadline) && !t.completed); break;
      case 'pending':  list = tasks.filter(t => t.status === 'pending' && !t.completed && !Utils.isToday(t.deadline) && !Utils.isOverdue(t.deadline)); break;
      case 'overdue':  list = tasks.filter(t => (Utils.isOverdue(t.deadline) || t.status === 'overdue') && !t.completed); break;
      case 'completed': list = tasks.filter(t => t.completed); break;
    }
    list.sort((a,b) => (b.pinned?1:0) - (a.pinned?1:0));

    const container = document.getElementById('taskListModalContent');
    if (list.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="empty-icon">📝</div>暂无任务<br><span style="font-size:13px;">点击右上角新建任务</span></div>`;
      return;
    }

    container.innerHTML = list.map(t => `
      <div class="task-item ${t.pinned?'pinned':''} ${t.completed?'completed':''}">
        <div class="task-checkbox ${t.completed?'checked':''}" onclick="Store.toggleTask('${t.id}');Nav.updateBadge();PageRouter._renderTaskListModal('${filter}');PageRouter.renderOverview();"></div>
        <div class="task-body">
          <div class="task-name">${t.name}</div>
          <div class="task-meta">
            ${t.subject ? `<span class="tag tag-${Utils.subjectColor(t.subject)}">${t.subject}</span>` : ''}
            ${t.duration ? `<span>⏱ ${Utils.formatDuration(t.duration)}</span>` : ''}
            ${t.deadline ? `<span>📅 ${t.deadline}</span>` : ''}
            ${t.notes ? `<span>📝 ${t.notes}</span>` : ''}
          </div>
        </div>
        <div class="task-actions">
          <span class="pin-icon ${t.pinned?'pinned':''}" onclick="Store.togglePin('${t.id}');PageRouter._renderTaskListModal('${filter}');" title="置顶">📌</span>
          <button class="btn btn-ghost btn-sm" onclick='TaskModal.open(${JSON.stringify(t).replace(/'/g,"&#39;")});PageRouter.closeTaskListModal();'>编辑</button>
          <button class="btn btn-ghost btn-sm" onclick="Store.deleteTask('${t.id}');Nav.updateBadge();PageRouter._renderTaskListModal('${filter}');PageRouter.renderOverview();">删除</button>
        </div>
      </div>
    `).join('');
  },

  closeTaskListModal() {
    document.getElementById('taskListModal').classList.remove('show');
  },

  // ===== 言语理解 =====
  renderHome() {
    document.getElementById('page-home').innerHTML = `
      <div class="page-header">
        <div class="page-title">言语理解</div>
        <div class="page-subtitle">行测专项 · 逻辑填空、片段阅读、语句表达</div>
      </div>
      <div class="subcat-grid">
        <div class="subcat-card" onclick="PageRouter.startQuiz('yanyu')">
          <h3>📝 专项练习</h3>
          <p>精选言语理解高频真题，逐题练习即时解析</p>
          <div class="tag-row"><span class="tag tag-pink">逻辑填空</span><span class="tag tag-pink">片段阅读</span></div>
        </div>
        <div class="subcat-card" onclick="PageRouter.showKnowledge('yanyu')">
          <h3>⚡ 知识点速记</h3>
          <p>言语理解核心方法论与常见考点速记</p>
          <div class="tag-row"><span class="tag tag-blue">方法论</span></div>
        </div>
        <div class="subcat-card" onclick="PageRouter.showWrongQuestions()">
          <h3>❌ 错题收纳</h3>
          <p>收藏做错的题目，反复回顾避免再错</p>
          <div class="tag-row"><span class="tag tag-yellow">复习</span></div>
        </div>
        <div class="subcat-card" onclick="PageRouter.startTimedQuiz('yanyu')">
          <h3>⏱ 计时刷题</h3>
          <p>限时练习，提升做题速度与准确率</p>
          <div class="tag-row"><span class="tag tag-green">计时</span></div>
        </div>
      </div>
      <div id="yanyuContent"></div>
      <div style="margin-top:20px;">
        <button class="btn btn-outline" onclick="quickAddTask('言语理解','言语理解专项练习')">+ 添加言语理解学习任务</button>
      </div>
    `;
  },

  // ===== 判断推理 =====
  renderPanduan() {
    const subs = [
      { id:'tuxing',  icon:'🔲', name:'图形推理', desc:'位置、样式、数量、空间规律', tags:['位置规律','样式规律'] },
      { id:'luoji',   icon:'🔗', name:'逻辑判断', desc:'翻译推理、真假推理、加强削弱', tags:['翻译推理','加强削弱'] },
      { id:'dingyi',  icon:'📋', name:'定义判断', desc:'核心要素提取与比对', tags:['要素法','多定义'] },
      { id:'leibei',  icon:'🔄', name:'类比推理', desc:'语义、逻辑、语法关系判断', tags:['语义关系','逻辑关系'] }
    ];
    document.getElementById('page-panduan').innerHTML = `
      <div class="page-header">
        <div class="page-title">判断推理</div>
        <div class="page-subtitle">行测四大专项 · 图形推理 · 逻辑判断 · 定义判断 · 类比推理</div>
      </div>
      <div class="subcat-grid">
        ${subs.map(s => `
          <div class="subcat-card" onclick="PageRouter.startQuiz('${s.id}')">
            <h3>${s.icon} ${s.name}</h3>
            <p>${s.desc}</p>
            <div class="tag-row">${s.tags.map(t=>`<span class="tag tag-pink">${t}</span>`).join('')}</div>
          </div>
        `).join('')}
      </div>
      <div class="card" style="margin-top:20px;">
        <div class="card-title">📚 核心考点总结</div>
        <button class="btn btn-outline btn-sm" onclick="PageRouter.showKnowledge('tuxing')">图形推理考点</button>
        <button class="btn btn-outline btn-sm" style="margin-left:8px;" onclick="PageRouter.showKnowledge('luoji')">逻辑判断考点</button>
        <button class="btn btn-outline btn-sm" style="margin-left:8px;" onclick="PageRouter.showKnowledge('dingyi')">定义判断考点</button>
        <button class="btn btn-outline btn-sm" style="margin-left:8px;" onclick="PageRouter.showKnowledge('leibei')">类比推理考点</button>
      </div>
      <div style="margin-top:20px;">
        <button class="btn btn-outline" onclick="quickAddTask('判断推理','判断推理专项练习')">+ 添加判断推理学习任务</button>
      </div>
      <div id="panduanContent"></div>
    `;
  },

  // ===== 数量关系 =====
  renderShuliang() {
    document.getElementById('page-shuliang').innerHTML = `
      <div class="page-header">
        <div class="page-title">数量关系</div>
        <div class="page-subtitle">数学运算 · 公式速记 · 分题型限时练习</div>
      </div>
      <div class="subcat-grid">
        <div class="subcat-card" onclick="PageRouter.startQuiz('shuliang')">
          <h3>🔢 数学运算题库</h3>
          <p>行程、工程、利润、排列组合、容斥等常考题型</p>
          <div class="tag-row"><span class="tag tag-yellow">高频题</span></div>
        </div>
        <div class="subcat-card" onclick="PageRouter.showKnowledge('shuliang')">
          <h3>📐 公式速记</h3>
          <p>公考常用数学公式与解题技巧汇总</p>
          <div class="tag-row"><span class="tag tag-blue">公式</span></div>
        </div>
        <div class="subcat-card" onclick="PageRouter.startTimedQuiz('shuliang')">
          <h3>⏱ 限时练习</h3>
          <p>分题型计时训练，提升解题速度</p>
          <div class="tag-row"><span class="tag tag-green">计时</span></div>
        </div>
      </div>
      <div style="margin-top:20px;">
        <button class="btn btn-outline" onclick="quickAddTask('数量关系','数量关系专项练习')">+ 添加数量关系学习任务</button>
      </div>
      <div id="shuliangContent"></div>
    `;
  },

  // ===== 资料分析 =====
  renderZiliao() {
    document.getElementById('page-ziliao').innerHTML = `
      <div class="page-header">
        <div class="page-title">资料分析</div>
        <div class="page-subtitle">速算公式 · 答题技巧 · 真题习题 · 高频易错点</div>
      </div>
      <div class="subcat-grid">
        <div class="subcat-card" onclick="PageRouter.showKnowledge('ziliao')">
          <h3>⚡ 速算公式</h3>
          <p>增长率、增长量、比重、平均数等核心公式</p>
          <div class="tag-row"><span class="tag tag-pink">速算</span></div>
        </div>
        <div class="subcat-card" onclick="PageRouter.startQuiz('ziliao')">
          <h3>📊 真题习题</h3>
          <p>资料分析真题练习，即时解析</p>
          <div class="tag-row"><span class="tag tag-blue">真题</span></div>
        </div>
        <div class="subcat-card" onclick="PageRouter.showKnowledge('ziliao')">
          <h3>⚠️ 高频易错点</h3>
          <p>时间范围、单位、基期现期等常见陷阱</p>
          <div class="tag-row"><span class="tag tag-yellow">易错</span></div>
        </div>
      </div>
      <div style="margin-top:20px;">
        <button class="btn btn-outline" onclick="quickAddTask('资料分析','资料分析专项练习')">+ 添加资料分析学习任务</button>
      </div>
      <div id="ziliaoContent"></div>
    `;
  },

  // ===== 政治 & 常识 =====
  renderZhengzhi() {
    document.getElementById('page-zhengzhi').innerHTML = `
      <div class="page-header">
        <div class="page-title">政治 & 常识</div>
        <div class="page-subtitle">背诵专区 · 时政热点 · 法律人文 · 科技地理</div>
      </div>
      <div class="subcat-grid">
        <div class="subcat-card" onclick="PageRouter.showKnowledge('shizheng')">
          <h3>📰 时政热点</h3>
          <p>最新时政要闻与政策动态</p>
          <div class="tag-row"><span class="tag tag-pink">背诵</span></div>
        </div>
        <div class="subcat-card" onclick="PageRouter.showKnowledge('falv')">
          <h3>⚖️ 法律常识</h3>
          <p>宪法、民法、刑法、行政法</p>
          <div class="tag-row"><span class="tag tag-blue">法律</span></div>
        </div>
        <div class="subcat-card" onclick="PageRouter.showKnowledge('renwen')">
          <h3>📚 人文常识</h3>
          <p>历史文化、诸子百家、文学常识</p>
          <div class="tag-row"><span class="tag tag-yellow">人文</span></div>
        </div>
        <div class="subcat-card" onclick="PageRouter.showKnowledge('keji')">
          <h3>🔬 科技常识</h3>
          <p>科技史、前沿技术、航天成就</p>
          <div class="tag-row"><span class="tag tag-green">科技</span></div>
        </div>
        <div class="subcat-card" onclick="PageRouter.showKnowledge('dili')">
          <h3>🗺️ 地理常识</h3>
          <p>中国地理、世界地理、自然地理</p>
          <div class="tag-row"><span class="tag tag-pink">地理</span></div>
        </div>
        <div class="subcat-card" onclick="PageRouter.startQuiz('shizheng')">
          <h3>✏️ 随堂练习</h3>
          <p>知识学完即练，及时巩固</p>
          <div class="tag-row"><span class="tag tag-blue">练习</span></div>
        </div>
      </div>
      <div id="zhengzhiContent"></div>
      <div class="card" style="margin-top:20px;">
        <div class="card-title">📝 快速创建背诵待办</div>
        <p style="font-size:13px;color:var(--text-3);margin-bottom:12px;">将政治理论背诵内容添加到公考待办清单，规划复习计划</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm" onclick="quickAddTask('政治理论','背诵时政热点')">+ 背诵时政热点</button>
          <button class="btn btn-outline btn-sm" onclick="quickAddTask('政治理论','背诵重要讲话')">+ 背诵重要讲话</button>
          <button class="btn btn-outline btn-sm" onclick="quickAddTask('政治理论','复习党史知识')">+ 复习党史知识</button>
          <button class="btn btn-outline btn-sm" onclick="quickAddTask('政治理论','背诵政策理论')">+ 背诵政策理论</button>
          <button class="btn btn-outline btn-sm" onclick="quickAddTask('常识','复习法律常识')">+ 复习法律常识</button>
        </div>
      </div>
    `;
  },

  // ===== 申论 =====
  renderShenlun() {
    document.getElementById('page-shenlun').innerHTML = `
      <div class="page-header">
        <div class="page-title">申论</div>
        <div class="page-subtitle">写作素材 · 范文参考 · 答题模板 · 素材收藏夹</div>
      </div>
      <div class="tabs" id="shenlunTabs">
        <div class="tab active" data-tab="materials">写作素材</div>
        <div class="tab" data-tab="essays">范文参考</div>
        <div class="tab" data-tab="templates">答题模板</div>
        <div class="tab" data-tab="favorites">收藏夹</div>
        <div class="tab" data-tab="tasks">写作任务</div>
      </div>
      <div id="shenlunContent"></div>
      <div style="margin-top:20px;">
        <button class="btn btn-outline" onclick="quickAddTask('申论','申论写作练习')">+ 记录写作练习任务</button>
      </div>
    `;
    this._renderShenlunTab('materials');
    document.querySelectorAll('#shenlunTabs .tab').forEach(t => {
      t.addEventListener('click', () => {
        document.querySelectorAll('#shenlunTabs .tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        this._renderShenlunTab(t.dataset.tab);
      });
    });
  },

  _renderShenlunTab(tab) {
    const c = document.getElementById('shenlunContent');
    if (tab === 'materials') {
      c.innerHTML = ShenlunMaterials.materials.map((m,i) => `
        <div class="material-card">
          <h4>${m.title}</h4>
          <p>${m.content}</p>
          <div class="material-actions">
            <button class="btn btn-ghost btn-sm" onclick="PageRouter.favMaterial(${i})">⭐ 收藏</button>
            <button class="btn btn-ghost btn-sm" onclick="Utils.toast('已复制到剪贴板');navigator.clipboard&&navigator.clipboard.writeText('${m.content.replace(/'/g,'')}')">📋 复制</button>
          </div>
        </div>
      `).join('');
    } else if (tab === 'essays') {
      c.innerHTML = ShenlunMaterials.essays.map(e => `
        <div class="material-card">
          <h4>${e.title}</h4>
          <p>${e.excerpt}</p>
        </div>
      `).join('');
    } else if (tab === 'templates') {
      c.innerHTML = ShenlunMaterials.templates.map(t => `
        <div class="knowledge-card">
          <h4>${t.title}</h4>
          <p>${t.content}</p>
        </div>
      `).join('');
    } else if (tab === 'favorites') {
      const favs = Store.getFavorites();
      if (favs.length === 0) {
        c.innerHTML = `<div class="empty-state"><div class="empty-icon">⭐</div>暂无收藏<br><span style="font-size:13px;">在写作素材中点击收藏</span></div>`;
      } else {
        c.innerHTML = favs.map(f => `
          <div class="material-card">
            <h4>${f.title}</h4>
            <p>${f.content}</p>
            <div class="material-actions">
              <button class="btn btn-ghost btn-sm" onclick="Store.removeFavorite('${f.id}');PageRouter._renderShenlunTab('favorites')">删除</button>
            </div>
          </div>
        `).join('');
      }
    } else if (tab === 'tasks') {
      const tasks = Store.getTasks().filter(t => t.subject === '申论');
      if (tasks.length === 0) {
        c.innerHTML = `<div class="empty-state"><div class="empty-icon">✍️</div>暂无写作任务<br><span style="font-size:13px;">点击下方按钮创建</span></div>`;
      } else {
        c.innerHTML = tasks.map(t => `
          <div class="task-item ${t.completed?'completed':''}">
            <div class="task-checkbox ${t.completed?'checked':''}" onclick="Store.toggleTask('${t.id}');PageRouter._renderShenlunTab('tasks');Nav.updateBadge();"></div>
            <div class="task-body">
              <div class="task-name">${t.name}</div>
              <div class="task-meta">${t.deadline?`<span>📅 ${t.deadline}</span>`:''} ${t.notes?`<span>📝 ${t.notes}</span>`:''}</div>
            </div>
          </div>
        `).join('');
      }
    }
  },

  favMaterial(index) {
    Store.addFavorite({...ShenlunMaterials.materials[index]});
    Utils.toast('已收藏到素材夹');
  },

  // ===== 练习题 =====
  quizState: { current: 0, answers: [], subject: null, timed: false, startTime: 0 },

  startQuiz(subject, timed = false) {
    const bank = QuizBank[subject];
    if (!bank) { Utils.toast('题库建设中...'); return; }
    this.quizState = { current: 0, answers: [], subject, timed, startTime: Date.now() };
    this._renderQuiz();
  },

  startTimedQuiz(subject) {
    this.startQuiz(subject, true);
  },

  _renderQuiz() {
    const { current, subject, timed } = this.quizState;
    const bank = QuizBank[subject];
    const q = bank[current];
    const pageMap = {
      yanyu:'home', tuxing:'panduan', luoji:'panduan', dingyi:'panduan', leibei:'panduan',
      shuliang:'shuliang', ziliao:'ziliao',
      falv:'zhengzhi', renwen:'zhengzhi', keji:'zhengzhi', dili:'zhengzhi', shizheng:'zhengzhi'
    };
    const pageKey = pageMap[subject] || 'home';
    const pageEl = document.getElementById('page-' + pageKey);
    let target = pageEl.querySelector('[id$="Content"]');
    if (!target) {
      // 创建一个 content 容器
      target = document.createElement('div');
      pageEl.appendChild(target);
    }

    const elapsed = timed ? Math.floor((Date.now() - this.quizState.startTime) / 1000) : 0;

    target.innerHTML = `
      <div class="card" style="margin-top:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-size:13px;color:var(--text-3);">第 ${current+1} / ${bank.length} 题 ${timed?`· <span style="color:var(--pink-500);">⏱ ${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,'0')}</span>`:''}</span>
          <button class="btn btn-ghost btn-sm" onclick="PageRouter.exitQuiz()">退出</button>
        </div>
        <div class="progress-bar" style="margin-bottom:16px;"><div class="progress-fill" style="width:${(current/bank.length)*100}%"></div></div>
        <div class="quiz-card" style="border:none;padding:0;margin:0;">
          <div class="quiz-question">${q.q}</div>
          <div class="quiz-options">
            ${q.options.map((o,i) => `<div class="quiz-option" data-idx="${i}" onclick="PageRouter.answerQuiz(${i})">
              <div class="quiz-option-letter">${String.fromCharCode(65+i)}</div>
              <span style="font-size:14px;line-height:1.6;padding-top:3px;">${o}</span>
            </div>`).join('')}
          </div>
          <div id="quizAnalysis" style="display:none;margin-top:16px;padding:14px;background:var(--pink-50);border-radius:var(--radius-s);">
            <div style="font-size:13px;font-weight:600;color:var(--pink-500);margin-bottom:6px;">💡 解析</div>
            <div style="font-size:13px;color:var(--text-2);line-height:1.7;">${q.analysis}</div>
            <div style="margin-top:12px;">
              ${current < bank.length-1
                ? `<button class="btn btn-primary btn-sm" onclick="PageRouter.nextQuiz()">下一题 →</button>`
                : `<button class="btn btn-primary btn-sm" onclick="PageRouter.finishQuiz()">完成练习</button>`
              }
              <button class="btn btn-ghost btn-sm" onclick="PageRouter.addWrongQuestion(${current})">加入错题本</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  answerQuiz(idx) {
    const { current, subject } = this.quizState;
    const bank = QuizBank[subject];
    const q = bank[current];
    const options = document.querySelectorAll('.quiz-option');
    options.forEach(o => o.style.pointerEvents = 'none');
    
    const selected = options[idx];
    if (idx === q.answer) {
      selected.classList.add('correct');
      Utils.toast('回答正确！');
    } else {
      selected.classList.add('wrong');
      options[q.answer].classList.add('correct');
      Utils.toast('回答错误');
    }
    
    document.getElementById('quizAnalysis').style.display = 'block';
  },

  nextQuiz() {
    this.quizState.current++;
    this._renderQuiz();
  },

  finishQuiz() {
    const { subject, timed, startTime } = this.quizState;
    const bank = QuizBank[subject];
    if (timed) {
      const minutes = Math.ceil((Date.now() - startTime) / 60000);
      Store.recordStudy(subject, minutes);
    }
    Utils.toast(`完成${bank.length}题练习！`);
    Nav.go(this._subjectToPage(subject));
  },

  exitQuiz() {
    Nav.go(Nav.current);
  },

  addWrongQuestion(qIdx) {
    const { subject } = this.quizState;
    const q = QuizBank[subject][qIdx];
    Store.addWrongQuestion({ subject, question: q.q, answer: q.options[q.answer], analysis: q.analysis });
    Utils.toast('已加入错题本');
  },

  showWrongQuestions() {
    const wqs = Store.getWrongQuestions();
    // 写入到当前页面（任何行测子页面共用）
    const pageEl = document.getElementById('page-' + Nav.current);
    if (!pageEl) return;
    let target = pageEl.querySelector('[id$="Content"]');
    if (!target) {
      target = document.createElement('div');
      pageEl.appendChild(target);
    }
    if (wqs.length === 0) {
      target.innerHTML = `<div class="card" style="margin-top:20px;"><div class="empty-state"><div class="empty-icon">❌</div>错题本为空<br><span style="font-size:13px;">做题时点击"加入错题本"收藏错题</span></div></div>`;
      return;
    }
    target.innerHTML = `<div class="card" style="margin-top:20px;"><div class="card-title">❌ 错题收纳 (${wqs.length})</div>${wqs.map(w => `
      <div class="quiz-card" style="margin-bottom:12px;">
        <div style="font-size:12px;color:var(--text-3);margin-bottom:6px;">${w.subject}</div>
        <div class="quiz-question">${w.question}</div>
        <div style="font-size:13px;color:var(--green);margin:8px 0;">✓ 正确答案：${w.answer}</div>
        <div style="font-size:13px;color:var(--text-2);">${w.analysis}</div>
      </div>
    `).join('')}</div>`;
  },

  showKnowledge(key) {
    const kb = KnowledgeBase[key];
    if (!kb) { Utils.toast('知识点建设中...'); return; }

    // 政治&常识可能不同，写入到当前页面
    const pageEl = document.getElementById('page-' + Nav.current);
    if (!pageEl) return;
    let target = pageEl.querySelector('[id$="Content"]');
    if (!target) {
      target = document.createElement('div');
      pageEl.appendChild(target);
    }
    target.innerHTML = `<div class="card" style="margin-top:20px;"><div class="card-title">📚 知识点速记</div>${kb.map(k => `
      <div class="knowledge-card">
        <h4>${k.title}</h4>
        <p>${k.content}</p>
      </div>
    `).join('')}</div>`;
  },

  _subjectToPage(subject) {
    const map = {
      yanyu:'home', tuxing:'panduan', luoji:'panduan', dingyi:'panduan', leibei:'panduan',
      shuliang:'shuliang', ziliao:'ziliao',
      falv:'zhengzhi', renwen:'zhengzhi', keji:'zhengzhi', dili:'zhengzhi', shizheng:'zhengzhi'
    };
    return map[subject] || 'overview';
  }
};

// 快速添加任务（跨页面通用）
function quickAddTask(subject, defaultName) {
  const today = new Date();
  const tomorrow = new Date(Date.now() + 86400000);
  const fmtDT = (d) => {
    const y = d.getFullYear(), mo = String(d.getMonth()+1).padStart(2,'0'), da = String(d.getDate()).padStart(2,'0');
    return `${y}-${mo}-${da} 20:00`;
  };
  TaskModal.open({
    name: defaultName,
    subject: subject,
    deadline: fmtDT(tomorrow),
    duration: 60,
    status: 'today'
  });
}

// ============ 初始化 ============
function initApp() {
  Store.init();
  Nav.render();
  Nav.updateBadge();
  Nav.go('overview');

  // 侧边栏折叠（电脑端）
  const toggle = document.getElementById('sidebarToggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      if (window.innerWidth > 768) {
        document.getElementById('sidebar').classList.toggle('collapsed');
      }
    });
  }

  // 移动端菜单
  const menuBtn = document.getElementById('mobileMenuBtn');
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('show');
      document.getElementById('sidebarOverlay').classList.toggle('show');
    });
  }
  const overlay = document.getElementById('sidebarOverlay');
  if (overlay) overlay.addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('show');
    overlay.classList.remove('show');
  });

  // 任务弹窗
  const taskSubmit = document.getElementById('taskSubmit');
  if (taskSubmit) taskSubmit.addEventListener('click', () => TaskModal.submit());
  
  document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target === el || e.target.classList.contains('modal-close')) {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('show'));
      }
    });
  });

  // PWA Service Worker 注册
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  // iOS standalone 全屏
  if (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) {
    document.body.classList.add('pwa-standalone');
  }

  // 定时同步
  setInterval(() => Store.sync(), 30000);
}

document.addEventListener('DOMContentLoaded', initApp);
